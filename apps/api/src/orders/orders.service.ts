import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderStatus, DrinkSize } from './enums/order-status.enum.js';
import { Order } from './entities/order.entity.js';
import { randomUUID } from 'crypto';

// Bảng ánh xạ trạng thái hợp lệ theo Order State Machine (Mục 9.1)
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.PAID,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAYMENT_FAILED]: [
    OrderStatus.PAID,
    OrderStatus.PENDING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
  private readonly orders: Order[] = [
    {
      id: 'ord-sample-1042',
      orderCode: 'ORD-1042',
      userId: 'user-default-id',
      items: [
        {
          productId: '3',
          quantity: 1,
          size: DrinkSize.M,
          toppings: ['Kem Cheese'],
          unitPrice: 63000,
        },
        {
          productId: '4',
          quantity: 2,
          size: DrinkSize.L,
          toppings: ['Thạch nha đam'],
          unitPrice: 57000,
        },
      ],
      status: OrderStatus.PAID,
      totalAmount: 177000,
      promoCode: 'BREWLITE10',
      pointsToUse: 0,
      createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 phút trước
      updatedAt: new Date(Date.now() - 1000 * 60 * 14),
    },
    {
      id: 'ord-sample-1039',
      orderCode: 'ORD-1039',
      userId: 'user-default-id',
      items: [
        {
          productId: '1',
          quantity: 2,
          size: DrinkSize.M,
          toppings: [],
          unitPrice: 41000,
        },
      ],
      status: OrderStatus.PREPARING,
      totalAmount: 82000,
      createdAt: new Date(Date.now() - 1000 * 60 * 45), // 45 phút trước
      updatedAt: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: 'ord-sample-1028',
      orderCode: 'ORD-1028',
      userId: 'user-default-id',
      items: [
        {
          productId: '5',
          quantity: 1,
          size: DrinkSize.L,
          toppings: ['Trân châu đen', 'Kem Cheese'],
          unitPrice: 74000,
        },
      ],
      status: OrderStatus.COMPLETED,
      totalAmount: 74000,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // Hôm qua
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 23),
    },
  ];

  createOrder(
    createOrderDto: CreateOrderDto,
    userId: string = 'user-default-id',
  ): Order {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `ORD-${timestamp}-${randomSuffix}`;

    // Tính tổng tiền ước tính cho đơn hàng (Base: 35.000đ, Size M +5k, L +10k, mỗi topping +5k)
    const totalAmount = createOrderDto.items.reduce((sum, item) => {
      let itemPrice = 35000;
      if (item.size === DrinkSize.M) itemPrice += 5000;
      if (item.size === DrinkSize.L) itemPrice += 10000;
      if (item.toppings && item.toppings.length > 0) {
        itemPrice += item.toppings.length * 5000;
      }
      return sum + itemPrice * item.quantity;
    }, 0);

    const newOrder: Order = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : randomUUID(),
      orderCode,
      userId,
      items: createOrderDto.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        size: item.size,
        toppings: item.toppings || [],
      })),
      status: OrderStatus.PENDING,
      totalAmount,
      promoCode: createOrderDto.promoCode,
      pointsToUse: createOrderDto.pointsToUse,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.push(newOrder);

    return newOrder;
  }

  findByUserId(userId: string, status?: OrderStatus): Order[] {
    return this.orders
      .filter((order) => {
        const matchUser = order.userId === userId;
        const matchStatus = status ? order.status === status : true;
        return matchUser && matchStatus;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  findByCode(orderCode: string): Order {
    const order = this.orders.find(
      (o) => o.orderCode === orderCode || o.id === orderCode,
    );
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã: ${orderCode}`);
    }
    return order;
  }

  findAll(): Order[] {
    return [...this.orders].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  transitionOrderStatus(orderCode: string, nextStatus: OrderStatus): Order {
    const order = this.findByCode(orderCode);
    const allowedNext = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowedNext.includes(nextStatus)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái đơn hàng từ "${order.status}" sang "${nextStatus}"`,
      );
    }
    order.status = nextStatus;
    order.updatedAt = new Date();
    return order;
  }
}
