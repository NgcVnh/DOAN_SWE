'use client';

import React from 'react';
import Link from 'next/link';
import { Coffee } from 'lucide-react';
import { CartBadge } from './CartBadge';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-amber-100 shadow-sm">
      <div className="max-w-md mx-auto md:max-w-4xl lg:max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-amber-900 font-bold text-xl tracking-tight">
          <div className="bg-amber-600 text-white p-2 rounded-xl shadow-sm">
            <Coffee className="w-5 h-5" />
          </div>
          <span>Brew<span className="text-amber-600">Lite</span></span>
        </Link>

        <nav className="flex items-center gap-5">
          <Link
            href="/"
            className="text-sm font-medium text-stone-600 hover:text-amber-700 transition"
          >
            Thực đơn
          </Link>
          <CartBadge />
        </nav>
      </div>
    </header>
  );
};
