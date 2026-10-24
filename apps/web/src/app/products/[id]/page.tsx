'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Minus,
  Check,
  Coffee,
  Sparkles,
} from 'lucide-react';
import {
  ProductSize,
  SweetnessLevel,
  IceLevel,
  ToppingOption,
  ProductDetailItem,
} from '../../../types/product';
import {
  COFFEE_PRODUCTS,
  COFFEE_TOPPINGS,
  SIZE_PRICES,
  SWEETNESS_OPTIONS,
  ICE_OPTIONS,
  calculateCustomizedPrice,
} from '../../../data/coffeeProducts';
import { useCartStore } from '../../../store/useCartStore';
import { CartBadge } from '../../../components/CartBadge';
import { getStoredUser } from '@/lib/auth';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const productId = Number(resolvedParams.id);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const [loading, setLoading] = useState<boolean>(true);
  const [product, setProduct] = useState<ProductDetailItem | null>(null);

  // Lấy dữ liệu sản phẩm từ API Backend Task 2 (GET /products)
  useEffect(() => {
    let isMounted = true;
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/products`, { cache: 'no-store' });
        if (res.ok) {
          const list = await res.json();
          const found = list.find((p: { id: number; name: string; price: number; image: string; description?: string }) => Number(p.id) === productId);
          if (found && isMounted) {
            setProduct({
              id: found.id,
              name: found.name,
              price: found.price,
              imageUrl: found.image,
              description: found.description || 'Thức uống thơm ngon được pha chế tỉ mỉ từ nguyên liệu tươi nguyên chất.',
              category: 'Đồ uống',
            });
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Không thể tải từ backend, dùng fallback:', err);
      }

      if (isMounted) {
        const fallback = COFFEE_PRODUCTS.find((p) => p.id === productId) || COFFEE_PRODUCTS[0];
        setProduct(fallback);
        setLoading(false);
      }
    };

    fetchProduct();
    return () => {
      isMounted = false;
    };
  }, [apiUrl, productId]);

  const { addToCart } = useCartStore();

  // State tùy chọn theo Task 4: Size (S/M/L) và Topping
  const [size, setSize] = useState<ProductSize>('M');
  const [selectedToppings, setSelectedToppings] = useState<ToppingOption[]>([]);
  const [sweetness, setSweetness] = useState<SweetnessLevel>('100%');
  const [ice, setIce] = useState<IceLevel>('Bình thường');
  const [quantity, setQuantity] = useState<number>(1);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // Tính giá theo tùy chọn thời gian thực (Real-time pricing)
  const currentPrice = product?.price || 35000;
  const pricing = useMemo(() => {
    return calculateCustomizedPrice(currentPrice, size, selectedToppings, quantity);
  }, [currentPrice, size, selectedToppings, quantity]);

  const handleToggleTopping = (topping: ToppingOption) => {
    setSelectedToppings((prev) => {
      const exists = prev.some((t) => t.id === topping.id);
      if (exists) {
        return prev.filter((t) => t.id !== topping.id);
      } else {
        return [...prev, topping];
      }
    });
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // Bắt buộc phải đăng nhập thì mới được thêm vào giỏ
    const currentUser = getStoredUser();
    if (!currentUser) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/products/${productId}`)}&notice=${encodeURIComponent(
          'Vui lòng đăng ký hoặc đăng nhập tài khoản để thêm món vào giỏ hàng!',
        )}`,
      );
      return;
    }
    setIsAdding(true);
    addToCart({
      productId: product.id,
      name: product.name,
      unitPrice: pricing.unitPrice,
      size,
      qty: quantity,
      toppings: selectedToppings,
    });
    setIsAdding(false);
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 2500);
  };

  if (loading || !product) {
    return (
      <div className="min-h-screen bg-stone-50 p-6 flex flex-col items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-600 border-t-transparent mb-3" />
        <p className="text-xs text-stone-500">Đang tải thông tin món...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      {/* Top Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-stone-100 text-stone-700 transition"
          aria-label="Quay lại"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="font-semibold text-lg text-stone-900 truncate max-w-[220px]">
          {product.name}
        </h1>

        <div className="flex items-center">
          <CartBadge />
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Toast thông báo đã thêm vào giỏ */}
        {showToast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
            <Check className="w-4 h-4" />
            <span>Đã thêm vào giỏ hàng thành công!</span>
            <Link href="/cart" className="underline font-bold ml-1">
              Xem giỏ
            </Link>
          </div>
        )}

        {/* Hero Image Card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100">
          <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-4 space-y-1.5">
            <h2 className="font-bold text-stone-900 text-lg leading-snug">
              {product.name}
            </h2>
            <p className="font-extrabold text-amber-800 text-lg">
              {product.price.toLocaleString('vi-VN')} đ
            </p>
            <p className="text-xs text-stone-500 leading-relaxed pt-1">
              {product.description}
            </p>
          </div>
        </div>

        {/* 1. Chọn Size (S/M/L) - Yêu cầu Task 4 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900 text-sm flex items-center gap-1.5">
              <Coffee className="w-4 h-4 text-amber-700" />
              <span>Chọn Size (S / M / L)</span>
            </h3>
            <span className="text-xs font-semibold text-amber-800">
              Size {size} (+{SIZE_PRICES[size].toLocaleString('vi-VN')} đ)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {(['S', 'M', 'L'] as ProductSize[]).map((s) => {
              const isSelected = size === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center relative ${
                    isSelected
                      ? 'border-amber-700 bg-amber-50/70 text-amber-950 ring-1 ring-amber-700/30'
                      : 'border-stone-200 hover:border-amber-200 text-stone-700 bg-stone-50/40'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-700 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                  <span className="font-semibold text-sm">Size {s}</span>
                  <span className="text-[11px] text-stone-500 mt-0.5">
                    {s === 'S' ? 'Nhỏ' : s === 'M' ? 'Vừa' : 'Lớn'}
                  </span>
                  <span className="text-xs font-bold text-amber-800 mt-1">
                    +{SIZE_PRICES[s].toLocaleString('vi-VN')} đ
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Chọn Topping - Yêu cầu Task 4 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Chọn Topping</span>
            </h3>
            <span className="text-xs text-stone-500">
              Đã chọn: <strong className="text-amber-800 font-semibold">{selectedToppings.length}</strong>
            </span>
          </div>

          <div className="space-y-2">
            {COFFEE_TOPPINGS.map((topping) => {
              const isChecked = selectedToppings.some((t) => t.id === topping.id);
              return (
                <div
                  key={topping.id}
                  onClick={() => handleToggleTopping(topping)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition select-none ${
                    isChecked
                      ? 'border-amber-700 bg-amber-50/60'
                      : 'border-stone-200 hover:bg-stone-50 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                        isChecked
                          ? 'bg-amber-700 border-amber-700 text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-medium text-stone-800">
                      {topping.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-amber-900">
                    +{topping.price.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Tùy chỉnh Độ ngọt & Lượng đá */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 space-y-3.5">
          <h3 className="font-semibold text-stone-900 text-sm pb-1 border-b border-stone-100">
            Tùy chỉnh khẩu vị
          </h3>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-stone-600">
              <span className="font-medium">Lượng đường</span>
              <span className="text-amber-800 font-semibold">{sweetness}</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {SWEETNESS_OPTIONS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSweetness(level)}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                    sweetness === level
                      ? 'bg-amber-700 text-white border-amber-700'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-stone-50">
            <div className="flex justify-between text-xs text-stone-600">
              <span className="font-medium">Lượng đá</span>
              <span className="text-amber-800 font-semibold">{ice}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ICE_OPTIONS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setIce(level)}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                    ice === level
                      ? 'bg-amber-700 text-white border-amber-700'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Bảng tính giá theo tùy chọn thời gian thực (Task 4) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 space-y-2.5 text-xs text-stone-600">
          <h3 className="font-semibold text-stone-900 pb-1 border-b border-stone-100 text-sm">
            Chi tiết tính giá theo tùy chọn
          </h3>
          <div className="flex justify-between">
            <span>Giá gốc sản phẩm</span>
            <span>{pricing.basePrice.toLocaleString('vi-VN')} đ</span>
          </div>
          <div className="flex justify-between">
            <span>Phụ phí Size ({size})</span>
            <span className="text-amber-800 font-medium">
              +{pricing.sizePrice.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="flex justify-between">
            <span>Topping ({selectedToppings.length} món)</span>
            <span className="text-amber-800 font-medium">
              +{pricing.toppingsTotal.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="flex justify-between font-semibold text-stone-900 pt-2 border-t border-stone-100 text-xs">
            <span>Đơn giá 1 ly</span>
            <span className="text-amber-900 font-bold">
              {pricing.unitPrice.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="flex justify-between font-semibold text-stone-900 text-xs">
            <span>Số lượng</span>
            <span className="text-stone-800">&times; {pricing.quantity}</span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar: Tăng/giảm số lượng & Thêm vào giỏ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-stone-200 p-4 shadow-lg z-50">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50 h-11">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="p-1 px-3 text-stone-600 hover:bg-stone-200 transition h-full flex items-center justify-center"
              aria-label="Giảm"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2.5 text-xs font-semibold text-stone-800 min-w-[28px] text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="p-1 px-3 text-stone-600 hover:bg-stone-200 transition h-full flex items-center justify-center"
              aria-label="Tăng"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAdding}
            className="flex-1 bg-amber-700 hover:bg-amber-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition active:scale-95 flex items-center justify-between text-sm disabled:opacity-50"
          >
            <span>{isAdding ? 'Đang thêm...' : 'Thêm vào giỏ'}</span>
            <span className="font-bold text-amber-100">
              {pricing.lineTotal.toLocaleString('vi-VN')} đ
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
