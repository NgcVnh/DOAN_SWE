import { DrinkSize } from '../enums/order-status.enum.js';

export class OrderItem {
  productId: string;
  quantity: number;
  size: DrinkSize;
  toppings?: string[];
  unitPrice?: number;
}

