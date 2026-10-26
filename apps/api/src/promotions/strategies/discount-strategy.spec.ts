import { describe, it, expect } from 'vitest';
import { PercentageDiscountStrategy } from './percentage-discount.strategy.js';
import { FixedDiscountStrategy } from './fixed-discount.strategy.js';

describe('Discount Strategies (OOP Strategy Pattern - Task 10.3)', () => {
  describe('PercentageDiscountStrategy', () => {
    const strategy = new PercentageDiscountStrategy();

    it('tính đúng số tiền giảm theo phần trăm (không có trần maxDiscount)', () => {
      const discount = strategy.calculateDiscount({
        subtotal: 100000,
        discountValue: 20, // 20%
      });
      expect(discount).toBe(20000);
    });

    it('áp dụng đúng trần giảm giá tối đa (maxDiscount)', () => {
      const discount = strategy.calculateDiscount({
        subtotal: 200000,
        discountValue: 20, // 20% của 200k = 40k, nhưng trần là 30k
        maxDiscount: 30000,
      });
      expect(discount).toBe(30000);
    });

    it('không áp trần nếu mức giảm thực tế nhỏ hơn maxDiscount', () => {
      const discount = strategy.calculateDiscount({
        subtotal: 100000,
        discountValue: 10, // 10% = 10k < 30k
        maxDiscount: 30000,
      });
      expect(discount).toBe(10000);
    });

    it('không giảm quá tổng tiền nếu cấu hình giảm giá 100%+', () => {
      const discount = strategy.calculateDiscount({
        subtotal: 50000,
        discountValue: 120, // Giảm 120%
      });
      expect(discount).toBe(50000);
    });

    it('trả về 0 khi subtotal hoặc discountValue nhỏ hơn hoặc bằng 0', () => {
      expect(strategy.calculateDiscount({ subtotal: 0, discountValue: 20 })).toBe(0);
      expect(strategy.calculateDiscount({ subtotal: 50000, discountValue: 0 })).toBe(0);
    });
  });

  describe('FixedDiscountStrategy', () => {
    const strategy = new FixedDiscountStrategy();

    it('giảm đúng số tiền cố định khi subtotal lớn hơn discountValue', () => {
      const discount = strategy.calculateDiscount({
        subtotal: 80000,
        discountValue: 15000,
      });
      expect(discount).toBe(15000);
    });

    it('giảm tối đa bằng subtotal nếu discountValue lớn hơn subtotal (không bị âm tiền)', () => {
      const discount = strategy.calculateDiscount({
        subtotal: 12000,
        discountValue: 20000,
      });
      expect(discount).toBe(12000);
    });

    it('trả về 0 khi discountValue hoặc subtotal <= 0', () => {
      expect(strategy.calculateDiscount({ subtotal: 0, discountValue: 10000 })).toBe(0);
      expect(strategy.calculateDiscount({ subtotal: 50000, discountValue: 0 })).toBe(0);
    });
  });
});
