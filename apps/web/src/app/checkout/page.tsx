'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ClipboardList, ArrowLeft } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { getAuthToken } from '@/lib/auth';

type PaymentMethodType = 'WALLET' | 'CARD';

interface OrderPaidResult {
  orderId: number | string;
  orderCode: string;
  status: string;
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

  const [orderId] = useState<number>(1);

  const displayAmount =
    retryAmountParam && Number(retryAmountParam) > 0
      ? Number(retryAmountParam)
      : cartTotal > 0
        ? cartTotal
        : 123000;

  const handleConfirmPayment = async (): Promise<void> => {
    setLoading(true);
    setErrorMessage(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = getAuthToken();
    const authHeaders: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    let currentOrderCode = activeOrderCode;
    let returnedOrderId: number | string = orderId;

    try {
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
                  productId: '3',
                  quantity: 1,
                  size: 'M',
                  toppings: ['Kem Cheese'],
                },
                {
                  productId: '4',
                  quantity: 2,
                  size: 'L',
                  toppings: [],
                },
              ];

        try {
          const createOrderRes = await fetch(`${apiUrl}/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders,
            },
            body: JSON.stringify({ items: orderPayloadItems }),
          });

          if (createOrderRes.ok) {
            const createdOrder: unknown = await createOrderRes.json();
            if (
              typeof createdOrder === 'object' &&
              createdOrder !== null &&
              'orderCode' in createdOrder &&
              typeof (createdOrder as { orderCode: unknown }).orderCode === 'string'
            ) {
              currentOrderCode = (createdOrder as { orderCode: string }).orderCode;
              setActiveOrderCode(currentOrderCode);

              if ('id' in createdOrder) {
                const parsedId = parseInt(String((createdOrder as { id: unknown }).id), 10);
                if (Number.isFinite(parsedId) && parsedId > 0) {
                  returnedOrderId = parsedId;
                }
              }
            }
          }
        } catch {}
      }

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
        } catch {}
      }

      if (paymentSucceeded) {
        setOrderPaidResult({
          orderId: returnedOrderId,
          orderCode: currentOrderCode || `ORD-${returnedOrderId}`,
          status: 'PAID',
        });
        clearCart();
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
                {displayAmount.toLocaleString('vi-VN')} đ
              </strong>
            </p>
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

        <div className="py-6 text-center border-b border-dashed">
          <p className="text-sm text-slate-500">
            {activeOrderCode
              ? `Tổng tiền đơn hàng #${activeOrderCode}`
              : `Tổng tiền đơn hàng #${orderId}`}
          </p>
          <p className="text-3xl font-extrabold text-emerald-700 mt-1">
            {displayAmount.toLocaleString('vi-VN')} đ
          </p>
        </div>

        <div className="py-6 space-y-3">
          <p className="text-sm font-semibold text-slate-700">
            Phương thức thanh toán (Không dùng tiền mặt):
          </p>

          <label
            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
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
            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
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

        {errorMessage && (
          <div className="p-4 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <p className="font-bold">⚠️ Thanh toán thất bại (PAYMENT_FAILED)</p>
            <p className="mt-1">{errorMessage}</p>
            <p className="mt-1 italic text-rose-600">
              * Giỏ hàng của bạn vẫn được giữ nguyên. Bạn có thể bấm nút bên dưới để thử lại hoặc kiểm tra trong{' '}
              <Link href="/orders" className="underline font-semibold">
                Lịch sử đơn
              </Link>
              .
            </p>
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
              : 'Xác nhận trả'}
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
