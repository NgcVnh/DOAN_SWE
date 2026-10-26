import { OrderStatus } from '../enums/order-status.enum.js';
import { OrderItem } from './order-item.entity.js';

export class Order {
  id: string;
  orderCode: string;
  items: OrderItem[];
  userId: string;
  status: OrderStatus;
  subtotal?: number;
  discountAmount?: number;
  totalAmount: number;
  pointsEarned?: number;
  promoCode?: string;
  pointsToUse?: number;
  createdAt: Date;
  updatedAt: Date;
}

