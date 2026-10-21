'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';

export const CartBadge: React.FC = () => {
  const { badgeCount, fetchCart } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return (
    <Link
      href="/cart"
      className="relative flex items-center justify-center p-2 rounded-full hover:bg-amber-100 transition text-amber-900"
      aria-label="Xem giỏ hàng"
    >
      <ShoppingBag className="w-6 h-6" />
      {badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center animate-bounce shadow">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </Link>
  );
};
