import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentStrategy } from './strategies/payment-strategy.interface.js';
import { WalletPaymentStrategy } from './strategies/wallet-payment.strategy.js';
import { CardPaymentStrategy } from './strategies/card-payment.strategy.js';

@Injectable()
export class PaymentsService {
  private readonly strategies: Record<PaymentMethod, PaymentStrategy>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletStrategy: WalletPaymentStrategy,
    private readonly cardStrategy: CardPaymentStrategy,
  ) {
    this.strategies = {
      [PaymentMethod.WALLET]: this.walletStrategy,
      [PaymentMethod.CARD]: this.cardStrategy,
    };
  }

  async processPayment(dto: CreatePaymentDto) {
    if (!dto.idempotencyKey || typeof dto.idempotencyKey !== "string" || !dto.idempotencyKey.trim()) {
      throw new BadRequestException("Idempotency key không được để trống hoặc chỉ chứa khoảng trắng");
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
    const gatewayResult = await strategy.charge(order.total, dto.mockSuccess ?? true);

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
      orderId: result.order.id,
      orderStatus: result.order.status,
      payment: result.payment,
      errorMessage: gatewayResult.errorMessage ?? null,
    };
  }
}
