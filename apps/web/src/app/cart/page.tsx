'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, Coffee } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';

export default function CartPage() {
  const { items, totalAmount, isLoading, fetchCart, updateQty, removeItem } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      {/* Top Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-stone-100 text-stone-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold text-lg text-stone-900">Giỏ hàng của bạn</h1>
        <div className="w-9" />
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="py-20 text-center text-stone-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-600 border-t-transparent" />
            <p className="mt-2 text-sm">Đang tải giỏ hàng...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-700">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-stone-800">Giỏ hàng đang trống</h2>
              <p className="text-sm text-stone-500">Hãy thêm những món đồ uống thơm ngon từ BrewLite nhé!</p>
            </div>
            <Link
              href="/"
              className="inline-block bg-amber-700 text-white font-medium px-6 py-2.5 rounded-xl shadow-sm hover:bg-amber-800 transition"
            >
              Khám phá thực đơn
            </Link>
          </div>
        ) : (
          <>
            {/* List Cart Items (Task 5: Thêm / Sửa số lượng / Xóa) */}
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex gap-3 relative"
                >
                  <div className="w-16 h-16 bg-amber-50 rounded-xl flex items-center justify-center text-amber-800 flex-shrink-0">
                    <Coffee className="w-8 h-8" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-stone-900 text-sm truncate pr-6">{item.name}</h3>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-stone-400 hover:text-red-500 transition p-1 absolute top-3 right-3"
                        title="Xóa món"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs text-stone-500 mt-0.5 space-y-0.5">
                      <p>Kích cỡ: <span className="font-medium text-stone-700">Size {item.size}</span></p>
                      {item.toppings && item.toppings.length > 0 && (
                        <p>Topping: {item.toppings.map((t) => t.name).join(', ')}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-50">
                      <span className="font-bold text-amber-900 text-sm">
                        {(item.lineTotal || item.unitPrice * item.qty).toLocaleString('vi-VN')} đ
                      </span>

                      {/* Nút tăng/giảm số lượng */}
                      <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
                        <button
                          onClick={() => {
                            if (item.qty > 1) {
                              updateQty(item.id, item.qty - 1);
                            } else {
                              removeItem(item.id);
                            }
                          }}
                          className="p-1 px-2 text-stone-600 hover:bg-stone-200 transition"
                          title="Giảm số lượng"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold text-stone-800">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          className="p-1 px-2 text-stone-600 hover:bg-stone-200 transition"
                          title="Tăng số lượng"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Summary: Tự tính tổng tiền (Task 5) */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 space-y-2.5 text-sm">
              <h3 className="font-semibold text-stone-900 pb-1 border-b border-stone-100">Chi tiết thanh toán</h3>
              <div className="flex justify-between text-stone-600">
                <span>Tạm tính ({items.reduce((acc, i) => acc + i.qty, 0)} món)</span>
                <span>{totalAmount.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Phí dịch vụ</span>
                <span className="text-emerald-600 font-medium">Miễn phí</span>
              </div>
              <div className="flex justify-between font-bold text-base text-stone-900 pt-2 border-t border-stone-100">
                <span>Tổng thanh toán</span>
                <span className="text-amber-800">{totalAmount.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sticky Bottom Bar chuyển sang thanh toán (Task 8 & 9) */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-stone-200 p-4 shadow-lg z-50">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-stone-500">Tổng thanh toán</p>
              <p className="font-extrabold text-lg text-amber-900">
                {totalAmount.toLocaleString('vi-VN')} đ
              </p>
            </div>
            <Link
              href="/checkout"
              className="flex-1 bg-amber-700 hover:bg-amber-800 text-white font-semibold py-3 px-6 rounded-xl shadow-md transition active:scale-95 text-center"
            >
              Tiến hành Thanh toán
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
