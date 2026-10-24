'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coffee, ClipboardList } from 'lucide-react';
import { CartBadge } from './CartBadge';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const isMenuPage = pathname === '/' || pathname?.startsWith('/products');
  const isOrdersPage = pathname?.startsWith('/orders');

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-amber-100 shadow-sm">
      <div className="max-w-md mx-auto md:max-w-4xl lg:max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-amber-900 font-bold text-xl tracking-tight">
          <div className="bg-amber-600 text-white p-2 rounded-xl shadow-sm">
            <Coffee className="w-5 h-5" />
          </div>
          <span>Brew<span className="text-amber-600">Lite</span></span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/"
            className={`text-sm font-medium transition px-2.5 py-1.5 rounded-lg ${
              isMenuPage
                ? 'text-amber-800 bg-amber-50 font-semibold'
                : 'text-stone-600 hover:text-amber-700 hover:bg-stone-50'
            }`}
          >
            Thực đơn
          </Link>

          <Link
            href="/orders"
            className={`inline-flex items-center gap-1.5 text-sm font-medium transition px-2.5 py-1.5 rounded-lg ${
              isOrdersPage
                ? 'text-amber-800 bg-amber-50 font-semibold'
                : 'text-stone-600 hover:text-amber-700 hover:bg-stone-50'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Lịch sử đơn</span>
          </Link>

          <CartBadge />
        </nav>
      </div>
    </header>
  );
};
