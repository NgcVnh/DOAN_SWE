'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '../components/Header';
import { Coffee, ArrowRight, RefreshCw, AlertCircle, ShoppingBag } from 'lucide-react';
import { clearAuthData, getStoredUser, User } from '@/lib/auth';

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  description?: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Task 3: Next.js gọi trực tiếp endpoint /products của Backend Task 2
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/products`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Máy chủ phản hồi mã lỗi HTTP ${res.status}`);
      }
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Không thể kết nối đến máy chủ Backend (Port 3001)';
      setError(`Lỗi gọi API: ${message}. Vui lòng kiểm tra backend (npm run dev:api).`);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Kiểm tra trạng thái đăng nhập từ localStorage
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
    }

    // Lấy danh sách sản phẩm
    fetchProducts();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const handleLogout = () => {
    clearAuthData();
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col">
      <Header />

      {/* Khối tài khoản: đăng nhập / đăng ký / user hiện tại */}
      <div className="max-w-md mx-auto md:max-w-4xl lg:max-w-6xl w-full px-4 pt-4 flex justify-end">
        {currentUser ? (
          <div className="flex items-center gap-3 bg-white border border-stone-200 px-3.5 py-1.5 rounded-xl text-xs shadow-sm">
            <div>
              <span className="text-stone-500">Xin chào, </span>
              <span className="font-bold text-amber-700">{currentUser.fullName || currentUser.email}</span>
              <span className="ml-2 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                {currentUser.loyaltyPoints} điểm
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 transition font-medium"
            >
              Đăng xuất
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold border border-stone-200 transition shadow-sm"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition shadow-sm"
            >
              Đăng ký
            </Link>
          </div>
        )}
      </div>

      <main className="max-w-md mx-auto md:max-w-4xl lg:max-w-6xl px-4 py-8 flex-1 w-full">
        {/* Tiêu đề & Nút tải lại */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-amber-950 flex items-center gap-2">
              <Coffee className="w-7 h-7 text-amber-600" />
              <span>Thực đơn sản phẩm</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
            
            </p>
          </div>

          <button
            onClick={fetchProducts}
            disabled={loading}
            title="Tải lại thực đơn"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-700 hover:text-amber-700 hover:bg-stone-50 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            <span>Tải lại</span>
          </button>
        </div>

        {/* Thông báo lỗi khi không gọi được Backend */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs sm:text-sm text-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Lỗi tải danh sách món</p>
              <p className="mt-0.5 text-xs text-red-700">{error}</p>
            </div>
            <button
              onClick={fetchProducts}
              className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* 1. Trạng thái Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-stone-200 animate-pulse space-y-3">
                <div className="h-48 bg-stone-200 rounded-xl" />
                <div className="h-4 bg-stone-200 rounded w-3/4" />
                <div className="h-4 bg-stone-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* 2. Trạng thái Trống */}
        {!loading && !error && products.length === 0 && (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center shadow-sm my-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-3">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-stone-800">Chưa có sản phẩm nào</h3>
            <p className="mt-1 text-xs text-stone-500">
              Hiện tại danh mục sản phẩm từ backend đang trống. Hãy chạy lệnh seed dữ liệu:
              <br />
              <code className="mt-2 inline-block px-2 py-1 bg-stone-100 rounded text-amber-800 font-mono text-[11px]">
                npm run db:seed
              </code>
            </p>
            <button
              onClick={fetchProducts}
              className="mt-5 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 transition"
            >
              Làm mới danh sách
            </button>
          </div>
        )}

        {/* 3. Lưới sản phẩm */}
        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <article
                key={product.id}
                className="group flex flex-col bg-white rounded-2xl border border-stone-200/90 shadow-sm hover:shadow-md hover:border-amber-300 transition overflow-hidden"
              >
                <div className="relative h-48 w-full overflow-hidden bg-stone-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                  <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-md">
                    #{product.id}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-stone-900 text-base group-hover:text-amber-700 transition line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                      {product.description || 'Thức uống được pha chế tỉ mỉ từ nguyên liệu tươi nguyên chất.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-stone-400 block">Giá</span>
                      <span className="text-base font-bold text-amber-700">
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    <Link
                      href={`/products/${product.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition"
                    >
                      <span>Tùy chọn</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500">
        BrewLite Monorepo &copy; 2026 — Đồ án môn Kỹ thuật phần mềm (SWE)
      </footer>
    </div>
  );
}
