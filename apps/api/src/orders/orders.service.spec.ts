import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service.js';
import { OrderStatus, DrinkSize } from './enums/order-status.enum.js';
import { BadRequestException } from '@nestjs/common';

describe('OrdersService - Task 10 Advanced Business Logic', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // 1. KIỂM THỬ ORDER STATE MACHINE (MÁY TRẠNG THÁI ĐƠN HÀNG)
  // =========================================================================
  describe('Order State Machine', () => {
    it('Luồng chính: PENDING -> PAID -> PREPARING -> READY -> COMPLETED thành công', async () => {
      const order = await service.createOrder({
        items: [{ productId: '1', quantity: 1, size: DrinkSize.M }],
      });
      expect(order.status).toBe(OrderStatus.PENDING);

      const paid = service.transitionOrderStatus(order.orderCode, OrderStatus.PAID);
      expect(paid.status).toBe(OrderStatus.PAID);

      const preparing = service.transitionOrderStatus(order.orderCode, OrderStatus.PREPARING);
      expect(preparing.status).toBe(OrderStatus.PREPARING);

      const ready = service.transitionOrderStatus(order.orderCode, OrderStatus.READY);
      expect(ready.status).toBe(OrderStatus.READY);

      const completed = service.transitionOrderStatus(order.orderCode, OrderStatus.COMPLETED);
      expect(completed.status).toBe(OrderStatus.COMPLETED);
    });

    it('Ngoại lệ: PAYMENT_FAILED cho phép retry sang PAID', async () => {
      const order = await service.createOrder({
        items: [{ productId: '1', quantity: 1, size: DrinkSize.S }],
      });

      const failed = service.transitionOrderStatus(order.orderCode, OrderStatus.PAYMENT_FAILED);
      expect(failed.status).toBe(OrderStatus.PAYMENT_FAILED);

      const retryPaid = service.transitionOrderStatus(order.orderCode, OrderStatus.PAID);
      expect(retryPaid.status).toBe(OrderStatus.PAID);
    });

    it('Chặn nhảy cóc trạng thái (PENDING -> COMPLETED ném BadRequestException)', async () => {
      const order = await service.createOrder({
        items: [{ productId: '1', quantity: 1, size: DrinkSize.M }],
      });

      expect(() => {
        service.transitionOrderStatus(order.orderCode, OrderStatus.COMPLETED);
      }).toThrow(BadRequestException);
    });

    it('Chặn đổi trạng thái khi đơn hàng đã COMPLETED', async () => {
      const order = await service.createOrder({
        items: [{ productId: '1', quantity: 1, size: DrinkSize.M }],
      });
      service.transitionOrderStatus(order.orderCode, OrderStatus.PAID);
      service.transitionOrderStatus(order.orderCode, OrderStatus.PREPARING);
      service.transitionOrderStatus(order.orderCode, OrderStatus.READY);
      service.transitionOrderStatus(order.orderCode, OrderStatus.COMPLETED);

      expect(() => {
        service.transitionOrderStatus(order.orderCode, OrderStatus.CANCELLED);
      }).toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // 2. KIỂM THỬ KHUYẾN MÃI VÀ ĐIỂM THƯỞNG (PROMOTION & LOYALTY)
  // =========================================================================
  describe('Promotion & Loyalty Engine', () => {
    it('Áp dụng mã giảm cố định GIAM10K (giảm 10.000đ khi đơn >= 40.000đ)', async () => {
      // Subtotal = 35.000 (Base) + 5.000 (Size M) + 5.000 (Topping) = 45.000đ
      const order = await service.createOrder({
        items: [{ productId: '1', quantity: 1, size: DrinkSize.M, toppings: ['Trân châu'] }],
        promoCode: 'GIAM10K',
      });

      expect(order.subtotal).toBe(45000);
      expect(order.discountAmount).toBe(10000);
      expect(order.totalAmount).toBe(35000);
    });

    it('Áp dụng mã giảm theo phần trăm BREWLITE20 (giảm 20% tối đa 30.000đ)', async () => {
      // 2 ly size L: 2 * (35k + 10k) = 90.000đ -> Giảm 20% = 18.000đ
      const order = await service.createOrder({
        items: [{ productId: '1', quantity: 2, size: DrinkSize.L }],
        promoCode: 'BREWLITE20',
      });

      expect(order.subtotal).toBe(90000);
      expect(order.discountAmount).toBe(18000);
      expect(order.totalAmount).toBe(72000);
    });

    it('Ném BadRequestException khi dùng mã hết hạn HETHAN', async () => {
      await expect(
        service.createOrder({
          items: [{ productId: '1', quantity: 2, size: DrinkSize.L }],
          promoCode: 'HETHAN',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Trừ điểm thưởng hợp lệ (pointsToUse) và tích lũy điểm thưởng mới (pointsEarned)', async () => {
      // Subtotal: 45.000đ. Dùng 10 điểm = 10.000đ. Tổng còn: 35.000đ.
      const order = await service.createOrder({
        items: [{ productId: '1', quantity: 1, size: DrinkSize.M, toppings: ['Thạch'] }],
        pointsToUse: 10,
      });

      expect(order.pointsDiscount).toBe(10000);
      expect(order.totalAmount).toBe(35000);
      // Tích điểm 5% của 35.000đ = 1.750đ -> 1 điểm
      expect(order.pointsEarned).toBe(1);
    });
  });

  // =========================================================================
  // 3. KIỂM THỬ CONCURRENCY & KIỂM SOÁT TỒN KHO ĐỒNG THỜI
  // =========================================================================
  describe('Concurrency & Inventory Control', () => {
    it('Chặn đặt hàng khi số lượng yêu cầu vượt quá tồn kho hiện có', async () => {
      service.setProductStock('prod-limited', 1);

      await expect(
        service.createOrder({
          items: [{ productId: 'prod-limited', quantity: 5, size: DrinkSize.M }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Xử lý Race-Condition: 2 khách hàng tranh mua đồng thời món cuối cùng (Chỉ 1 người thành công)', async () => {
      // Kho chỉ còn đúng 2 ly
      service.setProductStock('prod-limited', 2);

      // 2 khách hàng gửi request đặt hàng đồng thời mỗi người 2 ly
      const client1 = service.createOrder({
        items: [{ productId: 'prod-limited', quantity: 2, size: DrinkSize.S }],
      });
      const client2 = service.createOrder({
        items: [{ productId: 'prod-limited', quantity: 2, size: DrinkSize.S }],
      });

      const results = await Promise.allSettled([client1, client2]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Chính xác 1 đơn thành công và 1 đơn bị từ chối vì hết hàng (Chống Overselling)
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // Tồn kho còn lại chính xác là 0 (Không bị âm kho)
      expect(service.getProductStock('prod-limited')).toBe(0);
    });

    it('Hoàn trả lại tồn kho khi đơn hàng bị CANCELLED', async () => {
      service.setProductStock('prod-limited', 5);

      const order = await service.createOrder({
        items: [{ productId: 'prod-limited', quantity: 2, size: DrinkSize.S }],
      });
      expect(service.getProductStock('prod-limited')).toBe(3);

      // Hủy đơn hàng
      service.transitionOrderStatus(order.orderCode, OrderStatus.CANCELLED);

      // Tồn kho được hoàn trả lại thành 5
      expect(service.getProductStock('prod-limited')).toBe(5);
    });
  });
});
