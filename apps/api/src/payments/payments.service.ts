import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentStrategy } from './strategies/payment-strategy.interface.js';
import { WalletPaymentStrategy } from './strategies/wallet-payment.strategy.js';
import { CardPaymentStrategy } from './strategies/card-payment.strategy.js';

/**
 * [OOP - Dependency Injection & Polymorphism]
 * PaymentsService nhận các dependency thông qua Constructor (Dependency Injection)
 * và điều phối luồng nghiệp vụ thanh toán + cập nhật trạng thái đơn hàng.
 */
@Injectable()
export class PaymentsService {
  // Thuộc tính private đóng gói bảng ánh xạ các chiến lược thanh toán (Encapsulation)
  private readonly strategies: Record<PaymentMethod, PaymentStrategy>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletStrategy: WalletPaymentStrategy,
    private readonly cardStrategy: CardPaymentStrategy,
  ) {
    // Khởi tạo map ánh xạ từ Enum PaymentMethod sang đối tượng Strategy tương ứng
    this.strategies = {
      [PaymentMethod.WALLET]: this.walletStrategy,
      [PaymentMethod.CARD]: this.cardStrategy,
    };
  }

  /**
   * Hàm xử lý nghiệp vụ thanh toán cho đơn hàng
   */
  async processPayment(dto: CreatePaymentDto) {
    // =========================================================================
    // BƯỚC 1: KIỂM TRA IDEMPOTENCY KEY (Chống thanh toán trùng lặp 2 lần)
    // =========================================================================
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey},
      include: { order: true},
    });

    if (existingPayment) {
      return {
        success: existingPayment.status === PaymentStatus.SUCCESS,
        isIdempotent: true,
        orderId: existingPayment.orderId,
        orderStatus: existingPayment.order.status,
        payment: existingPayment,
      }
    }

    // =========================================================================
    // BƯỚC 2: TÌM ĐƠN HÀNG & KIỂM TRA ORDER STATE MACHINE
    // =========================================================================
     const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${dto.orderId}`);
    }

    // Theo sơ đồ trạng thái mục 9.1: Chỉ PENDING hoặc PAYMENT_FAILED mới được thanh toán
    const validStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED];
    if (!validStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Không thể thanh toán cho đơn hàng đang ở trạng thái "${order.status}"`,
      );
    }

    // =========================================================================
    // BƯỚC 3: GỌI CỔNG THANH TOÁN THEO ĐA HÌNH (POLYMORPHISM)
    // =========================================================================
    const strategy = this.strategies[dto.method];
    const gatewayResult = await strategy.charge(order.total, dto.mockSuccess ?? true);

    // =========================================================================
    // BƯỚC 4: CẬP NHẬT DATABASE TRONG TRANSACTION (Đảm bảo tính toàn vẹn ACID)
    // =========================================================================
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


    
    // =========================================================================
    // BƯỚC 5: TRẢ KẾT QUẢ VỀ CHO CONTROLLER / FRONTEND
    // =========================================================================
    return {
      success: gatewayResult.success,
      orderId: result.order.id,
      orderStatus: result.order.status,
      payment: result.payment,
      errorMessage: gatewayResult.errorMessage ?? null,
    };
  }
}

