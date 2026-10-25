
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { OrderStatus, DrinkSize } from './enums/order-status.enum.js';

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  // Tạo đơn hàng dùng chung cho các test
  function createTestOrder() {
    return service.createOrder({
      items: [
        {
          productId: 'prod-1',
          quantity: 2,
          size: DrinkSize.M,
          toppings: ['Trân châu'],
        },
      ],
    });
  }

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an order with PENDING status and return orderCode', () => {
    const order = createTestOrder();

    expect(order).toBeDefined();
    expect(order.orderCode).toBeDefined();
    expect(order.orderCode.startsWith('ORD-')).toBe(true);
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.items.length).toBe(1);
    expect(order.totalAmount).toBeGreaterThan(0);
  });

  it('should find an order by orderCode', () => {
    const created = createTestOrder();

    const found = service.findByCode(created.orderCode);

    expect(found).toBeDefined();
    expect(found.orderCode).toBe(created.orderCode);
  });

  it('should transition PENDING to PAID', () => {
    const created = createTestOrder();

    const updated = service.transitionOrderStatus(
      created.orderCode,
      OrderStatus.PAID,
    );

    expect(updated.status).toBe(OrderStatus.PAID);
  });

  it('should transition PENDING to PAYMENT_FAILED', () => {
    const created = createTestOrder();

    const updated = service.transitionOrderStatus(
      created.orderCode,
      OrderStatus.PAYMENT_FAILED,
    );

    expect(updated.status).toBe(OrderStatus.PAYMENT_FAILED);
  });

  it('should transition PREPARING to READY', () => {
    const created = createTestOrder();

    service.transitionOrderStatus(created.orderCode, OrderStatus.PAID);
    service.transitionOrderStatus(created.orderCode, OrderStatus.PREPARING);

    const updated = service.transitionOrderStatus(
      created.orderCode,
      OrderStatus.READY,
    );

    expect(updated.status).toBe(OrderStatus.READY);
  });

  it('should transition READY to COMPLETED', () => {
    const created = createTestOrder();

    service.transitionOrderStatus(created.orderCode, OrderStatus.PAID);
    service.transitionOrderStatus(created.orderCode, OrderStatus.PREPARING);
    service.transitionOrderStatus(created.orderCode, OrderStatus.READY);

    const updated = service.transitionOrderStatus(
      created.orderCode,
      OrderStatus.COMPLETED,
    );

    expect(updated.status).toBe(OrderStatus.COMPLETED);
  });

  it('should reject COMPLETED to PENDING', () => {
    const created = createTestOrder();

    service.transitionOrderStatus(created.orderCode, OrderStatus.PAID);
    service.transitionOrderStatus(created.orderCode, OrderStatus.PREPARING);
    service.transitionOrderStatus(created.orderCode, OrderStatus.READY);
    service.transitionOrderStatus(created.orderCode, OrderStatus.COMPLETED);

    expect(() =>
      service.transitionOrderStatus(
        created.orderCode,
        OrderStatus.PENDING,
      ),
    ).toThrow(BadRequestException);
  });

  it('should reject CANCELLED to PAID', () => {
    const created = createTestOrder();

    service.transitionOrderStatus(
      created.orderCode,
      OrderStatus.CANCELLED,
    );

    expect(() =>
      service.transitionOrderStatus(
        created.orderCode,
        OrderStatus.PAID,
      ),
    ).toThrow(BadRequestException);
  });

  it('should reject transitioning to the same status', () => {
    const created = createTestOrder();

    expect(() =>
      service.transitionOrderStatus(
        created.orderCode,
        OrderStatus.PENDING,
      ),
    ).toThrow(BadRequestException);
  });

  it('should update updatedAt after a successful transition', async () => {
    const created = createTestOrder();
    const previousUpdatedAt = created.updatedAt.getTime();

    // Đợi một chút để timestamp mới có thể khác timestamp cũ.
    await new Promise((resolve) => setTimeout(resolve, 5));

    const updated = service.transitionOrderStatus(
      created.orderCode,
      OrderStatus.PAID,
    );

    expect(updated.updatedAt.getTime()).toBeGreaterThan(previousUpdatedAt);
  });
});
