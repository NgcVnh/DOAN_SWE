import { ProductSize } from '@prisma/client';

export type IngredientCode = 'SUGAR' | 'ICE' | 'COFFEE_BEANS' | 'TEA_LEAVES';

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
  itemDetails: Array<{
    size: string;
    sweetness: string;
    ice: string;
    qty: number;
    sugarPerItem: number;
    icePerItem: number;
    coffeePerItem: number;
    teaPerItem: number;
    totalSugar: number;
    totalIce: number;
    totalCoffee: number;
    totalTea: number;
  }>;
}

// 1. Định mức tiêu chuẩn đường & đá theo size (100% đường, bình thường đá)
export const SIZE_STANDARDS: Record<'S' | 'M' | 'L', { sugar: number; ice: number }> = {
  S: { sugar: 30, ice: 150 },
  M: { sugar: 35, ice: 200 },
  L: { sugar: 40, ice: 250 },
};

// 2. Định mức tiêu chuẩn Cà phê & Trà theo từng size
// Size S: 16g cà phê / 10g trà khô
// Size M: 20g cà phê / 15g trà khô
// Size L: 25g cà phê / 20g trà khô
export const BASE_INGREDIENT_STANDARDS: Record<'S' | 'M' | 'L', { coffee: number; tea: number }> = {
  S: { coffee: 16, tea: 10 },
  M: { coffee: 20, tea: 15 },
  L: { coffee: 25, tea: 20 },
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
 * Phân loại sản phẩm dựa trên tên hoặc ID để xác định dùng nguyên liệu cốt Cà phê hay Trà
 */
export function getProductBaseType(nameOrId?: string | number | null): 'COFFEE' | 'TEA' | 'NONE' {
  if (!nameOrId) return 'COFFEE'; // Mặc định là cafe nếu không rõ
  const str = String(nameOrId).toLowerCase().trim();

  // Nhận diện từ khóa trà
  if (
    str.includes('trà') ||
    str.includes('tea') ||
    str.includes('oolong') ||
    str.includes('ô long') ||
    str.includes('đào cam sả')
  ) {
    return 'TEA';
  }

  // Nhận diện từ khóa cà phê
  if (
    str.includes('cà phê') ||
    str.includes('cafe') ||
    str.includes('coffee') ||
    str.includes('americano') ||
    str.includes('cappuccino') ||
    str.includes('bạc xỉu') ||
    str.includes('đen đá') ||
    str.includes('sữa đá')
  ) {
    return 'COFFEE';
  }

  return 'COFFEE';
}

/**
 * Tính toán tổng lượng tiêu thụ: Đường, Đá, Cà phê hạt, và Lá trà
 */
export function calculateSugarAndIceConsumption(
  items: ConsumptionInput[],
): ConsumptionResult {
  let totalSugarGrams = 0;
  let totalIceGrams = 0;
  let totalCoffeeGrams = 0;
  let totalTeaGrams = 0;
  const itemDetails: ConsumptionResult['itemDetails'] = [];

  for (const item of items) {
    const rawSize = (item.size || 'M') as 'S' | 'M' | 'L';
    const standard = SIZE_STANDARDS[rawSize] || SIZE_STANDARDS.M;
    const baseStd = BASE_INGREDIENT_STANDARDS[rawSize] || BASE_INGREDIENT_STANDARDS.M;

    const sweetnessKey = item.sweetness?.trim() || '100%';
    const iceKey = item.ice?.trim() || 'Bình thường';

    const sFactor = SWEETNESS_FACTORS[sweetnessKey] ?? 1.0;
    const iFactor = ICE_FACTORS[iceKey] ?? 1.0;

    const sugarPerItem = Math.round(standard.sugar * sFactor * 10) / 10;
    const icePerItem = Math.round(standard.ice * iFactor * 10) / 10;

    // Xác định loại cốt: Cà phê hay Trà
    const baseType = getProductBaseType(item.productName || item.productId);
    let coffeePerItem = 0;
    let teaPerItem = 0;
    if (baseType === 'COFFEE') {
      coffeePerItem = baseStd.coffee;
    } else if (baseType === 'TEA') {
      teaPerItem = baseStd.tea;
    }

    const quantity = Math.max(1, Number(item.qty || 1));
    const itemTotalSugar = Math.round(sugarPerItem * quantity * 10) / 10;
    const itemTotalIce = Math.round(icePerItem * quantity * 10) / 10;
    const itemTotalCoffee = Math.round(coffeePerItem * quantity * 10) / 10;
    const itemTotalTea = Math.round(teaPerItem * quantity * 10) / 10;

    totalSugarGrams += itemTotalSugar;
    totalIceGrams += itemTotalIce;
    totalCoffeeGrams += itemTotalCoffee;
    totalTeaGrams += itemTotalTea;

    itemDetails.push({
      size: rawSize,
      sweetness: sweetnessKey,
      ice: iceKey,
      qty: quantity,
      sugarPerItem,
      icePerItem,
      coffeePerItem,
      teaPerItem,
      totalSugar: itemTotalSugar,
      totalIce: itemTotalIce,
      totalCoffee: itemTotalCoffee,
      totalTea: itemTotalTea,
    });
  }

  return {
    totalSugarGrams: Math.round(totalSugarGrams * 10) / 10,
    totalIceGrams: Math.round(totalIceGrams * 10) / 10,
    totalCoffeeGrams: Math.round(totalCoffeeGrams * 10) / 10,
    totalTeaGrams: Math.round(totalTeaGrams * 10) / 10,
    itemDetails,
  };
}
