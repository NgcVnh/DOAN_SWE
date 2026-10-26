import { Injectable } from '@nestjs/common';
import { DiscountContext, DiscountStrategy } from './discount-strategy.interface.js';

/**
 * [OOP - Concrete Strategy]
 * Chiến lược giảm giá theo số tiền cố định (Fixed Amount Discount).
 */
@Injectable()
export class FixedDiscountStrategy implements DiscountStrategy {
  calculateDiscount(context: DiscountContext): number {
    const { subtotal, discountValue } = context;

    if (subtotal <= 0 || discountValue <= 0) {
      return 0;
    }

    // Giảm đúng số tiền discountValue nhưng không vượt quá tổng giá trị đơn
    return Math.min(discountValue, subtotal);
  }
}
