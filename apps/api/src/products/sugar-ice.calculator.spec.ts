import { describe, it, expect } from 'vitest';
import {
  calculateSugarAndIceConsumption,
  SIZE_STANDARDS,
  SWEETNESS_FACTORS,
  ICE_FACTORS,
} from './sugar-ice.calculator.js';

describe('Sugar and Ice Inventory Consumption Calculation', () => {
  it('đúng định mức chuẩn: size S 30g đường, 150g đá', () => {
    expect(SIZE_STANDARDS.S.sugar).toBe(30);
    expect(SIZE_STANDARDS.S.ice).toBe(150);
  });

  it('đúng định mức chuẩn: size M 35g đường, 200g đá', () => {
    expect(SIZE_STANDARDS.M.sugar).toBe(35);
    expect(SIZE_STANDARDS.M.ice).toBe(200);
  });

  it('đúng định mức chuẩn: size L 40g đường, 250g đá', () => {
    expect(SIZE_STANDARDS.L.sugar).toBe(40);
    expect(SIZE_STANDARDS.L.ice).toBe(250);
  });

  it('tính đúng 1 ly size S 100% đường, bình thường đá', () => {
    const result = calculateSugarAndIceConsumption([
      { size: 'S', sweetness: '100%', ice: 'Bình thường', qty: 1 },
    ]);
    expect(result.totalSugarGrams).toBe(30);
    expect(result.totalIceGrams).toBe(150);
  });

  it('tính đúng công thức sugarused = sugarstandarsize * sugarlevel với size M, 70% đường, ít đá (50%)', () => {
    // 35 * 0.7 = 24.5g đường, 200 * 0.5 = 100g đá
    const result = calculateSugarAndIceConsumption([
      { size: 'M', sweetness: '70%', ice: 'Ít đá', qty: 1 },
    ]);
    expect(result.totalSugarGrams).toBe(24.5);
    expect(result.totalIceGrams).toBe(100);
  });

  it('tính đúng không đường (0%), không đá', () => {
    const result = calculateSugarAndIceConsumption([
      { size: 'L', sweetness: '0%', ice: 'Không đá', qty: 2 },
    ]);
    expect(result.totalSugarGrams).toBe(0);
    expect(result.totalIceGrams).toBe(0);
  });

  it('tính đúng nhiều sản phẩm và số lượng (qty)', () => {
    // Ly 1: 2 ly Size S 50% đường (30 * 0.5 = 15g/ly -> 30g), Bình thường đá (150g/ly -> 300g)
    // Ly 2: 1 ly Size L 100% đường (40g), Ít đá (250 * 0.5 = 125g)
    // Tổng đường = 30 + 40 = 70g
    // Tổng đá = 300 + 125 = 425g
    const result = calculateSugarAndIceConsumption([
      { size: 'S', sweetness: '50%', ice: 'Bình thường', qty: 2 },
      { size: 'L', sweetness: '100%', ice: 'Ít đá', qty: 1 },
    ]);
    expect(result.totalSugarGrams).toBe(70);
    expect(result.totalIceGrams).toBe(425);
  });
});

