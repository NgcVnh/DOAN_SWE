import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentStrategy } from './strategies/payment-strategy.interface.js';
import { WalletPaymentStrategy } from './strategies/wallet-payment.strategy.js';
import { CardPaymentStrategy } from './strategies/card-payment.strategy.js';
import { VnpayPaymentStrategy } from './strategies/vnpay-payment.strategy.js';

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
