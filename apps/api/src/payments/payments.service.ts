
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  Prisma,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';

import {
  PaymentStrategy,
  GatewayResponse,
} from './strategies/payment-strategy.interface.js';

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
   
const idempotencyKey = dto.idempotencyKey.trim();

if (!idempotencyKey) {
  throw new BadRequestException(
    'Idempotency-Key không được để trống',
  );
}

const existingPayment = await this.prisma.payment.findUnique({
  where: { idempotencyKey },
  include: { order: true },
});

if (existingPayment) {
  // Không cho dùng cùng key để thanh toán đơn hàng khác
  if (
  existingPayment.orderId !== dto.orderId ||
  existingPayment.method !== dto.method ||
  existingPayment.mockSuccess !== (dto.mockSuccess ?? true)
){
    throw new ConflictException(
      'Idempotency-Key đã được sử dụng cho yêu cầu thanh toán khác',
    );
  }

  // Giao dịch đang được xử lý
  if (existingPayment.status === PaymentStatus.PENDING) {
    throw new ConflictException(
      'Giao dịch đang được xử lý, vui lòng thử lại sau',
    );
  }

  // Trả lại giao dịch đã xử lý, không gọi gateway lần nữa
  return {
    success: existingPayment.status === PaymentStatus.SUCCESS,
    isIdempotent: true,
    orderId: existingPayment.orderId,
    orderStatus: existingPayment.order.status,
    payment: existingPayment,
  };
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
    
    // Đăng ký Idempotency-Key trước khi gọi cổng thanh toán
    try {
      
await this.prisma.payment.create({
  data: {
    orderId: order.id,
    idempotencyKey,
    amount: order.total,
    method: dto.method,
    mockSuccess: dto.mockSuccess ?? true,
    status: PaymentStatus.PENDING,
  },
});

    } catch (error) {
      // Prisma P2002: Idempotency-Key đã tồn tại
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.payment.findUnique({
          where: { idempotencyKey },
          include: { order: true },
        });

        if (existing) {
          if (
            existing.orderId !== dto.orderId ||
    existing.method !== dto.method ||
    existing.mockSuccess !== (dto.mockSuccess ?? true)
          ) {
            throw new ConflictException(
              'Idempotency-Key đã được sử dụng cho yêu cầu khác',
            );
          }

          if (existing.status === PaymentStatus.PENDING) {
            throw new ConflictException(
              'Giao dịch đang được xử lý',
            );
          }

          return {
            success: existing.status === PaymentStatus.SUCCESS,
            isIdempotent: true,
            orderId: existing.orderId,
            orderStatus: existing.order.status,
            payment: existing,
          };
        }
      }

      throw error;
    }

   
    const strategy = this.strategies[dto.method];
    if (!strategy) {
      throw new BadRequestException(`Phương thức thanh toán "${dto.method}" không được hỗ trợ`);
    }

    let gatewayResult: GatewayResponse;

try {
  gatewayResult = await strategy.charge(
    order.total,
    dto.mockSuccess ?? true,
  );
} catch (error) {
  // Không biết gateway đã xử lý giao dịch hay chưa.
  // Giữ PENDING để tránh tự động trừ tiền lần hai.
  throw new ServiceUnavailableException(
    'Không xác định được kết quả thanh toán. Vui lòng kiểm tra lại sau.',
  );
}


    // =========================================================================
    // BƯỚC 4: CẬP NHẬT DATABASE TRONG TRANSACTION (Đảm bảo tính toàn vẹn ACID)
    // =========================================================================
    const newPaymentStatus = gatewayResult.success ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
    const newOrderStatus = gatewayResult.success ? OrderStatus.PAID : OrderStatus.PAYMENT_FAILED;

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
     const payment = await tx.payment.update({
  where: { idempotencyKey },
  data: {
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
      isIdempotent: false,
      orderId: result.order.id,
      orderStatus: result.order.status,
      payment: result.payment,
      errorMessage: gatewayResult.errorMessage ?? null,
    };
  }

  /**
   * Tra cứu lịch sử thanh toán theo Order ID
   */
  async getPaymentsByOrderId(orderId: number) {
    return this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      include: { order: true },
    });
  }

  /**
   * Tra cứu chi tiết giao dịch thanh toán theo ID
   */
  async getPaymentById(id: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy giao dịch thanh toán #${id}`);
    }

    return payment;
  }
}

