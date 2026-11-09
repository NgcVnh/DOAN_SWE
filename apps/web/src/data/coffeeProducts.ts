import {
  ProductDetailItem,
  ToppingOption,
  ProductSize,
  SweetnessLevel,
  IceLevel,
  PriceBreakdown,
} from '../types/product';

export const SIZE_PRICES: Record<ProductSize, number> = {
  S: 0,
  M: 6000,
  L: 10000,
};

export const SWEETNESS_OPTIONS: SweetnessLevel[] = ['0%', '30%', '50%', '70%', '100%'];

export const ICE_OPTIONS: IceLevel[] = ['Không đá', 'Ít đá', 'Bình thường'];
// Định mức đường và đá chuẩn theo size (đơn vị: gram)
export const SIZE_STANDARDS: Record<ProductSize, { sugar: number; ice: number }> = {
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

// Bảng định mức Recipe chuẩn theo mã món và size
export const RECIPE_STANDARDS: Record<RecipeCode, Record<ProductSize, RecipeItem>> = {
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

export function getRecipeItem(nameOrId: string | number | null | undefined, size: ProductSize): RecipeItem {
  const code = getProductRecipeCode(nameOrId);
  const standards = RECIPE_STANDARDS[code] || RECIPE_STANDARDS.DEFAULT_COFFEE;
  return standards[size] || standards.M;
}

// Định mức nguyên liệu cốt: Cà phê và Trà theo từng size (đơn vị: gram)
export const BASE_INGREDIENT_STANDARDS: Record<ProductSize, { coffee: number; tea: number }> = {
  S: { coffee: 16, tea: 10 },
  M: { coffee: 20, tea: 15 },
  L: { coffee: 25, tea: 20 },
};


// Hệ số mức đường
export const SWEETNESS_FACTORS: Record<SweetnessLevel, number> = {
  '0%': 0.0,
  '30%': 0.3,
  '50%': 0.5,
  '70%': 0.7,
  '100%': 1.0,
};

// Hệ số mức đá

/**
 * Phân loại sản phẩm dựa trên tên hoặc ID để xác định dùng nguyên liệu cốt Cà phê hay Trà
 */
export function getProductBaseType(nameOrId?: string | number | null): 'COFFEE' | 'TEA' | 'NONE' {
  if (!nameOrId) return 'COFFEE';
  const str = String(nameOrId).toLowerCase().trim();

  if (
    str.includes('trà') ||
    str.includes('tea') ||
    str.includes('oolong') ||
    str.includes('ô long') ||
    str.includes('đào cam sả')
  ) {
    return 'TEA';
  }

  return 'COFFEE';
}

export const ICE_FACTORS: Record<IceLevel, number> = {
  'Không đá': 0.0,
  'Ít đá': 0.5,
  'Bình thường': 1.0,
};


export const COFFEE_TOPPINGS: ToppingOption[] = [
  { id: 1, name: 'Trân châu đen', price: 10000, stock: 15, isAvailable: true },
  { id: 2, name: 'Trân châu trắng', price: 10000, stock: 0, isAvailable: false },
  { id: 3, name: 'Kem Cheese', price: 12000, stock: 8, isAvailable: true },
  { id: 4, name: 'Thạch nha đam', price: 8000, stock: 20, isAvailable: true },
];

export const COFFEE_PRODUCTS: ProductDetailItem[] = [
  {
    id: 1,
    name: 'Cà phê sữa đá',
    category: 'Cà phê',
    description: 'Cà phê Robusta đậm đà kết hợp sữa đặc ngọt béo truyền thống của người Việt, mang lại hương vị tỉnh táo sảng khoái.',
    price: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
    stock: 50,
    isAvailable: true,
    rating: 4.9,
    reviewsCount: 128,
  },
  {
    id: 2,
    name: 'Americano',
    category: 'Cà phê',
    description: 'Espresso nguyên chất pha loãng với nước ấm hoặc đá, mang hương vị thanh tao, dịu nhẹ và hậu vị ngọt sâu.',
    price: 40000,
    imageUrl: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=600&auto=format&fit=crop&q=80',
    stock: 50,
    isAvailable: true,
    rating: 4.7,
    reviewsCount: 85,
  },
  {
    id: 3,
    name: 'Cappuccino',
    category: 'Cà phê',
    description: 'Sự kết hợp hoàn hảo giữa Espresso, sữa nóng béo ngậy và lớp bọt sữa mịn màng, phủ chút bột cacao thơm lừng.',
    price: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80',
    stock: 40,
    isAvailable: true,
    rating: 4.8,
    reviewsCount: 96,
  },
  {
    id: 4,
    name: 'Trà đào cam sả',
    category: 'Trà trái cây',
    description: 'Trà thảo mộc thơm mát kết hợp vị ngọt thanh của miếng đào tươi giòn sần sật và hương cam sả thơm lừng sảng khoái.',
    price: 39000,
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
    stock: 60,
    isAvailable: true,
    rating: 4.9,
    reviewsCount: 154,
  },
  {
    id: 5,
    name: 'Trà sữa Oolong nướng',
    category: 'Trà sữa',
    description: 'Trà Oolong đậm vị khói rang nướng thủ công hòa quyện cùng vị sữa béo ngậy đặc trưng, thơm đậm đà tròn vị.',
    price: 42000,
    imageUrl: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=600&auto=format&fit=crop&q=80',
    stock: 35,
    isAvailable: true,
    rating: 4.9,
    reviewsCount: 210,
  },
];

export function calculateCustomizedPrice(
  basePrice: number,
  size: ProductSize,
  selectedToppings: ToppingOption[],
  quantity: number = 1,
): PriceBreakdown {
  const sizePrice = SIZE_PRICES[size] || 0;
  const toppingsTotal = selectedToppings.reduce((sum, topping) => sum + topping.price, 0);
  const unitPrice = basePrice + sizePrice + toppingsTotal;
  const validQty = Math.max(1, quantity);
  const lineTotal = unitPrice * validQty;

  return {
    basePrice,
    sizePrice,
    toppingsTotal,
    unitPrice,
    quantity: validQty,
    lineTotal,
  };
}
