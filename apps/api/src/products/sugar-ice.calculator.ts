import { ProductSize } from '@prisma/client';

export type IngredientCode = 'SUGAR' | 'ICE' | 'COFFEE_BEANS' | 'TEA_LEAVES' | 'MILK';

export interface ConsumptionInput {
  productId?: number | string | null;
  productName?: string | null;
  size: ProductSize | 'S' | 'M' | 'L';
  sweetness?: string | null;
  ice?: string | null;
  qty: number;
}

export interface ConsumptionResult {
  totalSugarGrams: number;
  totalIceGrams: number;
  totalCoffeeGrams: number;
  totalTeaGrams: number;
  totalMilkMl: number;
  itemDetails: Array<{
    size: string;
    sweetness: string;
    ice: string;
    qty: number;
    sugarPerItem: number;
    icePerItem: number;
    coffeePerItem: number;
    teaPerItem: number;
    milkPerItem: number;
    shots: number;
    totalSugar: number;
    totalIce: number;
    totalCoffee: number;
    totalTea: number;
    totalMilk: number;
  }>;
}

// 1. Định mức tiêu chuẩn đường & đá theo size (100% đường, bình thường đá)
export const SIZE_STANDARDS: Record<'S' | 'M' | 'L', { sugar: number; ice: number }> = {
  S: { sugar: 30, ice: 150 },
  M: { sugar: 35, ice: 200 },
  L: { sugar: 40, ice: 250 },
};

export type RecipeCode = 'AMERICANO' | 'CA_PHE_SUA' | 'CAPPUCCINO' | 'TRA_DAO' | 'TRA_SUA_OOLONG' | 'DEFAULT_COFFEE' | 'DEFAULT_TEA';

export interface RecipeItem {
  coffee: number; // gam hạt cà phê
  tea: number;    // gam lá trà
  milk: number;   // ml sữa
  shots: number;  // số shot espresso
}

// 2. Bảng định mức Recipe chuẩn theo mã món và size
export const RECIPE_STANDARDS: Record<RecipeCode, Record<'S' | 'M' | 'L', RecipeItem>> = {
  AMERICANO: {
    S: { coffee: 16, milk: 0, shots: 1, tea: 0 },
    M: { coffee: 25, milk: 0, shots: 2, tea: 0 },
    L: { coffee: 35, milk: 0, shots: 3, tea: 0 },
  },
  CA_PHE_SUA: {
    S: { coffee: 18, milk: 30, shots: 1, tea: 0 },
    M: { coffee: 22, milk: 40, shots: 1.5, tea: 0 },
    L: { coffee: 28, milk: 50, shots: 2, tea: 0 },
  },
  CAPPUCCINO: {
    S: { coffee: 14, milk: 120, shots: 1, tea: 0 },
    M: { coffee: 18, milk: 150, shots: 1, tea: 0 },
    L: { coffee: 24, milk: 180, shots: 2, tea: 0 },
  },
  TRA_DAO: {
    S: { coffee: 0, milk: 0, shots: 0, tea: 10 },
    M: { coffee: 0, milk: 0, shots: 0, tea: 15 },
    L: { coffee: 0, milk: 0, shots: 0, tea: 20 },
  },
  TRA_SUA_OOLONG: {
    S: { coffee: 0, milk: 40, shots: 0, tea: 12 },
    M: { coffee: 0, milk: 60, shots: 0, tea: 16 },
    L: { coffee: 0, milk: 80, shots: 0, tea: 22 },
  },
  DEFAULT_COFFEE: {
    S: { coffee: 16, milk: 0, shots: 1, tea: 0 },
    M: { coffee: 20, milk: 0, shots: 1.5, tea: 0 },
    L: { coffee: 25, milk: 0, shots: 2, tea: 0 },
  },
  DEFAULT_TEA: {
    S: { coffee: 0, milk: 0, shots: 0, tea: 10 },
    M: { coffee: 0, milk: 0, shots: 0, tea: 15 },
    L: { coffee: 0, milk: 0, shots: 0, tea: 20 },
  },
};

// Định mức nguyên liệu cốt chung fallback (hỗ trợ tương thích ngược)
export const BASE_INGREDIENT_STANDARDS: Record<'S' | 'M' | 'L', { coffee: number; tea: number; milk: number }> = {
  S: { coffee: 16, tea: 10, milk: 30 },
  M: { coffee: 20, tea: 15, milk: 40 },
  L: { coffee: 25, tea: 20, milk: 50 },
};

// Hệ số mức đường: SugarUsed = SugarStandardSize * SugarLevel
export const SWEETNESS_FACTORS: Record<string, number> = {
  '0%': 0.0,
  '30%': 0.3,
  '50%': 0.5,
  '70%': 0.7,
  '100%': 1.0,
};

// Hệ số mức đá: IceUsed = IceStandardSize * IceLevel
export const ICE_FACTORS: Record<string, number> = {
  'Không đá': 0.0,
  'Ít đá': 0.5,
  'Bình thường': 1.0,
};

/**
 * Nhận diện mã công thức (RecipeCode) từ tên sản phẩm hoặc ID
 */
export function getProductRecipeCode(nameOrId?: string | number | null): RecipeCode {
  if (!nameOrId) return 'DEFAULT_COFFEE';
  const str = String(nameOrId).toLowerCase().trim();

  if (str.includes('americano')) return 'AMERICANO';
  if (str.includes('cappuccino')) return 'CAPPUCCINO';
  if (str.includes('cà phê sữa') || str.includes('cafe sữa') || str.includes('sữa đá') || str.includes('bạc xỉu')) {
    return 'CA_PHE_SUA';
  }
  if (str.includes('đào cam sả')) return 'TRA_DAO';
  if (str.includes('trà sữa') || str.includes('oolong nướng') || str.includes('ô long nướng')) {
    return 'TRA_SUA_OOLONG';
  }
  if (str.includes('trà') || str.includes('tea') || str.includes('oolong') || str.includes('ô long')) {
    return 'DEFAULT_TEA';
  }
  return 'DEFAULT_COFFEE';
}

/**
 * Phân loại sản phẩm cơ bản (COFFEE hay TEA)
 */
export function getProductBaseType(nameOrId?: string | number | null): 'COFFEE' | 'TEA' | 'NONE' {
  const code = getProductRecipeCode(nameOrId);
  if (code === 'TRA_DAO' || code === 'TRA_SUA_OOLONG' || code === 'DEFAULT_TEA') {
    return 'TEA';
  }
  return 'COFFEE';
}

/**
 * Lấy định mức chi tiết (coffee, tea, milk, shots) của sản phẩm theo size
 */
export function getRecipeItem(nameOrId: string | number | null | undefined, size: 'S' | 'M' | 'L'): RecipeItem {
  const code = getProductRecipeCode(nameOrId);
  const rawSize = (size || 'M') as 'S' | 'M' | 'L';
  const standards = RECIPE_STANDARDS[code] || RECIPE_STANDARDS.DEFAULT_COFFEE;
  return standards[rawSize] || standards.M;
}

/**
 * Tính toán tổng lượng tiêu thụ: Đường, Đá, Cà phê hạt, Lá trà, và Sữa
 */
export function calculateSugarAndIceConsumption(
  items: ConsumptionInput[],
): ConsumptionResult {
  let totalSugarGrams = 0;
  let totalIceGrams = 0;
  let totalCoffeeGrams = 0;
  let totalTeaGrams = 0;
  let totalMilkMl = 0;
  const itemDetails: ConsumptionResult['itemDetails'] = [];

  for (const item of items) {
    const rawSize = (item.size || 'M') as 'S' | 'M' | 'L';
    const standard = SIZE_STANDARDS[rawSize] || SIZE_STANDARDS.M;
    const recipe = getRecipeItem(item.productName || item.productId, rawSize);

    const sweetnessKey = item.sweetness?.trim() || '100%';
    const iceKey = item.ice?.trim() || 'Bình thường';

    const sFactor = SWEETNESS_FACTORS[sweetnessKey] ?? 1.0;
    const iFactor = ICE_FACTORS[iceKey] ?? 1.0;

    const sugarPerItem = Math.round(standard.sugar * sFactor * 10) / 10;
    const icePerItem = Math.round(standard.ice * iFactor * 10) / 10;
    const coffeePerItem = recipe.coffee;
    const teaPerItem = recipe.tea;
    const milkPerItem = recipe.milk;
    const shots = recipe.shots;

    const quantity = Math.max(1, Number(item.qty || 1));
    const itemTotalSugar = Math.round(sugarPerItem * quantity * 10) / 10;
    const itemTotalIce = Math.round(icePerItem * quantity * 10) / 10;
    const itemTotalCoffee = Math.round(coffeePerItem * quantity * 10) / 10;
    const itemTotalTea = Math.round(teaPerItem * quantity * 10) / 10;
    const itemTotalMilk = Math.round(milkPerItem * quantity * 10) / 10;

    totalSugarGrams += itemTotalSugar;
    totalIceGrams += itemTotalIce;
    totalCoffeeGrams += itemTotalCoffee;
    totalTeaGrams += itemTotalTea;
    totalMilkMl += itemTotalMilk;

    itemDetails.push({
      size: rawSize,
      sweetness: sweetnessKey,
      ice: iceKey,
      qty: quantity,
      sugarPerItem,
      icePerItem,
      coffeePerItem,
      teaPerItem,
      milkPerItem,
      shots,
      totalSugar: itemTotalSugar,
      totalIce: itemTotalIce,
      totalCoffee: itemTotalCoffee,
      totalTea: itemTotalTea,
      totalMilk: itemTotalMilk,
    });
  }

  return {
    totalSugarGrams: Math.round(totalSugarGrams * 10) / 10,
    totalIceGrams: Math.round(totalIceGrams * 10) / 10,
    totalCoffeeGrams: Math.round(totalCoffeeGrams * 10) / 10,
    totalTeaGrams: Math.round(totalTeaGrams * 10) / 10,
    totalMilkMl: Math.round(totalMilkMl * 10) / 10,
    itemDetails,
  };
}
