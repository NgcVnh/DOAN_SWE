import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
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
    // TODO 1: Dùng this.prisma.payment.findUnique({ where: { idempotencyKey: dto.idempotencyKey }, include: { order: true } })
    // Nếu đã tồn tại bản ghi payment với key này, trả về luôn kết quả cũ mà không trừ tiền lần 2.

    // =========================================================================
    // BƯỚC 2: TÌM ĐƠN HÀNG & KIỂM TRA ORDER STATE MACHINE
    // =========================================================================
    // TODO 2: Dùng this.prisma.order.findUnique({ where: { id: dto.orderId } })
    // - Nếu không tìm thấy đơn hàng -> throw new NotFoundException(...)
    // - Kiểm tra trạng thái đơn hàng hiện tại: Chỉ cho phép thanh toán khi order.status
    //   đang là OrderStatus.PENDING hoặc OrderStatus.PAYMENT_FAILED (cho phép thanh toán lại).
    //   Nếu đang ở trạng thái khác (PAID, CANCELLED, COMPLETED...) -> throw new BadRequestException(...)

    // =========================================================================
    // BƯỚC 3: GỌI CỔNG THANH TOÁN THEO ĐA HÌNH (POLYMORPHISM)
    // =========================================================================
    // TODO 3: Lấy strategy tương ứng từ `this.strategies[dto.method]`
    // Gọi `const gatewayResult = await strategy.charge(order.total, dto.mockSuccess ?? true);`

    // =========================================================================
    // BƯỚC 4: CẬP NHẬT DATABASE TRONG TRANSACTION (Đảm bảo tính toàn vẹn ACID)
    // =========================================================================
    // TODO 4: Xác định trạng thái mới:
    // - Nếu gatewayResult.success === true:
    //     paymentStatus = PaymentStatus.SUCCESS
    //     orderStatus   = OrderStatus.PAID
    // - Nếu gatewayResult.success === false:
    //     paymentStatus = PaymentStatus.FAILED
    //     orderStatus   = OrderStatus.PAYMENT_FAILED
    //
    // Dùng `await this.prisma.$transaction(async (tx) => { ... })` để:
    //   1) Tạo bản ghi trong bảng `tx.payment.create(...)`
    //   2) Cập nhật trạng thái đơn trong bảng `tx.order.update(...)`
    //   3) (Nếu thành công & order.pointsEarned > 0) Cộng điểm thưởng vào `tx.user.update(...)`

    // =========================================================================
    // BƯỚC 5: TRẢ KẾT QUẢ VỀ CHO CONTROLLER / FRONTEND
    // =========================================================================
    throw new BadRequestException('TODO: Hãy hoàn thiện các bước trong PaymentsService.processPayment()');
  }
}

