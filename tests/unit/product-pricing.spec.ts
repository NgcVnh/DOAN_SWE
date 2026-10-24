import { describe, it, expect } from 'vitest';
import { calculateCustomizedPrice, SIZE_PRICES } from '../../apps/web/src/data/coffeeProducts';
import { ToppingOption } from '../../apps/web/src/types/product';

describe('TC-OPT-01: Product Customization & Real-time Pricing Logic', () => {
  const basePrice = 35000; // Cà phê sữa đá

  it('1. Nên tính đúng giá Size S khi không chọn topping nào', () => {
    const result = calculateCustomizedPrice(basePrice, 'S', [], 1);
    expect(result.basePrice).toBe(35000);
    expect(result.sizePrice).toBe(0);
    expect(result.toppingsTotal).toBe(0);
    expect(result.unitPrice).toBe(35000);
    expect(result.lineTotal).toBe(35000);
  });

  it('2. Nên tính đúng phụ phí khi đổi sang Size M (+6.000đ)', () => {
    const result = calculateCustomizedPrice(basePrice, 'M', [], 1);
    expect(result.sizePrice).toBe(6000);
    expect(result.unitPrice).toBe(41000);
    expect(result.lineTotal).toBe(41000);
  });

  it('3. Nên tính đúng phụ phí khi đổi sang Size L (+10.000đ)', () => {
    const result = calculateCustomizedPrice(basePrice, 'L', [], 1);
    expect(result.sizePrice).toBe(10000);
    expect(result.unitPrice).toBe(45000);
    expect(result.lineTotal).toBe(45000);
  });

  it('4. Nên cộng dồn chính xác phụ phí khi chọn nhiều Topping cùng lúc', () => {
    const toppings: ToppingOption[] = [
      { id: 1, name: 'Trân châu đen', price: 10000 },
      { id: 3, name: 'Kem Cheese', price: 12000 },
    ];

    const result = calculateCustomizedPrice(basePrice, 'M', toppings, 1);
    // 35,000 (Gốc) + 6,000 (Size M) + 10,000 (Trân châu) + 12,000 (Kem Cheese) = 63,000
    expect(result.toppingsTotal).toBe(22000);
    expect(result.unitPrice).toBe(63000);
    expect(result.lineTotal).toBe(63000);
  });

  it('5. Nên nhân đúng tổng tiền theo số lượng ly đặt (lineTotal = unitPrice * qty)', () => {
    const toppings: ToppingOption[] = [
      { id: 2, name: 'Trân châu trắng', price: 10000 },
    ];

    // 35,000 + 6,000 + 10,000 = 51,000 / ly
    // 3 ly = 153,000
    const result = calculateCustomizedPrice(basePrice, 'M', toppings, 3);
    expect(result.unitPrice).toBe(51000);
    expect(result.quantity).toBe(3);
    expect(result.lineTotal).toBe(153000);
  });

  it('6. Đảm bảo số lượng luôn tối thiểu là 1 nếu truyền số âm hoặc 0', () => {
    const result = calculateCustomizedPrice(basePrice, 'S', [], 0);
    expect(result.quantity).toBe(1);
    expect(result.lineTotal).toBe(35000);
  });
});
