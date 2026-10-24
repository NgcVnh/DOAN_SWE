import { OrderStatus } from '../enums/order-status.enum.js';
import { OrderItem } from './order-item.entity.js';

export class Order {
  id: string;
  orderCode: string;
  userId?: number;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  pointsDiscount: number;
  pointsToUse?: number;
  pointsEarned: number;
  totalAmount: number;
  promoCode?: string;
  createdAt: Date;
  updatedAt: Date;
}
