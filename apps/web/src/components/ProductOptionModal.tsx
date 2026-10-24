'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';
import { X, Plus, Minus, Check, Coffee, Sparkles } from 'lucide-react';
import {
  ProductDetailItem,
  ProductSize,
  SweetnessLevel,
  IceLevel,
  ToppingOption,
} from '../types/product';
import {
  COFFEE_TOPPINGS,
  SIZE_PRICES,
  SWEETNESS_OPTIONS,
  ICE_OPTIONS,
  calculateCustomizedPrice,
} from '../data/coffeeProducts';
import { useCartStore } from '../store/useCartStore';

interface ProductOptionModalProps {
  product: ProductDetailItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductOptionModal: React.FC<ProductOptionModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const { addToCart } = useCartStore();

  // State tùy biến
  const [size, setSize] = useState<ProductSize>('M');
  const [sweetness, setSweetness] = useState<SweetnessLevel>('100%');
  const [ice, setIce] = useState<IceLevel>('Bình thường');
  const [selectedToppings, setSelectedToppings] = useState<ToppingOption[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [specialNote, setSpecialNote] = useState<string>('');
  const [addedToast, setAddedToast] = useState<boolean>(false);

  // Tính toán giá real-time
  const pricing = useMemo(() => {
    if (!product) return null;
    return calculateCustomizedPrice(product.price, size, selectedToppings, quantity);
  }, [product, size, selectedToppings, quantity]);

  if (!isOpen || !product || !pricing) return null;

  // Xử lý chọn/bỏ topping
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

  // Xử lý thêm vào giỏ hàng
  const handleAddToCart = async () => {
    // Bắt buộc phải đăng ký / đăng nhập thì mới được thêm vào giỏ
    const currentUser = getStoredUser();
    if (!currentUser) {
      onClose();
      router.push(
        `/login?redirect=${encodeURIComponent(`/products/${product.id}`)}&notice=${encodeURIComponent(
          'Vui lòng đăng ký hoặc đăng nhập tài khoản để thêm món vào giỏ hàng!',
        )}`,
      );
      return;
    }

    await addToCart({
      productId: product.id,
      size,
      qty: quantity,
      toppings: selectedToppings,
    });

    setAddedToast(true);
    setTimeout(() => {
      setAddedToast(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header - Đồng bộ font theo Cart Header */}
        <div className="relative border-b border-stone-100 p-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-800">
              <Coffee className="w-5 h-5" />
            </span>
            <h2 className="font-semibold text-stone-900 text-lg">Tùy biến món</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-1 rounded-full hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1">
          {/* Thông tin món cơ bản */}
          <div className="flex gap-3.5 items-start bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-16 h-16 object-cover rounded-xl shadow-xs flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                {product.category}
              </span>
              <h3 className="font-semibold text-stone-900 text-sm mt-1 truncate">
                {product.name}
              </h3>
              <p className="text-xs text-stone-500 line-clamp-2 mt-0.5">
                {product.description}
              </p>
              <p className="text-sm font-bold text-amber-900 mt-1">
                {product.price.toLocaleString('vi-VN')} đ
              </p>
            </div>
          </div>

          {/* 1. Chọn Size (FR2.1) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-stone-100">
              <label className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                <span>Chọn kích cỡ ly</span>
                <span className="text-rose-500">*</span>
              </label>
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
          <div className="space-y-3 pt-1 border-t border-stone-100">
            {/* Lượng đường */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-stone-600">
                <span className="font-medium">Lượng đường</span>
                <span className="text-amber-800 font-semibold">{sweetness}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SWEETNESS_OPTIONS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSweetness(level)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
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

            {/* Lượng đá */}
            <div className="space-y-1.5 pt-2 border-t border-stone-50">
              <div className="flex justify-between text-xs text-stone-600">
                <span className="font-medium">Lượng đá</span>
                <span className="text-amber-800 font-semibold">{ice}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ICE_OPTIONS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setIce(level)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
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
          <div className="space-y-2.5 pt-1 border-t border-stone-100">
            <div className="flex items-center justify-between pb-1 border-b border-stone-100">
              <label className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                <span>Thêm Topping</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </label>
              <span className="text-xs text-stone-500">
                Đã chọn: <strong className="text-amber-800 font-semibold">{selectedToppings.length}</strong>
              </span>
            </div>

            <div className="space-y-2">
              {COFFEE_TOPPINGS.map((topping) => {
                const isChecked = selectedToppings.some((t) => t.id === topping.id);
                return (
                  <label
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
                  </label>
                );
              })}
            </div>
          </div>

          {/* Ghi chú thêm cho quán */}
          <div className="space-y-1.5 pt-1 border-t border-stone-100">
            <label className="text-xs font-semibold text-stone-900">
              Ghi chú cho Barista
            </label>
            <input
              type="text"
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value)}
              placeholder="Ví dụ: Ít ngọt, ly giấy mang đi..."
              className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-600 bg-stone-50"
            />
          </div>

          {/* Bảng tính giá real-time chi tiết (FR2.4) */}
          <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-100 space-y-2 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Giá gốc món</span>
              <span>{pricing.basePrice.toLocaleString('vi-VN')} đ</span>
            </div>
            {pricing.sizePrice > 0 && (
              <div className="flex justify-between">
                <span>Phụ phí Size {size}</span>
                <span className="text-amber-800 font-medium">
                  +{pricing.sizePrice.toLocaleString('vi-VN')} đ
                </span>
              </div>
            )}
            {pricing.toppingsTotal > 0 && (
              <div className="flex justify-between">
                <span>Topping ({selectedToppings.length} loại)</span>
                <span className="text-amber-800 font-medium">
                  +{pricing.toppingsTotal.toLocaleString('vi-VN')} đ
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-stone-900 pt-1.5 border-t border-stone-200">
              <span>Đơn vị 1 ly</span>
              <span className="text-amber-900 font-bold">
                {pricing.unitPrice.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer: Đồng bộ style bộ chọn số lượng và nút bấm của cart/page.tsx */}
        <div className="p-4 border-t border-stone-100 bg-white space-y-3">
          {addedToast && (
            <div className="bg-emerald-600 text-white text-xs font-semibold py-2 px-3 rounded-xl text-center flex items-center justify-center gap-1.5 animate-fadeIn">
              <Check className="w-4 h-4" />
              Đã thêm vào giỏ hàng thành công!
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Bộ tăng/giảm số lượng */}
            <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50 h-11">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-1 px-3 text-stone-600 hover:bg-stone-200 transition h-full flex items-center justify-center"
                aria-label="Giảm số lượng"
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
                aria-label="Tăng số lượng"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Nút thêm vào giỏ hàng hiển thị tổng tiền real-time */}
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 bg-amber-700 hover:bg-amber-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition active:scale-95 flex items-center justify-between text-sm"
            >
              <span>Thêm vào giỏ</span>
              <span className="font-bold text-amber-100">
                {pricing.lineTotal.toLocaleString('vi-VN')} đ
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
