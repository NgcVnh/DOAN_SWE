export interface DiscountContext {
  subtotal: number;
  discountValue: number;
  maxDiscount?: number | null;
}

/**
 * [OOP - Strategy Pattern & Polymorphism]
 * Interface định nghĩa hợp đồng chung cho các chiến lược giảm giá (Khuyến mãi).
 */
export interface DiscountStrategy {
  calculateDiscount(context: DiscountContext): number;
}
