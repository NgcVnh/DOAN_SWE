'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ArrowRight, RotateCcw, Home, RefreshCw } from 'lucide-react';
import { Header } from '../../../components/Header';
import { updateStoredUserPoints } from '../../../lib/auth';
import { useCartStore } from '../../../store/useCartStore';

interface VerifyZaloResult {
  success: boolean;
  isProcessing?: boolean;
  orderId?: number | string;
  orderCode?: string;
  orderStatus?: string;
  method?: string;
  transactionNo?: string;
  errorMessage?: string;
}

function ZalopayReturnContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart } = useCartStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [result, setResult] = useState<VerifyZaloResult | null>(null);
  const [countdown, setCountdown] = useState<number>(4);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const verifyPayment = useCallback(async () => {
    try {
      const queryStr = searchParams.toString();
      const response = await fetch(`${apiUrl}/payments/zalopay-return?${queryStr}`, {
        method: 'GET',
        cache: 'no-store',
      });

      const data: unknown = await response.json();
      if (response.ok && typeof data === 'object' && data !== null) {
        const resObj = data as VerifyZaloResult;
        setResult(resObj);
        if (resObj.success) {
          clearCart();
          updateStoredUserPoints(0);
        }
      } else {
        setResult({
          success: false,
          errorMessage: 'Không thể xác thực giao dịch ZaloPay với máy chủ',
        });
      }
    } catch {
      setResult({
        success: false,
        errorMessage: 'Lỗi kết nối tới máy chủ Backend',
      });
    } finally {
      setLoading(false);
    }
  }, [searchParams, apiUrl, clearCart]);

  useEffect(() => {
    void verifyPayment();
  }, [verifyPayment]);

  useEffect(() => {
    if (!result?.isProcessing || result.success) return;

    const pollTimer = setInterval(() => {
      void verifyPayment();
    }, 2500);

    return () => clearInterval(pollTimer);
  }, [result, verifyPayment]);

  useEffect(() => {
    if (!result?.success || !result.orderCode) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [result]);

  useEffect(() => {
    if (countdown === 0 && result?.success && result.orderCode) {
      router.push(`/orders/${encodeURIComponent(result.orderCode)}`);
    }
  }, [countdown, result, router]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col">
      <Header />

      <main className="max-w-md mx-auto px-4 py-12 flex-1 w-full flex items-center justify-center">
        <div className="w-full bg-white rounded-2xl border border-stone-200/90 shadow-md p-6 sm:p-8 text-center">
          {(loading || result?.isProcessing) && (
            <div className="py-10 space-y-4">
              <Loader2 className="w-12 h-12 text-sky-600 animate-spin mx-auto" />
              <h2 className="text-lg font-bold text-slate-800">
                {result?.isProcessing
                  ? 'Đang chờ xác nhận từ ứng dụng ZaloPay Sandbox...'
                  : 'Đang xác thực giao dịch Ví ZaloPay...'}
              </h2>
              <p className="text-xs text-slate-500">
                Hệ thống đang truy vấn kết quả trực tiếp từ máy chủ ZaloPay Sandbox
              </p>
              {result?.isProcessing && (
                <button
                  type="button"
                  onClick={() => void verifyPayment()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-xs transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Kiểm tra lại ngay</span>
                </button>
              )}
            </div>
          )}

          {!loading && !result?.isProcessing && result?.success && (
            <div className="space-y-5">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-2">
                  ZaloPay Sandbox — Thành công
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  Thanh toán Ví ZaloPay thành công!
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Đơn hàng của bạn đã chuyển sang trạng thái <strong>PAID</strong> và chuyển sang quầy pha chế.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã đơn hàng:</span>
                  <span className="font-mono font-bold text-slate-800">#{result.orderCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phương thức Strategy:</span>
                  <span className="font-semibold text-sky-700">
                    Ví điện tử (WALLET - WalletPaymentStrategy)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cổng xác thực:</span>
                  <span className="font-semibold text-emerald-700">ZaloPay Sandbox</span>
                </div>
                {result.transactionNo && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mã giao dịch ZaloPay:</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {result.transactionNo}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                Tự động chuyển đến đơn hàng sau{' '}
                <strong className="text-emerald-700">{countdown}s</strong>...
              </p>

              <div className="flex gap-2 pt-2">
                <Link
                  href={
                    result.orderCode
                      ? `/orders/${encodeURIComponent(result.orderCode)}`
                      : '/orders'
                  }
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs"
                >
                  <span>Xem đơn hàng ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/"
                  className="px-4 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition"
                >
                  <Home className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {!loading && !result?.isProcessing && !result?.success && (
            <div className="space-y-5">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 mb-2">
                  PAYMENT_FAILED
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  Giao dịch Ví ZaloPay bị từ chối hoặc đã hủy
                </h2>
                <p className="text-xs text-rose-700 mt-1">
                  {result?.errorMessage ||
                    'Quá trình thanh toán qua ZaloPay không thành công hoặc bạn đã bấm hủy giao dịch.'}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href={
                    result?.orderCode
                      ? `/checkout?orderCode=${encodeURIComponent(result.orderCode)}`
                      : '/checkout'
                  }
                  className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs transition shadow-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Thử thanh toán lại</span>
                </Link>
                <Link
                  href="/"
                  className="w-full py-2.5 rounded-xl text-stone-600 hover:text-stone-900 font-semibold text-xs transition"
                >
                  Về trang chủ thực đơn
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ZalopayReturnPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 text-sm text-stone-600">
          Đang xác thực giao dịch ZaloPay...
        </div>
      }
    >
      <ZalopayReturnContent />
    </Suspense>
  );
}

