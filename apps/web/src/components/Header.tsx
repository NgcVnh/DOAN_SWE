'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coffee, ClipboardList, LogOut } from 'lucide-react';
import { CartBadge } from './CartBadge';
import { clearAuthData, getStoredUser, User } from '@/lib/auth';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const isMenuPage = pathname === '/' || pathname?.startsWith('/products');
  const isOrdersPage = pathname?.startsWith('/orders');

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(getStoredUser());
    };
    handleAuthChange();
    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [pathname]);

  const handleLogout = () => {
    clearAuthData();
    setCurrentUser(null);
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-amber-100 shadow-sm">
      <div className="max-w-md mx-auto md:max-w-4xl lg:max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-amber-900 font-bold text-xl tracking-tight">
          <div className="bg-amber-600 text-white p-2 rounded-xl shadow-sm">
            <Coffee className="w-5 h-5" />
          </div>
          <span>Brew<span className="text-amber-600">Lite</span></span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
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

          <div className="h-5 w-px bg-stone-200 hidden sm:block" />

          {currentUser ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="hidden md:inline text-stone-700 font-medium">
                {currentUser.fullName || currentUser.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                title="Đăng xuất"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-red-50 hover:text-red-600 text-stone-600 font-medium transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white shadow-xs transition"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
