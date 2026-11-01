import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentStrategy } from './strategies/payment-strategy.interface.js';
import { WalletPaymentStrategy } from './strategies/wallet-payment.strategy.js';
import { CardPaymentStrategy } from './strategies/card-payment.strategy.js';
import { VnpayPaymentStrategy } from './strategies/vnpay-payment.strategy.js';
import { ProductsService } from '../products/products.service.js';
import { calculateSugarAndIceConsumption } from '../products/sugar-ice.calculator.js';

@Injectable()
export class PaymentsService {
  private readonly strategies: Record<PaymentMethod, PaymentStrategy>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletStrategy: WalletPaymentStrategy,
    private readonly cardStrategy: CardPaymentStrategy,
    private readonly vnpayStrategy: VnpayPaymentStrategy,
  ) {
    this.strategies = {
      [PaymentMethod.WALLET]: this.walletStrategy,
      [PaymentMethod.CARD]: this.cardStrategy,
      [PaymentMethod.VNPAY]: this.vnpayStrategy,
    };
  }


  private async deductToppingStock(orderId: number) {
    try {
      // Dùng this.prisma trực tiếp (KHÔNG dùng tx) để tránh lỗi 25P02 khi transaction bị abort
      const orderWithItems = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!orderWithItems || !orderWithItems.items) return;

      const toppingCounts = new Map<string, number>();
      for (const item of orderWithItems.items) {
        const itemQty = Number(item.qty || 1);
        if (Array.isArray(item.toppings)) {
          for (const t of item.toppings as any[]) {
            const toppingName = typeof t === 'string' ? t : t?.name;
            if (toppingName && typeof toppingName === 'string') {
              toppingCounts.set(toppingName, (toppingCounts.get(toppingName) || 0) + itemQty);
            }
          }
        }
      }

      for (const [toppingName, count] of toppingCounts.entries()) {
        // Luôn trừ in-memory trước (không phụ thuộc DB)
        ProductsService.deductInMemoryToppingStock(toppingName, count);

        // Trừ DB với try/catch riêng — lỗi DB không được làm hỏng luồng thanh toán
        try {
          const existingTopping = await this.prisma.topping.findFirst({
            where: { name: { equals: toppingName, mode: 'insensitive' } },
          });
          if (existingTopping) {
            const newStock = Math.max(0, existingTopping.stock - count);
            await this.prisma.topping.update({
              where: { id: existingTopping.id },
              data: {
                stock: newStock,
                isAvailable: newStock > 0,
              },
            });
          }
        } catch (dbErr) {
          console.warn(`Không thể trừ tồn kho DB cho topping "${toppingName}":`, dbErr);
          // Tiếp tục — in-memory đã được trừ, lỗi DB không làm gián đoạn
        }
      }
    } catch (err) {
      console.warn('Không thể trừ tồn kho topping:', err);
    }
  }

  /**
   * Khấu trừ lượng đường và lượng đá dựa trên công thức chuẩn và khẩu vị của khách:
   * sugarused = sugarstandarsize * sugarlevel
   * iceused = icestandersize * icelevel
   */
  private async deductSugarAndIceStock(orderId: number) {
    try {
      const orderWithItems = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!orderWithItems || !orderWithItems.items || orderWithItems.items.length === 0) return;

      const consumption = calculateSugarAndIceConsumption(
        orderWithItems.items.map((item: any) => ({
          size: item.size,
          sweetness: item.sweetness,
          ice: item.ice,
          qty: item.qty,
        })),
      );

      // 1. Luôn trừ in-memory trước (fallback)
      if (consumption.totalSugarGrams > 0) {
        ProductsService.deductInMemoryIngredientStock('SUGAR', consumption.totalSugarGrams);
      }
      if (consumption.totalIceGrams > 0) {
        ProductsService.deductInMemoryIngredientStock('ICE', consumption.totalIceGrams);
      }

      // 2. Cập nhật cơ sở dữ liệu nếu bảng ingredient tồn tại (bảo đảm stock >= 0 không bị âm)
      try {
        if ((this.prisma as any)?.ingredient) {
          if (consumption.totalSugarGrams > 0) {
            const currentSugar = await (this.prisma as any).ingredient.findUnique({
              where: { code: 'SUGAR' },
            });
            if (currentSugar) {
              const newSugarStock = Math.max(0, Math.round((currentSugar.stock - consumption.totalSugarGrams) * 10) / 10);
              await (this.prisma as any).ingredient.update({
                where: { code: 'SUGAR' },
                data: { stock: newSugarStock },
              });
            }
          }
          if (consumption.totalIceGrams > 0) {
            const currentIce = await (this.prisma as any).ingredient.findUnique({
              where: { code: 'ICE' },
            });
            if (currentIce) {
              const newIceStock = Math.max(0, Math.round((currentIce.stock - consumption.totalIceGrams) * 10) / 10);
              await (this.prisma as any).ingredient.update({
                where: { code: 'ICE' },
                data: { stock: newIceStock },
              });
            }
          }
        }
      } catch (dbErr) {
        console.warn('Không thể trừ tồn kho Đường/Đá trong DB (in-memory đã trừ):', dbErr);
      }
    } catch (err) {
      console.warn('Lỗi khi tính toán và trừ tồn kho Đường/Đá:', err);
    }
  }

  async processPayment(dto: CreatePaymentDto) {
    if (!dto.idempotencyKey || typeof dto.idempotencyKey !== 'string' || !dto.idempotencyKey.trim()) {
      throw new BadRequestException('Idempotency key không được để trống hoặc chỉ chứa khoảng trắng');
    }

    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      include: { order: true },
    });

    if (existingPayment) {
      if (existingPayment.orderId !== dto.orderId || existingPayment.method !== dto.method) {
        throw new ConflictException(
          `Idempotency key "${dto.idempotencyKey}" đã được sử dụng cho một đơn hàng hoặc phương thức khác`,
        );
      }
      return {
        success: existingPayment.status === PaymentStatus.SUCCESS,
        isIdempotent: true,
        orderId: existingPayment.orderId,
        orderStatus: existingPayment.order.status,
        payment: existingPayment,
      };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${dto.orderId}`);
    }

    const validStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED];
    if (!validStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Không thể thanh toán cho đơn hàng đang ở trạng thái "${order.status}"`,
      );
    }

    const strategy = this.strategies[dto.method];
    if (!strategy) {
      throw new BadRequestException(`Phương thức thanh toán không hợp lệ: ${dto.method}`);
    }

    const context = {
      orderId: order.id,
      orderCode: `ORD-${order.id}`,
      ipAddr: dto.ipAddr,
      useSandbox: dto.useSandbox,
    };
    const gatewayResult = await strategy.charge(order.total, dto.mockSuccess ?? true, context);

    if (gatewayResult.paymentUrl) {
      const payment = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          idempotencyKey: dto.idempotencyKey,
          amount: order.total,
          method: dto.method,
          status: PaymentStatus.PENDING,
          transactionRef: gatewayResult.transactionRef ?? null,
        },
      });

      return {
        success: true,
        isIdempotent: false,
        orderId: order.id,
        orderStatus: order.status,
        paymentUrl: gatewayResult.paymentUrl,
        payment,
      };
    }

    const newPaymentStatus = gatewayResult.success ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
    const newOrderStatus = gatewayResult.success ? OrderStatus.PAID : OrderStatus.PAYMENT_FAILED;

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          idempotencyKey: dto.idempotencyKey,
          amount: order.total,
          method: dto.method,
          status: newPaymentStatus,
          transactionRef: gatewayResult.transactionRef ?? null,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: newOrderStatus },
      });

      if (gatewayResult.success && order.pointsEarned > 0) {
        await tx.user.update({
          where: { id: order.userId },
          data: { loyaltyPoints: { increment: order.pointsEarned } },
        });
      }
      return { payment, order: updatedOrder };
    });

    // Trừ tồn kho topping, đường & đá SAU khi transaction hoàn tất — tránh lỗi 25P02
    if (gatewayResult.success) {
      await this.deductToppingStock(order.id);
      await this.deductSugarAndIceStock(order.id);
    }

    return {
      success: gatewayResult.success,
      isIdempotent: false,
      orderId: result.order.id,
      orderStatus: result.order.status,
      payment: result.payment,
      errorMessage: gatewayResult.errorMessage ?? null,
    };
  }

  async verifyVnpayReturn(query: Record<string, string>) {
    const verified = this.vnpayStrategy.verifyReturn(query);
    if (!verified.isValid) {
      throw new BadRequestException('Chữ ký xác thực VNPay không hợp lệ');
    }

    const orderIdMatch = verified.orderCode.match(/\d+/);
    const orderId = orderIdMatch ? Number(orderIdMatch[0]) : null;
    if (!orderId) {
      throw new BadRequestException(`Không tìm thấy mã đơn hàng từ VNPay: ${verified.orderCode}`);
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
    }

    if (order.status === OrderStatus.PAID) {
      return {
        success: true,
        orderId: order.id,
        orderCode: `ORD-${order.id}`,
        orderStatus: order.status,
        method: verified.method,
        transactionNo: verified.transactionNo,
      };
    }

    const newPaymentStatus = verified.isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
    const newOrderStatus = verified.isSuccess ? OrderStatus.PAID : OrderStatus.PAYMENT_FAILED;
    const resolvedMethod =
      verified.method === 'CARD' ? PaymentMethod.CARD : PaymentMethod.WALLET;

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingPendingPayment = [...order.payments]
        .reverse()
        .find((p) => p.status === PaymentStatus.PENDING);

      let payment;
      if (existingPendingPayment) {
        payment = await tx.payment.update({
          where: { id: existingPendingPayment.id },
          data: {
            status: newPaymentStatus,
            transactionRef: verified.transactionNo
              ? `${existingPendingPayment.method}_${verified.transactionNo}`
              : existingPendingPayment.transactionRef,
          },
        });
      } else {
        payment = await tx.payment.create({
          data: {
            orderId: order.id,
            idempotencyKey: `${resolvedMethod}_${verified.transactionNo || Date.now()}`,
            amount: verified.amount || order.total,
            method: resolvedMethod,
            status: newPaymentStatus,
            transactionRef: verified.transactionNo
              ? `${resolvedMethod}_${verified.transactionNo}`
              : null,
          },
        });
      }

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: newOrderStatus },
      });

      if (verified.isSuccess && order.pointsEarned > 0) {
        await tx.user.update({
          where: { id: order.userId },
          data: { loyaltyPoints: { increment: order.pointsEarned } },
        });
      }

      return { payment, order: updatedOrder };
    });

    // Trừ tồn kho topping, đường & đá SAU khi transaction hoàn tất — tránh lỗi 25P02
    if (verified.isSuccess) {
      await this.deductToppingStock(order.id);
      await this.deductSugarAndIceStock(order.id);
    }

    return {
      success: verified.isSuccess,
      orderId: result.order.id,
      orderCode: `ORD-${result.order.id}`,
      orderStatus: result.order.status,
      method: result.payment.method,
      transactionNo: verified.transactionNo,
      errorMessage: verified.isSuccess ? null : 'Giao dịch thanh toán không thành công hoặc người dùng đã hủy',
    };
  }

  async verifyZalopayReturn(query: Record<string, string>) {
    const verified = await this.walletStrategy.verifyAndQueryReturn(query);
    if (!verified.isValid) {
      throw new BadRequestException('Chữ ký xác thực ZaloPay không hợp lệ');
    }

    const orderIdMatch = verified.orderCode.match(/\d+/);
    const orderId = orderIdMatch ? Number(orderIdMatch[0]) : null;
    if (!orderId) {
      throw new BadRequestException(`Không tìm thấy mã đơn hàng từ ZaloPay: ${verified.orderCode}`);
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
    }

    if (order.status === OrderStatus.PAID) {
      return {
        success: true,
        isProcessing: false,
        orderId: order.id,
        orderCode: `ORD-${order.id}`,
        orderStatus: order.status,
        method: PaymentMethod.WALLET,
        transactionNo: verified.zpTransId || verified.appTransId,
      };
    }

    if (verified.isProcessing && !verified.isSuccess) {
      return {
        success: false,
        isProcessing: true,
        orderId: order.id,
        orderCode: `ORD-${order.id}`,
        orderStatus: order.status,
        method: PaymentMethod.WALLET,
        transactionNo: verified.appTransId,
        errorMessage: 'Đang chờ xác nhận thanh toán từ ứng dụng ZaloPay Sandbox...',
      };
    }

    const newPaymentStatus = verified.isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
    const newOrderStatus = verified.isSuccess ? OrderStatus.PAID : OrderStatus.PAYMENT_FAILED;

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingPendingPayment = [...order.payments]
        .reverse()
        .find((p) => p.status === PaymentStatus.PENDING);

      let payment;
      if (existingPendingPayment) {
        payment = await tx.payment.update({
          where: { id: existingPendingPayment.id },
          data: {
            status: newPaymentStatus,
            transactionRef: verified.zpTransId
              ? `WALLET_ZP_${verified.zpTransId}`
              : existingPendingPayment.transactionRef,
          },
        });
      } else {
        payment = await tx.payment.create({
          data: {
            orderId: order.id,
            idempotencyKey: `WALLET_ZP_${verified.zpTransId || verified.appTransId || Date.now()}`,
            amount: verified.amount || order.total,
            method: PaymentMethod.WALLET,
            status: newPaymentStatus,
            transactionRef: `WALLET_ZP_${verified.zpTransId || verified.appTransId}`,
          },
        });
      }

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: newOrderStatus },
      });

      if (verified.isSuccess && order.pointsEarned > 0) {
        await tx.user.update({
          where: { id: order.userId },
          data: { loyaltyPoints: { increment: order.pointsEarned } },
        });
      }

      return { payment, order: updatedOrder };
    });

    // Trừ tồn kho topping, đường & đá SAU khi transaction hoàn tất — tránh lỗi 25P02
    if (verified.isSuccess) {
      await this.deductToppingStock(order.id);
      await this.deductSugarAndIceStock(order.id);
    }

    return {
      success: verified.isSuccess,
      isProcessing: false,
      orderId: result.order.id,
      orderCode: `ORD-${result.order.id}`,
      orderStatus: result.order.status,
      method: PaymentMethod.WALLET,
      transactionNo: verified.zpTransId || verified.appTransId,
      errorMessage: verified.isSuccess
        ? null
        : 'Giao dịch Ví ZaloPay không thành công hoặc đã bị hủy',
    };
  }

  async getPaymentsByOrderId(orderId: number) {
    return this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
