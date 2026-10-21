'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const productId = Number(resolvedParams.id);

  const product = useMemo(() => {
    return (
      COFFEE_PRODUCTS.find((p) => p.id === productId) || COFFEE_PRODUCTS[0]
    );
  }, [productId]);

  const { addToCart } = useCartStore();

  const [size, setSize] = useState<ProductSize>('M');
  const [sweetness, setSweetness] = useState<SweetnessLevel>('100%');
  const [ice, setIce] = useState<IceLevel>('Bình thường');
  const [selectedToppings, setSelectedToppings] = useState<ToppingOption[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [specialNote, setSpecialNote] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const pricing = useMemo(() => {
    return calculateCustomizedPrice(product.price, size, selectedToppings, quantity);
  }, [product.price, size, selectedToppings, quantity]);

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
    setIsAdding(true);
    await addToCart({
      productId: product.id,
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

  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      {/* Top Header - Đồng bộ chuẩn theo Header của CartPage */}
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

      {/* Main Container - Mobile Centered */}
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Toast Feedback */}
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
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-amber-900 text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-xs">
              {product.category}
            </span>
            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur text-white text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{product.rating || 4.9}</span>
              <span className="text-stone-300 text-[11px]">({product.reviewsCount || 100}+)</span>
            </div>
          </div>

          <div className="p-4 space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-stone-900 text-lg leading-snug">
                {product.name}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-100 flex-shrink-0">
                Còn hàng
              </span>
            </div>
            <p className="font-bold text-amber-900 text-lg">
              {product.price.toLocaleString('vi-VN')} đ
            </p>
            <p className="text-xs text-stone-500 leading-relaxed pt-1">
              {product.description}
            </p>
          </div>
        </div>

        {/* 1. Chọn Size (FR2.1) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900 text-sm flex items-center gap-1.5">
              <Coffee className="w-4 h-4 text-amber-700" />
              <span>Chọn kích cỡ ly</span>
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

        {/* 2. Chọn Mức đường & Mức đá (FR2.2) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 space-y-3.5">
          <h3 className="font-semibold text-stone-900 text-sm pb-1 border-b border-stone-100">
            Tùy chỉnh khẩu vị
          </h3>

          {/* Đường */}
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

          {/* Đá */}
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

        {/* 3. Chọn Topping (FR2.3) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Thêm Topping</span>
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

        {/* Ghi chú thêm cho Barista */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 space-y-2">
          <h3 className="font-semibold text-stone-900 text-xs">
            Ghi chú cho Barista
          </h3>
          <input
            type="text"
            value={specialNote}
            onChange={(e) => setSpecialNote(e.target.value)}
            placeholder="Ví dụ: Ít ngọt, ly giấy mang đi..."
            className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-600 bg-stone-50"
          />
        </div>

        {/* Bảng Chi Tiết Thanh Toán Real-Time (FR2.4) - Đồng bộ style Chi tiết thanh toán của cart/page.tsx */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 space-y-2.5 text-xs text-stone-600">
          <h3 className="font-semibold text-stone-900 pb-1 border-b border-stone-100 text-sm">
            Chi tiết tính giá tức thời
          </h3>
          <div className="flex justify-between">
            <span>Giá gốc món</span>
            <span>{pricing.basePrice.toLocaleString('vi-VN')} đ</span>
          </div>
          <div className="flex justify-between">
            <span>Phụ phí Size {size}</span>
            <span className="text-amber-800 font-medium">
              +{pricing.sizePrice.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="flex justify-between">
            <span>Topping ({selectedToppings.length} loại)</span>
            <span className="text-amber-800 font-medium">
              +{pricing.toppingsTotal.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="flex justify-between font-semibold text-stone-900 pt-2 border-t border-stone-100 text-xs">
            <span>Đơn vị 1 ly</span>
            <span className="text-amber-900 font-bold">
              {pricing.unitPrice.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="flex justify-between font-semibold text-stone-900 text-xs">
            <span>Số lượng</span>
            <span className="text-stone-800">x {pricing.quantity}</span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Checkout Bar (Mobile-First) - Đồng bộ 100% với Bar ở CartPage */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-stone-200 p-4 shadow-lg z-50">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          {/* Bộ tăng/giảm số lượng */}
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

          {/* Nút Thêm vào giỏ với tổng tiền real-time */}
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
