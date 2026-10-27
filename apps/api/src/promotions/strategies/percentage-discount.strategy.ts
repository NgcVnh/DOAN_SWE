import { Injectable } from '@nestjs/common';
import { DiscountContext, DiscountStrategy } from './discount-strategy.interface.js';

@Injectable()
export class PercentageDiscountStrategy implements DiscountStrategy {
  calculateDiscount(context: DiscountContext): number {
    const { subtotal, discountValue, maxDiscount } = context;

    if (subtotal <= 0 || discountValue <= 0) {
      return 0;
    }

    const rawDiscount = Math.floor((subtotal * discountValue) / 100);

    let appliedDiscount = rawDiscount;
    if (typeof maxDiscount === 'number' && maxDiscount > 0) {
      appliedDiscount = Math.min(appliedDiscount, maxDiscount);
    }

    return Math.min(appliedDiscount, subtotal);
  }
}
