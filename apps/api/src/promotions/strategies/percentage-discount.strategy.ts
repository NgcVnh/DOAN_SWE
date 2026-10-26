import { Injectable } from '@nestjs/common';
import { DiscountContext, DiscountStrategy } from './discount-strategy.interface.js';

/**
 * [OOP - Concrete Strategy]
 * Chiến lược giảm giá theo phần trăm (Percentage Discount).
 * Tuân thủ Open/Closed Principle (OCP) và Liskov Substitution Principle (LSP).
 */
@Injectable()
export class PercentageDiscountStrategy implements DiscountStrategy {
  calculateDiscount(context: DiscountContext): number {
    const { subtotal, discountValue, maxDiscount } = context;

    if (subtotal <= 0 || discountValue <= 0) {
      return 0;
    }

    // Tính phần trăm giảm giá (làm tròn số nguyên)
    const rawDiscount = Math.floor((subtotal * discountValue) / 100);

    // Áp dụng trần giảm tối đa (nếu có cấu hình maxDiscount)
    let appliedDiscount = rawDiscount;
    if (typeof maxDiscount === 'number' && maxDiscount > 0) {
      appliedDiscount = Math.min(appliedDiscount, maxDiscount);
    }

    // Không bao giờ giảm quá tổng tiền đơn hàng
    return Math.min(appliedDiscount, subtotal);
  }
}
