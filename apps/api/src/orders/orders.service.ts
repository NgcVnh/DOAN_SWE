import {BadRequestException,Injectable,NotFoundException,} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderStatus, DrinkSize } from './enums/order-status.enum.js';
import { Order } from './entities/order.entity.js';
import { randomUUID } from 'crypto';
import { canTransition } from './order-state-machine.js';


// Bảng ánh xạ trạng thái hợp lệ theo Order State Machine (Mục 9.1)
// const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
//   [OrderStatus.PENDING]: [
//     OrderStatus.PAID,
//     OrderStatus.PAYMENT_FAILED,
//     OrderStatus.CANCELLED,
//   ],
//   [OrderStatus.PAYMENT_FAILED]: [
//     OrderStatus.PAID,
//     OrderStatus.PENDING,
//     OrderStatus.CANCELLED,
//   ],
//   [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
//   [OrderStatus.PREPARING]: [OrderStatus.READY],
//   [OrderStatus.READY]: [OrderStatus.COMPLETED],
//   [OrderStatus.COMPLETED]: [],
//   [OrderStatus.CANCELLED]: [],
// };

@Injectable()
export class OrdersService {
  private readonly orders: Order[] = [];

  createOrder(
    createOrderDto: CreateOrderDto,
    userId: string | number = '0',
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
      userId: String(userId),
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
  findByUserId(userId: string | number, status?: OrderStatus): Order[] {
    const targetUserId = String(userId);
    return this.orders
      .filter((order) => {
        const matchUser = String(order.userId) === targetUserId;
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
      throw new NotFoundException(
        `Không tìm thấy đơn hàng với mã: ${orderCode}`,
      );
    }
    return order;
  }

  findAll(): Order[] {
    return [...this.orders].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  //Chuyen trang thai
  transitionOrderStatus(orderCode: string, nextStatus: OrderStatus): Order {
    const order = this.findByCode(orderCode);

    if (!canTransition(order.status, nextStatus)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái đơn hàng từ "${order.status}" sang "${nextStatus}"`,
      );
    }

    order.status = nextStatus;
    order.updatedAt = new Date();

    return order;
  }
}
