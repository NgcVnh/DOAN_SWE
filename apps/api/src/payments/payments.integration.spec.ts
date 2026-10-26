import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { AppModule } from '../app.module.js';
import { PaymentsService } from './payments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('PaymentsService Integration Tests (with PostgreSQL Database)', () => {
  let moduleRef: TestingModule;
  let service: PaymentsService;
  let prisma: PrismaService;
  let testUserId: number;
  let isDbConnected = false;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = moduleRef.get<PaymentsService>(PaymentsService);
    prisma = moduleRef.get<PrismaService>(PrismaService);

    try {
      await prisma.$connect();
      // Đảm bảo có user mẫu để liên kết Order
      const user = await prisma.user.upsert({
        where: { email: 'test_integration_user@brewlite.vn' },
        update: {},
        create: {
          email: 'test_integration_user@brewlite.vn',
          fullName: 'Integration Test User',
          passwordHash: 'dummy_hash',
          loyaltyPoints: 50,
        },
      });
      testUserId = user.id;
      isDbConnected = true;
    } catch {
      console.warn('PostgreSQL chưa chạy, tự động bỏ qua Integration Test');
      isDbConnected = false;
    }
  });

  beforeEach((context) => {
    if (!isDbConnected) {
      context.skip();
    }
  });

  afterAll(async () => {
    if (isDbConnected && testUserId) {
      try {
        // Dọn dẹp dữ liệu test
        await prisma.payment.deleteMany({
          where: { order: { userId: testUserId } },
        });
        await prisma.order.deleteMany({
          where: { userId: testUserId },
        });
        await prisma.user.deleteMany({
          where: { id: testUserId },
        });
      } catch {
        // Bỏ qua lỗi cleanup nếu DB ngắt kết nối
      }
    }
    await moduleRef?.close();
  });

  /**
   * Helper tạo đơn hàng mới với trạng thái mong muốn
   */
  async function createTestOrder(status: OrderStatus = OrderStatus.PENDING, total = 65000, pointsEarned = 10) {
    return prisma.order.create({
      data: {
        userId: testUserId,
        status,
        subtotal: total,
        total,
        pointsEarned,
      },
    });
  }

  // =========================================================================
  // 1. KIỂM THỬ TÍNH ĐA HÌNH & STRATEGY PATTERN (WALLET vs CARD)
  // =========================================================================
  describe('Strategy Pattern & Polymorphism', () => {
    it('should charge using WalletPaymentStrategy and generate WALLET transactionRef', async () => {
      const order = await createTestOrder(OrderStatus.PENDING, 50000, 5);
      const idempotencyKey = `idemp-wallet-${Date.now()}-${Math.random()}`;

      const result = await service.processPayment({
        orderId: order.id,
        method: PaymentMethod.WALLET,
        idempotencyKey,
        mockSuccess: true,
      });

      expect(result.success).toBe(true);
      expect(result.orderStatus).toBe(OrderStatus.PAID);
      expect(result.payment.method).toBe(PaymentMethod.WALLET);
      expect(result.payment.status).toBe(PaymentStatus.SUCCESS);
      expect(result.payment.transactionRef).toMatch(/^WALLET_\d+/);
      expect(result.isIdempotent).toBe(false);
    });

    it('should charge using CardPaymentStrategy and generate CARD transactionRef', async () => {
      const order = await createTestOrder(OrderStatus.PENDING, 80000, 8);
      const idempotencyKey = `idemp-card-${Date.now()}-${Math.random()}`;

      const result = await service.processPayment({
        orderId: order.id,
        method: PaymentMethod.CARD,
        idempotencyKey,
        mockSuccess: true,
      });

      expect(result.success).toBe(true);
      expect(result.orderStatus).toBe(OrderStatus.PAID);
      expect(result.payment.method).toBe(PaymentMethod.CARD);
      expect(result.payment.status).toBe(PaymentStatus.SUCCESS);
      expect(result.payment.transactionRef).toMatch(/^CARD_\d+/);
      expect(result.isIdempotent).toBe(false);
    });
  });

  // =========================================================================
  // 2. KIỂM THỬ CƠ CHẾ IDEMPOTENCY (CHỐNG THANH TOÁN TRÙNG LẶP)
  // =========================================================================
  describe('Idempotency Mechanism', () => {
    it('should prevent double charging when identical idempotencyKey is sent again', async () => {
      const initialUser = await prisma.user.findUnique({ where: { id: testUserId } });
      const initialPoints = initialUser?.loyaltyPoints ?? 0;

      const order = await createTestOrder(OrderStatus.PENDING, 100000, 20);
      const idempotencyKey = `idemp-duplicate-${Date.now()}`;

      // Lần gọi 1: Thanh toán thành công
      const firstCall = await service.processPayment({
        orderId: order.id,
        method: PaymentMethod.WALLET,
        idempotencyKey,
        mockSuccess: true,
      });

      expect(firstCall.success).toBe(true);
      expect(firstCall.isIdempotent).toBe(false);
      expect(firstCall.orderStatus).toBe(OrderStatus.PAID);

      // Kiểm tra điểm tích lũy được cộng đúng 1 lần
      const userAfterFirstCall = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(userAfterFirstCall?.loyaltyPoints).toBe(initialPoints + 20);

      // Lần gọi 2: Gửi lặp lại chính xác cùng idempotencyKey (Ví dụ khách bấm đúp nút)
      const secondCall = await service.processPayment({
        orderId: order.id,
        method: PaymentMethod.WALLET,
        idempotencyKey,
        mockSuccess: true,
      });

      expect(secondCall.success).toBe(true);
      expect(secondCall.isIdempotent).toBe(true);
      expect(secondCall.payment.id).toBe(firstCall.payment.id);

      // Số lượng bản ghi Payment trong database vẫn là 1
      const paymentCount = await prisma.payment.count({
        where: { idempotencyKey },
      });
      expect(paymentCount).toBe(1);

      // Điểm tích lũy tuyệt đối KHÔNG bị cộng lần 2
      const userAfterSecondCall = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(userAfterSecondCall?.loyaltyPoints).toBe(initialPoints + 20);
    });

    it('should throw ConflictException if idempotencyKey is reused with different parameters', async () => {
      const order1 = await createTestOrder(OrderStatus.PENDING, 50000);
      const order2 = await createTestOrder(OrderStatus.PENDING, 70000);
      const sharedKey = `idemp-conflict-${Date.now()}`;

      // Dùng sharedKey cho order1
      await service.processPayment({
        orderId: order1.id,
        method: PaymentMethod.WALLET,
        idempotencyKey: sharedKey,
        mockSuccess: true,
      });

      // Cố tình dùng lại sharedKey cho order2 (khác orderId)
      await expect(
        service.processPayment({
          orderId: order2.id,
          method: PaymentMethod.WALLET,
          idempotencyKey: sharedKey,
          mockSuccess: true,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if idempotencyKey is empty or whitespace', async () => {
      const order = await createTestOrder(OrderStatus.PENDING);

      await expect(
        service.processPayment({
          orderId: order.id,
          method: PaymentMethod.WALLET,
          idempotencyKey: '   ',
          mockSuccess: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // 3. KIỂM THỬ MÁY TRẠNG THÁI ĐƠN HÀNG (ORDER STATE MACHINE)
  // =========================================================================
  describe('Order State Machine & Transitions', () => {
    it('should transition order to PAYMENT_FAILED when mockSuccess is false, and allow retry to PAID', async () => {
      const order = await createTestOrder(OrderStatus.PENDING, 90000);
      const failedKey = `idemp-fail-${Date.now()}`;

      // Bước 1: Thanh toán thất bại (giả lập thẻ hết hạn mức)
      const failedResult = await service.processPayment({
        orderId: order.id,
        method: PaymentMethod.CARD,
        idempotencyKey: failedKey,
        mockSuccess: false,
      });

      expect(failedResult.success).toBe(false);
      expect(failedResult.orderStatus).toBe(OrderStatus.PAYMENT_FAILED);
      expect(failedResult.payment.status).toBe(PaymentStatus.FAILED);
      expect(failedResult.errorMessage).toBeDefined();

      const orderInDb = await prisma.order.findUnique({ where: { id: order.id } });
      expect(orderInDb?.status).toBe(OrderStatus.PAYMENT_FAILED);

      // Bước 2: Khách hàng đổi phương thức hoặc bấm "Thử thanh toán lại" với key mới
      const retryKey = `idemp-retry-${Date.now()}`;
      const retryResult = await service.processPayment({
        orderId: order.id,
        method: PaymentMethod.WALLET,
        idempotencyKey: retryKey,
        mockSuccess: true,
      });

      expect(retryResult.success).toBe(true);
      expect(retryResult.orderStatus).toBe(OrderStatus.PAID);
      expect(retryResult.payment.status).toBe(PaymentStatus.SUCCESS);

      const orderUpdated = await prisma.order.findUnique({ where: { id: order.id } });
      expect(orderUpdated?.status).toBe(OrderStatus.PAID);
    });

    it('should reject payment when order is already in PAID status', async () => {
      const order = await createTestOrder(OrderStatus.PAID, 45000);
      const newKey = `idemp-already-paid-${Date.now()}`;

      await expect(
        service.processPayment({
          orderId: order.id,
          method: PaymentMethod.WALLET,
          idempotencyKey: newKey,
          mockSuccess: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject payment when order is in COMPLETED or CANCELLED status', async () => {
      const completedOrder = await createTestOrder(OrderStatus.COMPLETED, 45000);
      const cancelledOrder = await createTestOrder(OrderStatus.CANCELLED, 45000);

      await expect(
        service.processPayment({
          orderId: completedOrder.id,
          method: PaymentMethod.CARD,
          idempotencyKey: `idemp-comp-${Date.now()}`,
          mockSuccess: true,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.processPayment({
          orderId: cancelledOrder.id,
          method: PaymentMethod.WALLET,
          idempotencyKey: `idemp-canc-${Date.now()}`,
          mockSuccess: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      await expect(
        service.processPayment({
          orderId: 99999999,
          method: PaymentMethod.WALLET,
          idempotencyKey: `idemp-404-${Date.now()}`,
          mockSuccess: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // 4. KIỂM THỬ TÍNH TOÀN VẸN GIAO DỊCH DATABASE (ACID & TRANSACTION)
  // =========================================================================
  describe('Database Transaction & Atomic Consistency', () => {
    it('should update Order, Payment and User loyaltyPoints atomically in transaction', async () => {
      const pointsToAdd = 15;
      const order = await createTestOrder(OrderStatus.PENDING, 150000, pointsToAdd);

      const userBefore = await prisma.user.findUnique({ where: { id: testUserId } });
      const pointsBefore = userBefore?.loyaltyPoints ?? 0;

      const idempotencyKey = `idemp-acid-${Date.now()}`;
      const result = await service.processPayment({
        orderId: order.id,
        method: PaymentMethod.WALLET,
        idempotencyKey,
        mockSuccess: true,
      });

      expect(result.success).toBe(true);

      // Kiểm tra cả 3 bảng đều phản ánh đúng dữ liệu đã commit
      const [persistedOrder, persistedPayment, persistedUser] = await Promise.all([
        prisma.order.findUnique({ where: { id: order.id } }),
        prisma.payment.findUnique({ where: { idempotencyKey } }),
        prisma.user.findUnique({ where: { id: testUserId } }),
      ]);

      expect(persistedOrder?.status).toBe(OrderStatus.PAID);
      expect(persistedPayment?.status).toBe(PaymentStatus.SUCCESS);
      expect(persistedPayment?.amount).toBe(150000);
      expect(persistedUser?.loyaltyPoints).toBe(pointsBefore + pointsToAdd);
    });
  });
});

