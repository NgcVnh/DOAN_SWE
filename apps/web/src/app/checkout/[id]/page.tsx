'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  CreditCard,
  RotateCcw,
  Sparkles,
  Receipt,
  Coffee,
  Tag,
} from 'lucide-react';
import { Header } from '../../../components/Header';
import { useCartStore } from '../../../store/useCartStore';
import { COFFEE_TOPPINGS } from '../../../data/coffeeProducts';
import {
  OrderView,
  OrderStatusType,
  ORDER_STATUS_META,
  MAIN_FLOW_STEPS,
  normalizeOrderRecord,
  formatOrderDateTime,
  formatCurrencyVND,
} from '../../../types/order';

export default function OrderDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { addToCart } = useCartStore();

  const orderCode = decodeURIComponent(params?.id ?? '');

  const [order, setOrder] = useState<OrderView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchOrderDetail = useCallback(async (): Promise<void> => {
    if (!orderCode) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/orders/${encodeURIComponent(orderCode)}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Không tìm thấy đơn hàng #${orderCode} (HTTP ${response.status})`);
      }

      const rawData: unknown = await response.json();
      const normalized = normalizeOrderRecord(rawData);
      if (!normalized) {
        throw new Error('Dữ liệu đơn hàng không hợp lệ');
      }
      setOrder(normalized);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, orderCode]);

  useEffect(() => {
    void fetchOrderDetail();
  }, [fetchOrderDetail]);

  const handleTransitionStatus = async (nextStatus: OrderStatusType): Promise<void> => {
    if (!order) return;
    setUpdating(true);
    setActionError(null);

    try {
      const response = await fetch(
        `${apiUrl}/orders/${encodeURIComponent(order.orderCode)}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      const data: unknown = await response.json();
      if (!response.ok) {
        const errMsg =
          typeof data === 'object' &&
          data !== null &&
          'message' in data &&
          typeof (data as { message: unknown }).message === 'string'
            ? (data as { message: string }).message
            : 'Chuyển trạng thái không hợp lệ';
        throw new Error(errMsg);
      }

      const updated = normalizeOrderRecord(data);
      if (updated) {
        setOrder(updated);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái');
    } finally {
      setUpdating(false);
    }
  };

  const handleReorder = (): void => {
    if (!order) return;
    for (const item of order.items) {
      const mappedToppings = item.toppings.map((tName, idx) => {
        const found = COFFEE_TOPPINGS.find(
          (ct) => ct.name.toLowerCase() === tName.toLowerCase(),
        );
        return found
          ? { id: found.id, name: found.name, price: found.price }
          : { id: 100 + idx, name: tName, price: 5000 };
      });

      addToCart({
        productId: item.productId,
        name: item.productName,
        unitPrice: item.unitPrice,
        size: item.size,
        qty: item.quantity,
        toppings: mappedToppings,
      });
    }
    router.push('/cart');
  };

  const meta = order ? ORDER_STATUS_META[order.status] : null;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col">
      <Header />

      <main className="max-w-md mx-auto md:max-w-2xl px-4 py-6 sm:py-8 flex-1 w-full space-y-5">
        {/* Thanh điều hướng quay lại */}
        <div className="flex items-center justify-between">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-stone-600 hover:text-amber-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Lịch sử đơn</span>
          </Link>

          <button
            type="button"
            onClick={() => void fetchOrderDetail()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl p-6 border border-stone-200 animate-pulse space-y-4">
            <div className="h-6 bg-stone-200 rounded w-1/2" />
            <div className="h-24 bg-stone-100 rounded-xl" />
            <div className="h-32 bg-stone-100 rounded-xl" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-800">Không thể tải thông tin đơn hàng</h2>
              <p className="text-xs text-rose-600 mt-1">{error}</p>
            </div>
            <Link
              href="/orders"
              className="inline-block px-5 py-2.5 bg-amber-700 text-white text-xs font-semibold rounded-xl hover:bg-amber-800 transition"
            >
              Về trang Lịch sử đơn
            </Link>
          </div>
        )}

        {!loading && !error && order && meta && (
          <>
            {/* Khối thông tin trạng thái & Mã đơn */}
            <section className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <span className="text-xs text-stone-400 font-medium uppercase tracking-wider">
                    Mã đơn hàng
                  </span>
                  <h1 className="text-xl sm:text-2xl font-mono font-extrabold text-amber-950 mt-0.5">
                    #{order.orderCode}
                  </h1>
                  <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Đặt lúc: {formatOrderDateTime(order.createdAt)}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border ${meta.badgeClass}`}
                >
                  <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                  {meta.label} ({order.status})
                </span>
              </div>

              {/* Timeline 5 bước của Order State Machine */}
              {meta.stepIndex >= 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-stone-700">
                    Tiến độ đơn hàng (Order State Machine):
                  </p>
                  <div className="space-y-2.5">
                    {MAIN_FLOW_STEPS.map((step, idx) => {
                      const isDone = idx <= meta.stepIndex;
                      const isCurrent = idx === meta.stepIndex;

                      return (
                        <div
                          key={step.status}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                            isCurrent
                              ? 'bg-emerald-50/70 border-emerald-200'
                              : isDone
                                ? 'bg-stone-50/70 border-stone-100'
                                : 'bg-white border-stone-100 opacity-50'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isDone
                                ? 'bg-emerald-600 text-white'
                                : 'bg-stone-200 text-stone-500'
                            }`}
                          >
                            {isDone ? '✓' : idx + 1}
                          </div>
                          <div className="flex-1">
                            <p
                              className={`text-xs sm:text-sm ${
                                isCurrent
                                  ? 'font-bold text-emerald-900'
                                  : isDone
                                    ? 'font-semibold text-stone-800'
                                    : 'text-stone-500'
                              }`}
                            >
                              {step.label}{' '}
                              <span className="font-mono text-[11px] opacity-75">
                                ({step.status})
                              </span>
                            </p>
                          </div>
                          {isCurrent && (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                              Hiện tại
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div
                  className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                    order.status === 'PAYMENT_FAILED'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-stone-100 border-stone-200 text-stone-700'
                  }`}
                >
                  {order.status === 'PAYMENT_FAILED' ? (
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold text-sm">{meta.label}</p>
                    <p className="mt-1">{meta.description}</p>
                  </div>
                </div>
              )}

              {/* Hộp điều khiển chuyển trạng thái phục vụ vấn đáp / Demo */}
              {(meta.nextDemoStatus || meta.canCancel) && (
                <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 space-y-2.5">
                  <p className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Bảng điều khiển Barista / Demo State Machine:
                  </p>
                  {actionError && (
                    <p className="text-xs text-rose-600 font-medium">{actionError}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {meta.nextDemoStatus && (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => void handleTransitionStatus(meta.nextDemoStatus!)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold transition"
                      >
                        {updating ? 'Đang cập nhật...' : `Chuyển sang: ${meta.nextDemoLabel}`}
                      </button>
                    )}
                    {meta.canCancel && (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => void handleTransitionStatus('CANCELLED')}
                        className="px-3.5 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 disabled:opacity-50 text-rose-700 text-xs font-semibold transition"
                      >
                        Hủy đơn hàng (CANCELLED)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Danh sách sản phẩm trong đơn */}
            <section className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3">
                <Coffee className="w-4 h-4 text-amber-600" />
                <span>Chi tiết đồ uống đã đặt ({order.items.reduce((s, i) => s + i.quantity, 0)} món)</span>
              </h2>

              <div className="divide-y divide-stone-100">
                {order.items.map((item, idx) => (
                  <div
                    key={`${order.id}-${idx}`}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-amber-50 border border-stone-200/70 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-stone-900 truncate">
                          {item.productName}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Kích cỡ: <span className="font-semibold text-stone-700">Size {item.size}</span> • Số lượng:{' '}
                          <span className="font-semibold text-amber-700">x{item.quantity}</span>
                        </p>
                        {item.toppings.length > 0 && (
                          <p className="text-xs text-stone-500 mt-0.5">
                            Topping: {item.toppings.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-amber-900">
                        {formatCurrencyVND(item.lineTotal)}
                      </p>
                      <p className="text-[11px] text-stone-400">
                        {formatCurrencyVND(item.unitPrice)} / ly
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tổng kết hóa đơn */}
              <div className="pt-3 border-t border-stone-200 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-stone-600">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-stone-400" />
                    Phương thức thanh toán
                  </span>
                  <span className="font-medium text-stone-800">Không tiền mặt (Ví / Thẻ)</span>
                </div>

                {order.promoCode && (
                  <div className="flex justify-between text-emerald-700">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-4 h-4" />
                      Mã khuyến mãi áp dụng
                    </span>
                    <span className="font-bold">{order.promoCode}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-dashed border-stone-200 text-base font-extrabold text-stone-900">
                  <span>Tổng cộng</span>
                  <span className="text-lg text-amber-800">
                    {formatCurrencyVND(order.totalAmount)}
                  </span>
                </div>
              </div>
            </section>

            {/* Các nút hành động cuối trang */}
            <div className="flex flex-wrap items-center gap-3">
              {meta.canRetryPayment && (
                <Link
                  href={`/checkout?orderCode=${encodeURIComponent(order.orderCode)}&amount=${order.totalAmount}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold transition shadow-sm"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Thanh toán lại ngay</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleReorder}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold transition shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Đặt lại đơn này</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}