import { DrinkSize } from '../enums/order-status.enum.js';

export class OrderItem {
  productId: string;
  productName?: string;
  quantity: number;
  size: DrinkSize;
  sweetness?: string;
  ice?: string;
  toppings?: string[];
  unitPrice?: number;
}

