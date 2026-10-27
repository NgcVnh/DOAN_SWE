import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { COFFEE_PRODUCTS, SIZE_PRICES } from '../data/coffeeProducts';

export interface CartItem {
  id: number;
  productId: number;
  name: string;
  size: 'S' | 'M' | 'L';
  toppings: Array<{ id: number; name: string; price: number }>;
  unitPrice: number;
  qty: number;
  lineTotal: number;
}

export interface AddToCartPayload {
  productId: number;
  name?: string;
  unitPrice?: number;
  size: 'S' | 'M' | 'L';
  qty: number;
  toppings?: Array<{ id: number; name: string; price: number }>;
}

interface CartState {
  items: CartItem[];
  totalAmount: number;
  badgeCount: number;
  isLoading: boolean;
  fetchCart: () => void;
  addToCart: (payload: AddToCartPayload) => void;
  updateQty: (cartItemId: number, qty: number) => void;
  removeItem: (cartItemId: number) => void;
  clearCart: () => void;
}

const computeTotals = (items: CartItem[]) => {
  const totalAmount = items.reduce(
    (sum, item) => sum + (item.lineTotal || item.unitPrice * item.qty),
    0,
  );
  const badgeCount = items.reduce((sum, item) => sum + item.qty, 0);
  return { totalAmount, badgeCount };
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totalAmount: 0,
      badgeCount: 0,
      isLoading: false,

      fetchCart: () => {
        const { totalAmount, badgeCount } = computeTotals(get().items);
        set({ totalAmount, badgeCount });
      },

      addToCart: (payload) => {
        const currentItems = get().items;
        const toppings = payload.toppings || [];

        const existingIndex = currentItems.findIndex(
          (item) =>
            item.productId === payload.productId &&
            item.size === payload.size &&
            JSON.stringify(item.toppings?.map((t) => t.id).sort()) ===
              JSON.stringify(toppings.map((t) => t.id).sort()),
        );

        let unitPrice = payload.unitPrice;
        let name = payload.name;

        if (!unitPrice || !name) {
          const product = COFFEE_PRODUCTS.find((p) => p.id === payload.productId);
          name = name || product?.name || `Sản phẩm #${payload.productId}`;
          const basePrice = product?.price || 35000;
          const sizePrice = SIZE_PRICES[payload.size] || 0;
          const toppingsPrice = toppings.reduce((sum, t) => sum + t.price, 0);
          unitPrice = unitPrice || basePrice + sizePrice + toppingsPrice;
        }

        let updatedItems: CartItem[];

        if (existingIndex > -1) {
          updatedItems = currentItems.map((item, index) => {
            if (index === existingIndex) {
              const newQty = item.qty + payload.qty;
              return {
                ...item,
                qty: newQty,
                lineTotal: item.unitPrice * newQty,
              };
            }
            return item;
          });
        } else {
          const newItem: CartItem = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            productId: payload.productId,
            name,
            size: payload.size,
            toppings,
            unitPrice,
            qty: payload.qty,
            lineTotal: unitPrice * payload.qty,
          };
          updatedItems = [...currentItems, newItem];
        }

        const { totalAmount, badgeCount } = computeTotals(updatedItems);
        set({ items: updatedItems, totalAmount, badgeCount });
      },

      updateQty: (cartItemId, qty) => {
        if (qty <= 0) {
          get().removeItem(cartItemId);
          return;
        }

        const updatedItems = get().items.map((item) =>
          item.id === cartItemId
            ? {
                ...item,
                qty,
                lineTotal: item.unitPrice * qty,
              }
            : item,
        );

        const { totalAmount, badgeCount } = computeTotals(updatedItems);
        set({ items: updatedItems, totalAmount, badgeCount });
      },

      removeItem: (cartItemId) => {
        const updatedItems = get().items.filter((item) => item.id !== cartItemId);
        const { totalAmount, badgeCount } = computeTotals(updatedItems);
        set({ items: updatedItems, totalAmount, badgeCount });
      },

      clearCart: () => {
        set({ items: [], totalAmount: 0, badgeCount: 0 });
      },
    }),
    {
      name: 'brewlite-cart-storage',
    },
  ),
);
