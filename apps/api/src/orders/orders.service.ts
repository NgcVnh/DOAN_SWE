import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderStatus, DrinkSize } from './enums/order-status.enum.js';
import { Order } from './entities/order.entity.js';
import { randomUUID } from 'crypto';

@Injectable()
export class OrdersService {
  private orders: Order[] = [];

  createOrder(createOrderDto: CreateOrderDto): Order {
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
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : randomUUID(),
      orderCode,
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
    return this.orders;
  }

  transitionOrderStatus(orderCode: string, nextStatus: OrderStatus): Order {
    const order = this.findByCode(orderCode);
    order.status = nextStatus;
    order.updatedAt = new Date();
    return order;
  }
}

