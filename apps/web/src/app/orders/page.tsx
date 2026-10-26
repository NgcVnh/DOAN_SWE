'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  RefreshCw,
  AlertCircle,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  RotateCcw,
  CreditCard,
  Tag,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { Header } from '../../components/Header';
import { useCartStore } from '../../store/useCartStore';
import { COFFEE_TOPPINGS } from '../../data/coffeeProducts';
import { getAuthToken, clearAuthData } from '../../lib/auth';
import {
  OrderView,
  OrderStatusType,
  ORDER_STATUS_META,
  MAIN_FLOW_STEPS,
  normalizeOrderRecord,
  formatOrderDateTime,
  formatCurrencyVND,
} from '../../types/order';

type FilterTabId = 'ALL' | 'ACTION_NEEDED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

interface FilterTab {
  id: FilterTabId;
  label: string;
  statuses?: OrderStatusType[];
}

const FILTER_TABS: FilterTab[] = [
  { id: 'ALL', label: 'Tất cả' },
  {
    id: 'ACTION_NEEDED',
    label: 'Chờ thanh toán / Lỗi',
    statuses: ['PENDING', 'PAYMENT_FAILED'],
  },
  {
    id: 'PROCESSING',
    label: 'Đang phục vụ',
    statuses: ['PAID', 'PREPARING', 'READY'],
  },
  {
    id: 'COMPLETED',
    label: 'Hoàn tất',
    statuses: ['COMPLETED'],
  },
  {
    id: 'CANCELLED',
    label: 'Đã hủy',
    statuses: ['CANCELLED'],
  },
];

export default function OrderHistoryPage(): React.JSX.Element {
  const router = useRouter();
  const { addToCart } = useCartStore();

  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthenticated, setIsUnauthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<FilterTabId>('ALL');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchMyOrders = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setIsUnauthenticated(false);

    const token = getAuthToken();
    if (!token) {
      setIsUnauthenticated(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/orders/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (response.status === 401) {
        clearAuthData();
        setIsUnauthenticated(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Máy chủ phản hồi mã lỗi HTTP ${response.status}`);
      }

      const rawData: unknown = await response.json();
      let rawList: unknown[] = [];

      if (Array.isArray(rawData)) {
        rawList = rawData;
      } else if (
        typeof rawData === 'object' &&
        rawData !== null &&
        'data' in rawData &&
        Array.isArray((rawData as { data: unknown }).data)
      ) {
        rawList = (rawData as { data: unknown[] }).data;
      }

      const normalized = rawList
        .map((item) => normalizeOrderRecord(item))
        .filter((item): item is OrderView => item !== null);

      setOrders(normalized);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể kết nối tới máy chủ Backend (Port 3001)';
      setError(`Không thể tải lịch sử đơn hàng: ${msg}. Vui lòng kiểm tra backend (npm run dev:api).`);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    void fetchMyOrders();
  }, [fetchMyOrders]);

  const handleReorder = (order: OrderView): void => {
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

  const filteredOrders = useMemo<OrderView[]>(() => {
    const currentTab = FILTER_TABS.find((t) => t.id === activeTab);
    if (!currentTab?.statuses) {
      return orders;
    }
    return orders.filter((order) => currentTab.statuses!.includes(order.status));
  }, [orders, activeTab]);

  const stats = useMemo(() => {
    const totalCount = orders.length;
    const activeCount = orders.filter((o) =>
      ['PENDING', 'PAID', 'PREPARING', 'READY'].includes(o.status),
    ).length;
    const totalSpent = orders
      .filter((o) => ['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(o.status))
      .reduce((sum, o) => sum + o.totalAmount, 0);

    return { totalCount, activeCount, totalSpent };
  }, [orders]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col">
      <Header />

      <main className="max-w-md mx-auto md:max-w-4xl lg:max-w-5xl px-4 py-6 sm:py-8 flex-1 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-amber-950 flex items-center gap-2.5">
              <ClipboardList className="w-7 h-7 text-amber-600" />
              <span>Lịch sử đơn hàng</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Theo dõi tiến độ pha chế & tra cứu lịch sử đặt đồ uống tại BrewLite
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => void fetchMyOrders()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-700 hover:text-amber-700 hover:bg-stone-50 transition shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
              <span>Tải lại</span>
            </button>
          </div>
        </div>

        {!loading && !error && !isUnauthenticated && orders.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-stone-500">Tổng đơn đã đặt</p>
              <p className="text-lg sm:text-2xl font-extrabold text-stone-900 mt-1">
                {stats.totalCount} <span className="text-xs font-normal text-stone-500">đơn</span>
              </p>
            </div>

            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-amber-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-amber-700">Đang phục vụ</p>
              <p className="text-lg sm:text-2xl font-extrabold text-amber-700 mt-1">
                {stats.activeCount} <span className="text-xs font-normal text-amber-600">đơn</span>
              </p>
            </div>

            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-emerald-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-emerald-700">Tổng chi tiêu</p>
              <p className="text-base sm:text-2xl font-extrabold text-emerald-700 mt-1 truncate">
                {formatCurrencyVND(stats.totalSpent)}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-stone-200/90 shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {FILTER_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count =
                tab.id === 'ALL'
                  ? orders.length
                  : orders.filter((o) => tab.statuses?.includes(o.status)).length;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-amber-900/40 text-amber-50' : 'bg-white text-stone-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="bg-white rounded-2xl p-5 border border-stone-200 animate-pulse space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-stone-200 rounded w-1/3" />
                  <div className="h-6 bg-stone-200 rounded-full w-24" />
                </div>
                <div className="h-10 bg-stone-100 rounded-xl w-full" />
                <div className="space-y-2">
                  <div className="h-14 bg-stone-100 rounded-xl w-full" />
                  <div className="h-14 bg-stone-100 rounded-xl w-full" />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="h-5 bg-stone-200 rounded w-1/4" />
                  <div className="h-9 bg-stone-200 rounded-xl w-32" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-rose-900">Lỗi tải lịch sử đơn hàng</h3>
              <p className="text-xs text-rose-700 mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void fetchMyOrders()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition shrink-0"
            >
              Thử lại ngay
            </button>
          </div>
        )}

        {!loading && !error && !isUnauthenticated && filteredOrders.length === 0 && (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center shadow-xs my-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-stone-800">
              {orders.length === 0
                ? 'Bạn chưa có đơn hàng nào'
                : 'Không có đơn hàng trong mục này'}
            </h3>
            <p className="mt-1.5 text-xs text-stone-500 leading-relaxed">
              {orders.length === 0
                ? 'Hãy chọn món đồ uống yêu thích từ thực đơn BrewLite và trải nghiệm thanh toán một chạm không tiền mặt nhé!'
                : 'Hiện tại bạn không có đơn hàng nào ở trạng thái này.'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              {orders.length > 0 && activeTab !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition"
                >
                  Xem tất cả đơn
                </button>
              )}
              <Link
                href="/"
                className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold transition shadow-xs"
              >
                Khám phá thực đơn
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && !isUnauthenticated && filteredOrders.length > 0 && (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const meta = ORDER_STATUS_META[order.status];

              return (
                <article
                  key={order.id}
                  className="bg-white rounded-2xl border border-stone-200/90 shadow-xs hover:border-amber-300/90 transition overflow-hidden"
                >
                  <div className="px-4 sm:px-5 py-3.5 bg-stone-50/70 border-b border-stone-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-sm sm:text-base text-amber-950">
                        #{order.orderCode}
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                        <Clock className="w-3.5 h-3.5" />
                        {formatOrderDateTime(order.createdAt)}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${meta.badgeClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                      {meta.label} ({order.status})
                    </span>
                  </div>

                  <div className="px-4 sm:px-5 pt-4 pb-2">
                    {meta.stepIndex >= 0 ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-5 gap-1.5">
                          {MAIN_FLOW_STEPS.map((step, idx) => {
                            const isDone = idx <= meta.stepIndex;
                            const isCurrent = idx === meta.stepIndex;

                            return (
                              <div key={step.status} className="flex flex-col items-center">
                                <div
                                  className={`h-1.5 w-full rounded-full transition-all ${
                                    isDone ? 'bg-emerald-600' : 'bg-stone-200'
                                  }`}
                                />
                                <span
                                  className={`mt-1.5 text-[10px] sm:text-[11px] text-center leading-tight ${
                                    isCurrent
                                      ? 'font-bold text-emerald-800'
                                      : isDone
                                        ? 'font-medium text-stone-700'
                                        : 'text-stone-400'
                                  }`}
                                >
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-stone-600 bg-stone-50 px-3 py-2 rounded-xl border border-stone-100 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{meta.description}</span>
                        </p>
                      </div>
                    ) : (
                      <div
                        className={`px-3.5 py-2.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                          order.status === 'PAYMENT_FAILED'
                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                            : 'bg-stone-100 border-stone-200 text-stone-600'
                        }`}
                      >
                        {order.status === 'PAYMENT_FAILED' ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-stone-500 shrink-0" />
                        )}
                        <span>{meta.description}</span>
                      </div>
                    )}
                  </div>

                  <div className="px-4 sm:px-5 py-3 divide-y divide-stone-100">
                    {order.items.map((item, idx) => (
                      <div
                        key={`${order.id}-item-${idx}`}
                        className="py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-amber-50 border border-stone-200/60 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-900 truncate">
                              {item.productName}{' '}
                              <span className="text-amber-700 font-bold">x{item.quantity}</span>
                            </p>
                            <p className="text-xs text-stone-500 mt-0.5 truncate">
                              Size <span className="font-medium text-stone-700">{item.size}</span>
                              {item.toppings.length > 0 && (
                                <> • Topping: {item.toppings.join(', ')}</>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs sm:text-sm font-bold text-stone-800">
                            {formatCurrencyVND(item.lineTotal)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="px-4 sm:px-5 py-3.5 bg-stone-50/50 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[11px] text-stone-500 block">
                          Tổng thanh toán ({order.items.reduce((s, i) => s + i.quantity, 0)} món)
                        </span>
                        <span className="text-base sm:text-lg font-extrabold text-amber-900">
                          {formatCurrencyVND(order.totalAmount)}
                        </span>
                      </div>

                      {order.promoCode && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-semibold">
                          <Tag className="w-3 h-3" />
                          {order.promoCode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      {meta.canRetryPayment && (
                        <Link
                          href={`/checkout?orderCode=${encodeURIComponent(order.orderCode)}&amount=${order.totalAmount}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition shadow-xs"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Thanh toán lại</span>
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => handleReorder(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Đặt lại</span>
                      </button>

                      <Link
                        href={`/orders/${encodeURIComponent(order.orderCode)}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition"
                      >
                        <span>Chi tiết</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500 mt-10">
        BrewLite Monorepo &copy; 2026 — Đồ án môn Công nghệ phần mềm (SWE)
      </footer>
    </div>
  );
}
