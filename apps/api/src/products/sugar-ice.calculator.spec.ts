import { describe, it, expect } from 'vitest';
import {
  calculateSugarAndIceConsumption,
  SIZE_STANDARDS,
  BASE_INGREDIENT_STANDARDS,
  getProductBaseType,
} from './sugar-ice.calculator.js';

describe('Ingredient Consumption Calculation (Sugar, Ice, Coffee, Tea)', () => {
  it('đúng định mức chuẩn: size S 30g đường, 150g đá', () => {
    expect(SIZE_STANDARDS.S.sugar).toBe(30);
    expect(SIZE_STANDARDS.S.ice).toBe(150);
  });

  it('đúng định mức nguyên liệu cốt theo từng size', () => {
    expect(BASE_INGREDIENT_STANDARDS.S.coffee).toBe(16);
    expect(BASE_INGREDIENT_STANDARDS.S.tea).toBe(10);

    expect(BASE_INGREDIENT_STANDARDS.M.coffee).toBe(20);
    expect(BASE_INGREDIENT_STANDARDS.M.tea).toBe(15);

    expect(BASE_INGREDIENT_STANDARDS.L.coffee).toBe(25);
    expect(BASE_INGREDIENT_STANDARDS.L.tea).toBe(20);
  });

  it('nhận diện chính xác sản phẩm Cà phê và Trà', () => {
    expect(getProductBaseType('Cà phê sữa đá')).toBe('COFFEE');
    expect(getProductBaseType('Americano')).toBe('COFFEE');
    expect(getProductBaseType('Cappuccino')).toBe('COFFEE');
    expect(getProductBaseType('Trà sữa Oolong nướng')).toBe('TEA');
    expect(getProductBaseType('Trà đào cam sả')).toBe('TEA');
  });

  it('tính đúng tiêu hao 1 ly Cà phê sữa đá Size M (70% đường, ít đá)', () => {
    // 35 * 0.7 = 24.5g đường, 200 * 0.5 = 100g đá, 20g cà phê
    const result = calculateSugarAndIceConsumption([
      { productName: 'Cà phê sữa đá', size: 'M', sweetness: '70%', ice: 'Ít đá', qty: 1 },
    ]);
    expect(result.totalSugarGrams).toBe(24.5);
    expect(result.totalIceGrams).toBe(100);
    expect(result.totalCoffeeGrams).toBe(20);
    expect(result.totalTeaGrams).toBe(0);
  });

  it('tính đúng tiêu hao 2 ly Trà đào cam sả Size L (100% đường, bình thường đá)', () => {
    // 40 * 1.0 * 2 = 80g đường, 250 * 1.0 * 2 = 500g đá, 20g trà * 2 = 40g trà
    const result = calculateSugarAndIceConsumption([
      { productName: 'Trà đào cam sả', size: 'L', sweetness: '100%', ice: 'Bình thường', qty: 2 },
    ]);
    expect(result.totalSugarGrams).toBe(80);
    expect(result.totalIceGrams).toBe(500);
    expect(result.totalCoffeeGrams).toBe(0);
    expect(result.totalTeaGrams).toBe(40);
  });
});
