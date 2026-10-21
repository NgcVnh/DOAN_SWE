import { OrderStatus } from '../enums/order-status.enum.js';
import { OrderItem } from './order-item.entity.js';

export class Order {
  id: string;
  orderCode: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  promoCode?: string;
  pointsToUse?: number;
  createdAt: Date;
  updatedAt: Date;
}

