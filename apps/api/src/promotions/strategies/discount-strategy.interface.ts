export interface DiscountContext {
  subtotal: number;
  discountValue: number;
  maxDiscount?: number | null;
}

export interface DiscountStrategy {
  calculateDiscount(context: DiscountContext): number;
}
