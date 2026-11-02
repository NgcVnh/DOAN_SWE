import { ProductSize } from '@prisma/client';

export interface ConsumptionInput {
  size: ProductSize | 'S' | 'M' | 'L';
  sweetness?: string | null;
  ice?: string | null;
  qty: number;
}

export interface ConsumptionResult {
  totalSugarGrams: number;
  totalIceGrams: number;
  itemDetails: Array<{
    size: string;
    sweetness: string;
    ice: string;
    qty: number;
    sugarPerItem: number;
    icePerItem: number;
    totalSugar: number;
    totalIce: number;
  }>;
}

// Định mức tiêu chuẩn theo size (đường 100%, đá bình thường 100%)
export const SIZE_STANDARDS: Record<'S' | 'M' | 'L', { sugar: number; ice: number }> = {
  S: { sugar: 30, ice: 150 },
  M: { sugar: 35, ice: 200 },
  L: { sugar: 40, ice: 250 },
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
 * Tính toán tổng lượng tiêu thụ đường và đá theo công thức tổng quát:
 * sugarused = sugarstandarsize * sugarlevel
 * iceused = icestandersize * icelevel
 */
export function calculateSugarAndIceConsumption(
  items: ConsumptionInput[],
): ConsumptionResult {
  let totalSugarGrams = 0;
  let totalIceGrams = 0;
  const itemDetails: ConsumptionResult['itemDetails'] = [];

  for (const item of items) {
    const rawSize = (item.size || 'M') as 'S' | 'M' | 'L';
    const standard = SIZE_STANDARDS[rawSize] || SIZE_STANDARDS.M;

    const sweetnessKey = item.sweetness?.trim() || '100%';
    const iceKey = item.ice?.trim() || 'Bình thường';

    const sFactor = SWEETNESS_FACTORS[sweetnessKey] ?? 1.0;
    const iFactor = ICE_FACTORS[iceKey] ?? 1.0;

    const sugarPerItem = Math.round(standard.sugar * sFactor * 10) / 10;
    const icePerItem = Math.round(standard.ice * iFactor * 10) / 10;

    const quantity = Math.max(1, Number(item.qty || 1));
    const itemTotalSugar = Math.round(sugarPerItem * quantity * 10) / 10;
    const itemTotalIce = Math.round(icePerItem * quantity * 10) / 10;

    totalSugarGrams += itemTotalSugar;
    totalIceGrams += itemTotalIce;

    itemDetails.push({
      size: rawSize,
      sweetness: sweetnessKey,
      ice: iceKey,
      qty: quantity,
      sugarPerItem,
      icePerItem,
      totalSugar: itemTotalSugar,
      totalIce: itemTotalIce,
    });
  }

  return {
    totalSugarGrams: Math.round(totalSugarGrams * 10) / 10,
    totalIceGrams: Math.round(totalIceGrams * 10) / 10,
    itemDetails,
  };
}

