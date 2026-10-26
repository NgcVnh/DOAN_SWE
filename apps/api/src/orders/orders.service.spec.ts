import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { OrderStatus, DrinkSize } from './enums/order-status.enum.js';

describe('OrdersService - Task 10 (State Machine & Concurrency Control)', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  // Helper tạo đơn hàng kiểm thử
  async function createTestOrder() {
    return service.createOrder({
      items: [
        {
          productId: 'prod-1',
          quantity: 1,
          size: DrinkSize.M,
          toppings: ['Trân châu'],
        },
      ],
    });
  }

  it('Khởi tạo OrdersService thành công', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // 1. KIỂM THỬ TẠO ĐƠN VÀ TRỪ TỒN KHO NHẤT QUÁN (TRANSACTION INTEGRITY)
  // =========================================================================
  describe('Transaction tạo đơn và trừ kho', () => {
    it('Tạo đơn hàng thành công khi đủ hàng và trừ tồn kho chính xác', async () => {
      // Thiết lập kho: prod-1 có 10 ly
      service.setProductStock('prod-1', 10);
      expect(service.getProductStock('prod-1')).toBe(10);

      // Đặt 3 ly
      const order = await service.createOrder(
        {
          items: [
            {
              productId: 'prod-1',
              quantity: 3,
              size: DrinkSize.M,
              toppings: ['Trân châu'],
            },
          ],
        },
        'user-123',
      );

      // Kiểm tra đơn hàng được tạo với trạng thái PENDING
      expect(order).toBeDefined();
      expect(order.orderCode).toBeDefined();
      expect(order.orderCode.startsWith('ORD-')).toBe(true);
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.userId).toBe('user-123');

      // Tồn kho phải bị trừ chính xác từ 10 xuống 7
      expect(service.getProductStock('prod-1')).toBe(7);
    });

    it('Chặn đặt hàng khi số lượng yêu cầu vượt quá tồn kho (Chống bán vượt / Overselling)', async () => {
      // Thiết lập kho chỉ còn 2 ly
      service.setProductStock('prod-limited', 2);

      // Đặt 5 ly -> Phải bị từ chối với BadRequestException
      await expect(
        service.createOrder({
          items: [
            {
              productId: 'prod-limited',
              quantity: 5,
              size: DrinkSize.M,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);

      // Tồn kho vẫn phải giữ nguyên là 2 (Không bị trừ sai, không bị âm)
      expect(service.getProductStock('prod-limited')).toBe(2);
    });

    it('Tính nguyên tử của Transaction (Atomic Rollback): nếu 1 item thiếu hàng, toàn bộ đơn bị rollback', async () => {
      // Giả sử: prod-A còn 10 ly, prod-B chỉ còn 1 ly
      service.setProductStock('prod-A', 10);
      service.setProductStock('prod-B', 1);

      // Khách hàng đặt: 2 ly prod-A VÀ 3 ly prod-B
      // prod-A đủ hàng nhưng prod-B thiếu hàng -> Toàn bộ transaction phải bị rollback
      await expect(
        service.createOrder({
          items: [
            { productId: 'prod-A', quantity: 2, size: DrinkSize.S },
            { productId: 'prod-B', quantity: 3, size: DrinkSize.S },
          ],
        }),
      ).rejects.toThrow(BadRequestException);

      // Khẳng định: prod-A KHÔNG BỊ TRỪ OAN (vẫn nguyên vẹn 10 ly), prod-B vẫn còn 1 ly
      expect(service.getProductStock('prod-A')).toBe(10);
      expect(service.getProductStock('prod-B')).toBe(1);

      // Không có đơn hàng rác nào được lưu vào hệ thống
      expect(service.findAll()).toHaveLength(0);
    });
  });

  // =========================================================================
  // 2. KIỂM THỬ XỬ LÝ CONCURRENCY & RACE-CONDITION (NHIỀU NGƯỜI ĐẶT CÙNG LÚC)
  // =========================================================================
  describe('Xử lý Concurrency & Race-condition', () => {
    it('Race-condition: 5 khách hàng cùng tranh mua 2 sản phẩm cuối cùng (Chỉ 2 sản phẩm được bán, tồn kho về 0)', async () => {
      // Kho chỉ còn đúng 2 sản phẩm cuối cùng
      service.setProductStock('prod-limited', 2);

      // 5 khách hàng cùng nhấn "Đặt hàng" đồng thời tại cùng 1 mili-giây, mỗi người đặt 1 sản phẩm
      const clientRequests = [
        service.createOrder({ items: [{ productId: 'prod-limited', quantity: 1, size: DrinkSize.S }] }, 'user-1'),
        service.createOrder({ items: [{ productId: 'prod-limited', quantity: 1, size: DrinkSize.S }] }, 'user-2'),
        service.createOrder({ items: [{ productId: 'prod-limited', quantity: 1, size: DrinkSize.S }] }, 'user-3'),
        service.createOrder({ items: [{ productId: 'prod-limited', quantity: 1, size: DrinkSize.S }] }, 'user-4'),
        service.createOrder({ items: [{ productId: 'prod-limited', quantity: 1, size: DrinkSize.S }] }, 'user-5'),
      ];

      const results = await Promise.allSettled(clientRequests);

      const successfulOrders = results.filter((r) => r.status === 'fulfilled');
      const failedOrders = results.filter((r) => r.status === 'rejected');

      // Khẳng định: Đúng 2 đơn hàng thành công, 3 đơn bị từ chối
      expect(successfulOrders.length).toBe(2);
      expect(failedOrders.length).toBe(3);

      // Tồn kho cuối cùng chính xác là 0 (Tuyệt đối không bị âm kho)
      expect(service.getProductStock('prod-limited')).toBe(0);

      // Hệ thống lưu đúng 2 đơn hàng hợp lệ
      expect(service.findAll()).toHaveLength(2);
    });

    it('Race-condition: 2 khách hàng cùng đặt 2 ly khi kho chỉ còn 2 ly (Chỉ đúng 1 người thành công)', async () => {
      service.setProductStock('prod-limited', 2);

      // 2 khách hàng tranh mua mỗi người 2 ly cùng lúc
      const req1 = service.createOrder({
        items: [{ productId: 'prod-limited', quantity: 2, size: DrinkSize.M }],
      });
      const req2 = service.createOrder({
        items: [{ productId: 'prod-limited', quantity: 2, size: DrinkSize.M }],
      });

      const results = await Promise.allSettled([req1, req2]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
      expect(service.getProductStock('prod-limited')).toBe(0);
    });
  });

  // =========================================================================
  // 3. KIỂM THỬ ORDER STATE MACHINE (CHUYỂN TRẠNG THÁI HỢP LỆ & CHẶN LỖI)
  // =========================================================================
  describe('Order State Machine', () => {
    it('should find an order by orderCode', async () => {
      const created = await createTestOrder();
      const found = service.findByCode(created.orderCode);
      expect(found).toBeDefined();
      expect(found.orderCode).toBe(created.orderCode);
    });

    it('should transition PENDING to PAID', async () => {
      const created = await createTestOrder();
      const updated = service.transitionOrderStatus(created.orderCode, OrderStatus.PAID);
      expect(updated.status).toBe(OrderStatus.PAID);
    });

    it('should transition PENDING to PAYMENT_FAILED', async () => {
      const created = await createTestOrder();
      const updated = service.transitionOrderStatus(created.orderCode, OrderStatus.PAYMENT_FAILED);
      expect(updated.status).toBe(OrderStatus.PAYMENT_FAILED);
    });

    it('should transition PREPARING to READY', async () => {
      const created = await createTestOrder();
      service.transitionOrderStatus(created.orderCode, OrderStatus.PAID);
      service.transitionOrderStatus(created.orderCode, OrderStatus.PREPARING);
      const updated = service.transitionOrderStatus(created.orderCode, OrderStatus.READY);
      expect(updated.status).toBe(OrderStatus.READY);
    });

    it('should transition READY to COMPLETED', async () => {
      const created = await createTestOrder();
      service.transitionOrderStatus(created.orderCode, OrderStatus.PAID);
      service.transitionOrderStatus(created.orderCode, OrderStatus.PREPARING);
      service.transitionOrderStatus(created.orderCode, OrderStatus.READY);
      const updated = service.transitionOrderStatus(created.orderCode, OrderStatus.COMPLETED);
      expect(updated.status).toBe(OrderStatus.COMPLETED);
    });

    it('should reject COMPLETED to PENDING', async () => {
      const created = await createTestOrder();
      service.transitionOrderStatus(created.orderCode, OrderStatus.PAID);
      service.transitionOrderStatus(created.orderCode, OrderStatus.PREPARING);
      service.transitionOrderStatus(created.orderCode, OrderStatus.READY);
      service.transitionOrderStatus(created.orderCode, OrderStatus.COMPLETED);

      expect(() =>
        service.transitionOrderStatus(created.orderCode, OrderStatus.PENDING),
      ).toThrow(BadRequestException);
    });

    it('should reject CANCELLED to PAID', async () => {
      const created = await createTestOrder();
      service.transitionOrderStatus(created.orderCode, OrderStatus.CANCELLED);

      expect(() =>
        service.transitionOrderStatus(created.orderCode, OrderStatus.PAID),
      ).toThrow(BadRequestException);
    });

    it('should reject transitioning to the same status', async () => {
      const created = await createTestOrder();
      expect(() =>
        service.transitionOrderStatus(created.orderCode, OrderStatus.PENDING),
      ).toThrow(BadRequestException);
    });

    it('should update updatedAt after a successful transition', async () => {
      const created = await createTestOrder();
      const previousUpdatedAt = created.updatedAt.getTime();

      // Đợi một chút để timestamp mới có thể khác timestamp cũ.
      await new Promise((resolve) => setTimeout(resolve, 5));

      const updated = service.transitionOrderStatus(created.orderCode, OrderStatus.PAID);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(previousUpdatedAt);
    });
  });

  // =========================================================================
  // 4. KIỂM THỬ HOÀN TRẢ TỒN KHO KHI HỦY ĐƠN (RESTORATION OF STOCK)
  // =========================================================================
  describe('Hoàn trả tồn kho khi đơn hàng bị CANCELLED', () => {
    it('Tự động hoàn trả đúng số lượng tồn kho khi đơn hàng bị CANCELLED', async () => {
      service.setProductStock('prod-1', 10);

      // Đặt 4 ly -> tồn kho còn 6
      const order = await service.createOrder({
        items: [{ productId: 'prod-1', quantity: 4, size: DrinkSize.M }],
      });
      expect(service.getProductStock('prod-1')).toBe(6);

      // Khách hàng hoặc cửa hàng hủy đơn
      const cancelledOrder = service.transitionOrderStatus(
        order.orderCode,
        OrderStatus.CANCELLED,
      );
      expect(cancelledOrder.status).toBe(OrderStatus.CANCELLED);

      // Tồn kho được hoàn trả lại đúng 10 ly
      expect(service.getProductStock('prod-1')).toBe(10);
    });

    it('Tra cứu tồn kho qua helper methods phục vụ debug', () => {
      service.setProductStock('item-debug', 15);
      expect(service.getProductStock('item-debug')).toBe(15);

      const allStocks = service.getAllStocks();
      expect(allStocks['item-debug']).toBe(15);
    });
  });
});
