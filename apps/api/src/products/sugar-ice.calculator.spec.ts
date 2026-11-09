import { describe, it, expect } from 'vitest';
import {
  calculateSugarAndIceConsumption,
  SIZE_STANDARDS,
  RECIPE_STANDARDS,
  getProductRecipeCode,
  getProductBaseType,
  getRecipeItem,
} from './sugar-ice.calculator.js';

describe('Ingredient Consumption Calculation with RECIPE_STANDARDS & MILK', () => {
  it('đúng định mức chuẩn đường và đá theo size', () => {
    expect(SIZE_STANDARDS.S.sugar).toBe(30);
    expect(SIZE_STANDARDS.S.ice).toBe(150);
    expect(SIZE_STANDARDS.M.sugar).toBe(35);
    expect(SIZE_STANDARDS.M.ice).toBe(200);
    expect(SIZE_STANDARDS.L.sugar).toBe(40);
    expect(SIZE_STANDARDS.L.ice).toBe(250);
  });

  it('đúng định mức chi tiết 3 món cà phê theo đề xuất', () => {
    // Americano: thuần cà phê, không dùng sữa
    expect(RECIPE_STANDARDS.AMERICANO.S).toEqual({ coffee: 16, milk: 0, shots: 1, tea: 0 });
    expect(RECIPE_STANDARDS.AMERICANO.M).toEqual({ coffee: 25, milk: 0, shots: 2, tea: 0 });
    expect(RECIPE_STANDARDS.AMERICANO.L).toEqual({ coffee: 35, milk: 0, shots: 3, tea: 0 });

    // Cà phê sữa đá: cà phê đậm + sữa đặc
    expect(RECIPE_STANDARDS.CA_PHE_SUA.S).toEqual({ coffee: 18, milk: 30, shots: 1, tea: 0 });
    expect(RECIPE_STANDARDS.CA_PHE_SUA.M).toEqual({ coffee: 22, milk: 40, shots: 1.5, tea: 0 });
    expect(RECIPE_STANDARDS.CA_PHE_SUA.L).toEqual({ coffee: 28, milk: 50, shots: 2, tea: 0 });

    // Cappuccino: espresso + sữa tươi đánh bọt
    expect(RECIPE_STANDARDS.CAPPUCCINO.S).toEqual({ coffee: 14, milk: 120, shots: 1, tea: 0 });
    expect(RECIPE_STANDARDS.CAPPUCCINO.M).toEqual({ coffee: 18, milk: 150, shots: 1, tea: 0 });
    expect(RECIPE_STANDARDS.CAPPUCCINO.L).toEqual({ coffee: 24, milk: 180, shots: 2, tea: 0 });
  });

  it('nhận diện đúng mã công thức (RecipeCode) cho từng sản phẩm', () => {
    expect(getProductRecipeCode('Americano')).toBe('AMERICANO');
    expect(getProductRecipeCode('Cà phê sữa đá')).toBe('CA_PHE_SUA');
    expect(getProductRecipeCode('Cappuccino')).toBe('CAPPUCCINO');
    expect(getProductRecipeCode('Trà đào cam sả')).toBe('TRA_DAO');
    expect(getProductRecipeCode('Trà sữa Oolong nướng')).toBe('TRA_SUA_OOLONG');
  });

  it('tính đúng tiêu hao 1 ly Americano Size M (70% đường, ít đá)', () => {
    // Americano Size M: 25g coffee, 0ml milk, 2 shots
    // Sugar: 35 * 0.7 = 24.5g, Ice: 200 * 0.5 = 100g
    const result = calculateSugarAndIceConsumption([
      { productName: 'Americano', size: 'M', sweetness: '70%', ice: 'Ít đá', qty: 1 },
    ]);
    expect(result.totalCoffeeGrams).toBe(25);
    expect(result.totalMilkMl).toBe(0);
    expect(result.totalSugarGrams).toBe(24.5);
    expect(result.totalIceGrams).toBe(100);
    expect(result.totalTeaGrams).toBe(0);
    expect(result.itemDetails[0].shots).toBe(2);
  });

  it('tính đúng tiêu hao 2 ly Cappuccino Size L (100% đường, bình thường đá)', () => {
    // Cappuccino Size L: 24g coffee, 180ml milk, 2 shots
    // 2 ly -> 48g coffee, 360ml milk
    // Sugar: 40 * 1.0 * 2 = 80g, Ice: 250 * 1.0 * 2 = 500g
    const result = calculateSugarAndIceConsumption([
      { productName: 'Cappuccino', size: 'L', sweetness: '100%', ice: 'Bình thường', qty: 2 },
    ]);
    expect(result.totalCoffeeGrams).toBe(48);
    expect(result.totalMilkMl).toBe(360);
    expect(result.totalSugarGrams).toBe(80);
    expect(result.totalIceGrams).toBe(500);
    expect(result.itemDetails[0].shots).toBe(2);
  });

  it('tính đúng tiêu hao 1 ly Cà phê sữa đá Size S', () => {
    // Cà phê sữa Size S: 18g coffee, 30ml milk, 1 shot
    const result = calculateSugarAndIceConsumption([
      { productName: 'Cà phê sữa đá', size: 'S', sweetness: '100%', ice: 'Bình thường', qty: 1 },
    ]);
    expect(result.totalCoffeeGrams).toBe(18);
    expect(result.totalMilkMl).toBe(30);
    expect(result.totalSugarGrams).toBe(30);
    expect(result.totalIceGrams).toBe(150);
    expect(result.itemDetails[0].shots).toBe(1);
  });
});
