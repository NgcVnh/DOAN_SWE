import { Injectable } from '@nestjs/common';
import { DiscountContext, DiscountStrategy } from './discount-strategy.interface.js';

@Injectable()
export class FixedDiscountStrategy implements DiscountStrategy {
  calculateDiscount(context: DiscountContext): number {
    const { subtotal, discountValue } = context;

    if (subtotal <= 0 || discountValue <= 0) {
      return 0;
    }
    return Math.min(discountValue, subtotal);
  }
}
