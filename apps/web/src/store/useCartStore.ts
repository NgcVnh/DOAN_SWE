import { create } from 'zustand';

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

interface CartState {
  items: CartItem[];
  totalAmount: number;
  badgeCount: number;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addToCart: (payload: { productId: number; size: 'S' | 'M' | 'L'; qty: number; toppings?: any[] }) => Promise<void>;
  updateQty: (cartItemId: number, qty: number) => Promise<void>;
  removeItem: (cartItemId: number) => Promise<void>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  totalAmount: 0,
  badgeCount: 0,
  isLoading: false,

  // Lấy dữ liệu giỏ hàng mới nhất từ Backend (GET /cart)
  fetchCart: async () => {
    try {
      set({ isLoading: true });
      const res = await fetch(`${API_BASE}/cart`);
      const data = await res.json();
      set({
        items: data.items || [],
        totalAmount: data.totalAmount || 0,
        badgeCount: data.totalQuantity || data.totalItemsCount || 0,
        isLoading: false,
      });
    } catch (error) {
      console.error('Lỗi lấy giỏ hàng:', error);
      set({ isLoading: false });
    }
  },

  // Thêm món vào giỏ (POST /cart/items)
  addToCart: async (payload) => {
    await fetch(`${API_BASE}/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await get().fetchCart(); // Cập nhật lại giỏ và nhảy Badge ngay lập tức
  },

  // Cập nhật số lượng (PATCH /cart/items/:id)
  updateQty: async (cartItemId: number, qty: number) => {
    await fetch(`${API_BASE}/cart/items/${cartItemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty }),
    });
    await get().fetchCart();
  },

  // Xóa món khỏi giỏ (DELETE /cart/items/:id)
  removeItem: async (cartItemId: number) => {
    await fetch(`${API_BASE}/cart/items/${cartItemId}`, {
      method: 'DELETE',
    });
    await get().fetchCart();
  },
}));