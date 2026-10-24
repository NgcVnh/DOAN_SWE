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

export const COFFEE_TOPPINGS: ToppingOption[] = [
  { id: 1, name: 'Trân châu đen', price: 10000, isAvailable: true },
  { id: 2, name: 'Trân châu trắng', price: 10000, isAvailable: true },
  { id: 3, name: 'Kem Cheese', price: 12000, isAvailable: true },
  { id: 4, name: 'Thạch nha đam', price: 8000, isAvailable: true },
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
