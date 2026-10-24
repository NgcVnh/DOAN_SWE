import { Test, TestingModule } from '@nestjs/testing';
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an order with PENDING status and return orderCode', () => {
    const order = service.createOrder({
      items: [
        {
          productId: 'prod-1',
          quantity: 2,
          size: DrinkSize.M,
          toppings: ['Trân châu'],
        },
      ],
    });

    expect(order).toBeDefined();
    expect(order.orderCode).toBeDefined();
    expect(order.orderCode.startsWith('ORD-')).toBe(true);
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.items.length).toBe(1);
    expect(order.totalAmount).toBeGreaterThan(0);
  });

  it('should find an order by orderCode', () => {
    const created = service.createOrder({
      items: [
        {
          productId: 'prod-2',
          quantity: 1,
          size: DrinkSize.S,
        },
      ],
    });

    const found = service.findByCode(created.orderCode);
    expect(found).toBeDefined();
    expect(found.orderCode).toBe(created.orderCode);
  });

  it('should transition order status', () => {
    const created = service.createOrder({
      items: [
        {
          productId: 'prod-3',
          quantity: 1,
          size: DrinkSize.L,
        },
      ],
    });

    const updated = service.transitionOrderStatus(
      created.orderCode,
      OrderStatus.PAID,
    );
    expect(updated.status).toBe(OrderStatus.PAID);
  });
});

