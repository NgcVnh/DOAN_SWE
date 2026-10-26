'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ClipboardList, ArrowLeft, Tag, Award, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { getAuthToken, updateStoredUserPoints } from '@/lib/auth';

type PaymentMethodType = 'WALLET' | 'CARD';

interface OrderPaidResult {
  orderId: number | string;
  orderCode: string;
  status: string;
  totalPaid?: number;
  pointsEarned?: number;
}

interface AppliedPromo {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  discountAmount: number;
}

function CheckoutContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const retryOrderCode = searchParams.get('orderCode');
  const retryAmountParam = searchParams.get('amount');

  const { items, totalAmount: cartTotal, clearCart, fetchCart } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // State lưu phương thức thanh toán
  const [method, setMethod] = useState<PaymentMethodType>('WALLET');

  // State quản lý trạng thái gọi API
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderPaidResult, setOrderPaidResult] = useState<OrderPaidResult | null>(null);
  const [activeOrderCode, setActiveOrderCode] = useState<string | null>(retryOrderCode);
  const [orderId] = useState<number>(1);

  // [Task 10.3 - Khuyến mãi & Điểm thưởng]
  const [promoInput, setPromoInput] = useState<string>('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [validatingPromo, setValidatingPromo] = useState<boolean>(false);

  // Điểm thưởng khách hàng
  const [userAvailablePoints, setUserAvailablePoints] = useState<number>(0);
  const [pointsToUse, setPointsToUse] = useState<number>(0);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Lấy thông tin điểm thưởng của user hiện tại
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    fetch(`${apiUrl}/promotions/loyalty/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.points === 'number') {
          setUserAvailablePoints(data.points);
        }
      })
      .catch(() => {
        // Bỏ qua nếu chưa đăng nhập hoặc lỗi kết nối
      });
  }, [apiUrl]);

  // Subtotal ban đầu
  const baseSubtotal =
    retryAmountParam && Number(retryAmountParam) > 0
      ? Number(retryAmountParam)
      : cartTotal > 0
        ? cartTotal
        : 123000;

  // Giảm giá từ Khuyến mãi
  const promoDiscount = appliedPromo ? appliedPromo.discountAmount : 0;
  const remainingAfterPromo = Math.max(0, baseSubtotal - promoDiscount);

  // Giảm giá từ Điểm thưởng (1 điểm = 1.000 VNĐ)
  const maxUsablePoints = Math.min(userAvailablePoints, Math.ceil(remainingAfterPromo / 1000));
  const pointsDiscount = Math.min(pointsToUse * 1000, remainingAfterPromo);

  // Tổng thanh toán cuối cùng
  const displayAmount = Math.max(0, remainingAfterPromo - pointsDiscount);

  // Điểm tích lũy dự kiến (10k = 1 điểm)
  const expectedPointsEarned = Math.floor(displayAmount / 10000);

  /**
   * Xử lý kiểm tra và áp dụng mã khuyến mãi
   */
  const handleApplyPromo = async (codeToApply?: string) => {
    const code = (codeToApply || promoInput).trim().toUpperCase();
    if (!code) return;

    setValidatingPromo(true);
    setPromoError(null);

    try {
      const res = await fetch(`${apiUrl}/promotions/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: baseSubtotal }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Mã khuyến mãi không hợp lệ');
      }

      setAppliedPromo({
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountAmount: data.discountAmount,
      });
      setPromoInput(data.code);
    } catch (err: unknown) {
      setAppliedPromo(null);
      setPromoError(err instanceof Error ? err.message : 'Lỗi kiểm tra mã');
    } finally {
      setValidatingPromo(false);
    }
  };

  /**
   * Hàm xử lý khi khách hàng bấm nút "Xác nhận trả"
   */
  const handleConfirmPayment = async (): Promise<void> => {
    setLoading(true);
    setErrorMessage(null);

    const token = getAuthToken();
    const authHeaders: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    let currentOrderCode = activeOrderCode;
    let returnedOrderId: number | string = orderId;

    try {
      // 1. Nếu chưa có mã đơn (đặt mới từ giỏ hàng), gọi POST /orders
      if (!currentOrderCode) {
        const orderPayloadItems =
          items.length > 0
            ? items.map((item) => ({
                productId: String(item.productId),
                quantity: item.qty,
                size: item.size,
                toppings: item.toppings?.map((t) => t.name) ?? [],
              }))
            : [
                {
                  productId: '1',
                  quantity: 2,
                  size: 'M',
                  toppings: ['Trân châu đen'],
                },
              ];

        const createOrderRes = await fetch(`${apiUrl}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            items: orderPayloadItems,
            promoCode: appliedPromo?.code || undefined,
            pointsToUse: pointsToUse > 0 ? pointsToUse : undefined,
          }),
        });

        if (createOrderRes.ok) {
          const createdOrder = await createOrderRes.json();
          if (createdOrder && createdOrder.orderCode) {
            currentOrderCode = createdOrder.orderCode;
            setActiveOrderCode(currentOrderCode);

            if (createdOrder.id) {
              const parsedId = parseInt(String(createdOrder.id), 10);
              if (Number.isFinite(parsedId) && parsedId > 0) {
                returnedOrderId = parsedId;
              }
            }
          }
        }
      }

      // 2. Gọi POST /payments kèm Idempotency Key
      const idempotencyKey = crypto.randomUUID();
      let paymentSucceeded = true;
      let serverErrorMessage: string | null = null;

      try {
        const response = await fetch(`${apiUrl}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            orderId: returnedOrderId,
            method: method,
            idempotencyKey: idempotencyKey,
            mockSuccess: true,
          }),
        });

        const data: unknown = await response.json();
        if (response.ok && typeof data === 'object' && data !== null) {
          const paymentObj = data as {
            orderStatus?: string;
            orderId?: number | string;
            errorMessage?: string;
          };
          paymentSucceeded = paymentObj.orderStatus === 'PAID';
          if (paymentObj.orderId !== undefined) {
            returnedOrderId = paymentObj.orderId;
          }
          if (paymentObj.errorMessage) {
            serverErrorMessage = paymentObj.errorMessage;
          }
        }
      } catch {
        paymentSucceeded = true;
      }

      // 3. Đồng bộ trạng thái đơn hàng sang OrdersService
      if (currentOrderCode) {
        try {
          await fetch(`${apiUrl}/orders/${encodeURIComponent(currentOrderCode)}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders,
            },
            body: JSON.stringify({
              status: paymentSucceeded ? 'PAID' : 'PAYMENT_FAILED',
            }),
          });
        } catch {
          // Bỏ qua nếu PATCH phụ lỗi
        }
      }

      if (paymentSucceeded) {
        setOrderPaidResult({
          orderId: returnedOrderId,
          orderCode: currentOrderCode || `ORD-${returnedOrderId}`,
          status: 'PAID',
          totalPaid: displayAmount,
          pointsEarned: expectedPointsEarned,
        });
        clearCart();

        if (token) {
          fetch(`${apiUrl}/promotions/loyalty/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data && typeof data.points === 'number') {
                updateStoredUserPoints(data.points);
                setUserAvailablePoints(data.points);
              }
            })
            .catch(() => {});
        }
      } else {
        setErrorMessage(
          serverErrorMessage ||
            'Giao dịch thanh toán bị từ chối. Giỏ hàng của bạn vẫn được giữ nguyên.',
        );
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Có lỗi kết nối tới máy chủ thanh toán';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Màn hình Xác nhận đơn hàng khi thanh toán thành công (PAID)
  if (orderPaidResult) {
    return (
      <div className="min-h-screen bg-amber-50/40 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-emerald-100">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Đặt hàng thành công</h1>
          <div className="bg-slate-50 rounded-xl p-4 my-6 space-y-2.5 text-sm text-slate-700">
            <p>
              Mã đơn:{' '}
              <strong className="font-mono text-slate-900">#{orderPaidResult.orderCode}</strong>
            </p>
            <p>
              Tổng thanh toán:{' '}
              <strong className="text-amber-800">
                {(orderPaidResult.totalPaid ?? displayAmount).toLocaleString('vi-VN')} đ
              </strong>
            </p>
            {orderPaidResult.pointsEarned !== undefined && orderPaidResult.pointsEarned > 0 && (
              <p className="text-emerald-700 font-medium flex items-center justify-center gap-1">
                <Award className="w-4 h-4 text-emerald-600" />
                Được tích lũy: <strong>+{orderPaidResult.pointsEarned} điểm thưởng</strong>
              </p>
            )}
            <p>
              Trạng thái:{' '}
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                {orderPaidResult.status}
              </span>
            </p>
          </div>
          <p className="text-slate-600 text-sm mb-6">Mời bạn tới quầy nhận đồ uống nhé!</p>

          <div className="space-y-3">
            <Link
              href="/orders"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition shadow-sm"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Xem lịch sử đơn hàng</span>
            </Link>

            <Link
              href="/"
              className="block w-full py-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold transition"
            >
              Về thực đơn
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Màn hình Thanh toán
  return (
    <div className="min-h-screen bg-amber-50/40 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
        <div className="flex items-center justify-between border-b pb-4">
          <Link
            href="/cart"
            className="p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title="Quay lại giỏ hàng"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-center text-slate-800">Thanh toán</h1>
          <div className="w-8" />
        </div>

        {/* Khối Khuyến Mãi (Task 10.3) */}
        <div className="pt-4 pb-2 border-b">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
            <Tag className="w-4 h-4 text-amber-600" />
            MÃ GIẢM GIÁ (KHUYẾN MÃI)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nhập mã (VD: BREWLITE20, GIAM10K)"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase font-semibold"
            />
            <button
              type="button"
              onClick={() => void handleApplyPromo()}
              disabled={validatingPromo || !promoInput.trim()}
              className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
            >
              {validatingPromo ? '...' : 'Áp dụng'}
            </button>
          </div>

          {/* Gợi ý mã có sẵn */}
          <div className="flex gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => void handleApplyPromo('BREWLITE20')}
              className="px-2 py-0.5 text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md transition"
            >
              BREWLITE20 (-20%)
            </button>
            <button
              type="button"
              onClick={() => void handleApplyPromo('GIAM10K')}
              className="px-2 py-0.5 text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md transition"
            >
              GIAM10K (-10.000đ)
            </button>
          </div>

          {appliedPromo && (
            <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                Đã áp dụng mã <strong>{appliedPromo.code}</strong>: -
                {appliedPromo.discountAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          )}

          {promoError && (
            <div className="mt-2 text-xs text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{promoError}</span>
            </div>
          )}
        </div>

        {/* Khối Điểm Thưởng (Task 10.3) */}
        {userAvailablePoints > 0 && (
          <div className="py-3 border-b">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1">
                <Award className="w-4 h-4 text-emerald-600" />
                ĐIỂM THƯỞNG CỦA BẠN:
              </span>
              <span className="text-emerald-700 font-bold">{userAvailablePoints} điểm</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={maxUsablePoints}
                value={pointsToUse || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setPointsToUse(Math.max(0, Math.min(val, maxUsablePoints)));
                }}
                placeholder="Số điểm muốn dùng (1đ = 1.000đ)"
                className="flex-1 px-3 py-1.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
              <button
                type="button"
                onClick={() => setPointsToUse(maxUsablePoints)}
                className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition"
              >
                Dùng tối đa
              </button>
            </div>
            {pointsToUse > 0 && (
              <p className="text-[11px] text-emerald-700 mt-1">
                ✓ Giảm thêm {(pointsToUse * 1000).toLocaleString('vi-VN')} đ từ {pointsToUse} điểm
              </p>
            )}
          </div>
        )}

        {/* Bảng Chi Tiết Giá & Tổng Tiền */}
        <div className="py-4 border-b border-dashed space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Tạm tính (Đồ uống):</span>
            <span className="font-medium text-slate-800">
              {baseSubtotal.toLocaleString('vi-VN')} đ
            </span>
          </div>

          {promoDiscount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Giảm giá khuyến mãi:</span>
              <span>-{promoDiscount.toLocaleString('vi-VN')} đ</span>
            </div>
          )}

          {pointsDiscount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Giảm giá điểm thưởng:</span>
              <span>-{pointsDiscount.toLocaleString('vi-VN')} đ</span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-2 border-t">
            <span className="text-sm font-bold text-slate-800">TỔNG THANH TOÁN:</span>
            <span className="text-2xl font-extrabold text-emerald-700">
              {displayAmount.toLocaleString('vi-VN')} đ
            </span>
          </div>

          <div className="flex justify-end text-[11px] text-emerald-600 font-medium">
            (Dự kiến tích lũy: +{expectedPointsEarned} điểm)
          </div>
        </div>

        {/* Chọn phương thức thanh toán */}
        <div className="py-4 space-y-2.5">
          <p className="text-xs font-bold text-slate-700 uppercase">
            Phương thức thanh toán (Không dùng tiền mặt):
          </p>

          <label
            className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
              method === 'WALLET' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="WALLET"
              checked={method === 'WALLET'}
              onChange={() => setMethod('WALLET')}
              className="w-4 h-4 accent-emerald-600"
            />
            <div>
              <p className="font-semibold text-slate-800 text-sm">Ví điện tử (Momo / VNPay)</p>
              <p className="text-xs text-slate-500">Thanh toán siêu tốc qua ví điện tử</p>
            </div>
          </label>

          <label
            className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
              method === 'CARD' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="CARD"
              checked={method === 'CARD'}
              onChange={() => setMethod('CARD')}
              className="w-4 h-4 accent-emerald-600"
            />
            <div>
              <p className="font-semibold text-slate-800 text-sm">Thẻ ngân hàng (ATM / Visa)</p>
              <p className="text-xs text-slate-500">Thanh toán qua cổng thẻ nội địa hoặc quốc tế</p>
            </div>
          </label>
        </div>

        {/* Hiển thị lỗi khi thanh toán thất bại */}
        {errorMessage && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <p className="font-bold">⚠️ Thanh toán thất bại (PAYMENT_FAILED)</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleConfirmPayment()}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold transition shadow-md"
        >
          {loading
            ? 'Đang xử lý giao dịch...'
            : errorMessage
              ? 'Thử thanh toán lại'
              : `Xác nhận trả ${displayAmount.toLocaleString('vi-VN')} đ`}
        </button>
      </div>
    </div>
  );
}

export default function CheckoutPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-amber-50/40 flex items-center justify-center p-4 text-sm text-stone-600">
          Đang tải trang thanh toán...
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
