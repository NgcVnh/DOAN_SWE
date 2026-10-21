export type ProductSize = 'S' | 'M' | 'L';
export type SweetnessLevel = '0%' | '30%' | '50%' | '70%' | '100%';
export type IceLevel = 'Không đá' | 'Ít đá' | 'Bình thường';

export interface ToppingOption {
  id: number;
  name: string;
  price: number;
  isAvailable?: boolean;
}

export interface ProductDetailItem {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  stock?: number;
  isAvailable?: boolean;
  rating?: number;
  reviewsCount?: number;
}

export interface CustomizationSelection {
  size: ProductSize;
  sweetness: SweetnessLevel;
  ice: IceLevel;
  selectedToppings: ToppingOption[];
  quantity: number;
  specialNote?: string;
}

export interface PriceBreakdown {
  basePrice: number;
  sizePrice: number;
  toppingsTotal: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}
