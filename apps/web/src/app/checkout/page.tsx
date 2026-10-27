'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ClipboardList,
  ArrowLeft,
  Tag,
  Award,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Coffee,
  Wallet,
  CreditCard,
} from 'lucide-react';
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

  const [method, setMethod] = useState<PaymentMethodType>('WALLET');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderPaidResult, setOrderPaidResult] = useState<OrderPaidResult | null>(null);
  const [activeOrderCode, setActiveOrderCode] = useState<string | null>(retryOrderCode);
  const [retryOrderTotal, setRetryOrderTotal] = useState<number>(
    retryAmountParam && Number(retryAmountParam) > 0 ? Number(retryAmountParam) : 0,
  );

  const [promoInput, setPromoInput] = useState<string>('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [validatingPromo, setValidatingPromo] = useState<boolean>(false);

  const [userAvailablePoints, setUserAvailablePoints] = useState<number>(0);
  const [pointsToUse, setPointsToUse] = useState<number>(0);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
      .catch(() => {});
  }, [apiUrl]);

  useEffect(() => {
    if (!retryOrderCode || (retryAmountParam && Number(retryAmountParam) > 0)) return;

    fetch(`${apiUrl}/orders/${encodeURIComponent(retryOrderCode)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data === 'object') {
          const orderObj = data as { totalAmount?: number; total?: number };
          const amt = orderObj.totalAmount ?? orderObj.total ?? 0;
          if (amt > 0) {
            setRetryOrderTotal(amt);
          }
        }
      })
      .catch(() => {});
  }, [apiUrl, retryOrderCode, retryAmountParam]);

  const computedCartSubtotal = items.reduce(
    (sum, item) => sum + (item.lineTotal || item.unitPrice * item.qty),
    0,
  );

  const baseSubtotal =
    retryOrderTotal > 0
      ? retryOrderTotal
      : computedCartSubtotal > 0
        ? computedCartSubtotal
        : cartTotal > 0
          ? cartTotal
          : 0;

  const promoDiscount = appliedPromo ? appliedPromo.discountAmount : 0;
  const remainingAfterPromo = Math.max(0, baseSubtotal - promoDiscount);

  const maxUsablePoints = Math.min(userAvailablePoints, Math.ceil(remainingAfterPromo / 1000));
  const pointsDiscount = Math.min(pointsToUse * 1000, remainingAfterPromo);

  const displayAmount = Math.max(0, remainingAfterPromo - pointsDiscount);
  const expectedPointsEarned = Math.floor(displayAmount / 10000);

  const handleApplyPromo = async (codeToApply?: string) => {
    const code = (codeToApply || promoInput).trim().toUpperCase();
    if (!code || baseSubtotal <= 0) return;

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

  const handleConfirmPayment = async (): Promise<void> => {
    if (baseSubtotal <= 0) {
      setErrorMessage('Giỏ hàng của bạn đang trống. Vui lòng chọn món trước khi thanh toán.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const token = getAuthToken();
    const authHeaders: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    let currentOrderCode = activeOrderCode;
    let returnedOrderId: number | null = null;

    if (currentOrderCode) {
      const match = currentOrderCode.match(/\d+/);
      if (match) {
        returnedOrderId = parseInt(match[0], 10);
      }
    }

    try {
      if (!currentOrderCode || !returnedOrderId) {
        const orderPayloadItems = items.map((item) => ({
          productId: String(item.productId),
          quantity: item.qty,
          size: item.size,
          toppings: item.toppings?.map((t) => t.name) ?? [],
          unitPrice: item.unitPrice,
        }));

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

        const createdData: unknown = await createOrderRes.json();
        if (!createOrderRes.ok) {
          const errMsg =
            typeof createdData === 'object' &&
            createdData !== null &&
            'message' in createdData &&
            typeof (createdData as { message: unknown }).message === 'string'
              ? (createdData as { message: string }).message
              : 'Không thể khởi tạo đơn hàng. Vui lòng kiểm tra trạng thái đăng nhập.';
          throw new Error(errMsg);
        }

        const createdOrder = createdData as { id?: string | number; orderCode?: string };
        if (createdOrder && createdOrder.orderCode) {
          currentOrderCode = createdOrder.orderCode;
          setActiveOrderCode(currentOrderCode);
        }
        if (createdOrder && createdOrder.id !== undefined) {
          const parsedId = parseInt(String(createdOrder.id), 10);
          if (Number.isFinite(parsedId) && parsedId > 0) {
            returnedOrderId = parsedId;
          }
        }
      }

      if (!returnedOrderId) {
        throw new Error('Không xác định được mã đơn hàng để thanh toán.');
      }

      const idempotencyKey = crypto.randomUUID();
      let paymentSucceeded = false;
      let serverErrorMessage: string | null = null;

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
          useSandbox: true,
        }),
      });

      const data: unknown = await response.json();
      if (response.ok && typeof data === 'object' && data !== null) {
        const paymentObj = data as {
          orderStatus?: string;
          orderId?: number | string;
          errorMessage?: string;
          paymentUrl?: string;
        };

        if (paymentObj.paymentUrl) {
          window.location.href = paymentObj.paymentUrl;
          return;
        }

        paymentSucceeded = paymentObj.orderStatus === 'PAID';
        if (paymentObj.orderId !== undefined) {
          returnedOrderId = Number(paymentObj.orderId);
        }
        if (paymentObj.errorMessage) {
          serverErrorMessage = paymentObj.errorMessage;
        }
      } else {
        const errMsg =
          typeof data === 'object' &&
          data !== null &&
          'message' in data &&
          typeof (data as { message: unknown }).message === 'string'
            ? (data as { message: string }).message
            : 'Lỗi xử lý thanh toán từ máy chủ';
        serverErrorMessage = errMsg;
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
            .then((loyaltyData) => {
              if (loyaltyData && typeof loyaltyData.points === 'number') {
                updateStoredUserPoints(loyaltyData.points);
                setUserAvailablePoints(loyaltyData.points);
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

  if (baseSubtotal <= 0 && !retryOrderCode) {
    return (
      <div className="min-h-screen bg-amber-50/40 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-slate-200 space-y-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Giỏ hàng chưa có sản phẩm</h2>
          <p className="text-xs text-slate-500">
            Vui lòng chọn đồ uống yêu thích từ thực đơn trước khi tiến hành thanh toán.
          </p>
          <Link
            href="/"
            className="inline-block w-full py-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-sm transition"
          >
            Khám phá thực đơn
          </Link>
        </div>
      </div>
    );
  }

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

        {items.length > 0 && !retryOrderCode && (
          <div className="py-3 border-b space-y-2 max-h-48 overflow-y-auto">
            <p className="text-xs font-bold text-slate-700 uppercase">
              Sản phẩm đã chọn ({items.reduce((s, i) => s + i.qty, 0)} món)
            </p>
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs gap-2 py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Coffee className="w-4 h-4 text-amber-700 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {item.name} <span className="text-amber-700">x{item.qty}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Size {item.size}
                      {item.toppings && item.toppings.length > 0
                        ? ` • ${item.toppings.map((t) => t.name).join(', ')}`
                        : ''}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-slate-800 shrink-0">
                  {(item.lineTotal || item.unitPrice * item.qty).toLocaleString('vi-VN')} đ
                </span>
              </div>
            ))}
          </div>
        )}

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

          {promoError && (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{promoError}</span>
            </p>
          )}

          {appliedPromo && (
            <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
              <span className="flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Mã <strong>{appliedPromo.code}</strong>: Giảm{' '}
                {appliedPromo.discountAmount.toLocaleString('vi-VN')} đ
              </span>
              <button
                type="button"
                onClick={() => {
                  setAppliedPromo(null);
                  setPromoInput('');
                }}
                className="text-rose-600 hover:underline font-semibold ml-2"
              >
                Bỏ
              </button>
            </div>
          )}
        </div>

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

        <div className="py-4 space-y-3">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Phương thức thanh toán
          </p>

          <label
            className={`flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer transition ${
              method === 'WALLET'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="WALLET"
              checked={method === 'WALLET'}
              onChange={() => setMethod('WALLET')}
              className="w-4 h-4 accent-emerald-600 cursor-pointer"
            />
            <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800 text-sm">
                Ví điện tử ZaloPay
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Quét mã QR qua ứng dụng ZaloPay
              </p>
            </div>
          </label>

          <label
            className={`flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer transition ${
              method === 'CARD'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="CARD"
              checked={method === 'CARD'}
              onChange={() => setMethod('CARD')}
              className="w-4 h-4 accent-emerald-600 cursor-pointer"
            />
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800 text-sm">
                Thẻ ATM / Tài khoản ngân hàng
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Hỗ trợ Internet Banking & Thẻ nội địa (VNPAY)
              </p>
            </div>
          </label>
        </div>

        {errorMessage && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <p className="font-bold">⚠️ Thanh toán không thành công</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleConfirmPayment()}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold transition shadow-md flex items-center justify-center gap-2"
        >
          {loading
            ? 'Đang kết nối cổng thanh toán...'
            : errorMessage
              ? 'Thử thanh toán lại'
              : `Thanh toán ${displayAmount.toLocaleString('vi-VN')} đ`}
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
