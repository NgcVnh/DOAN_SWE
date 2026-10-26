import { COFFEE_PRODUCTS, SIZE_PRICES, COFFEE_TOPPINGS } from '../data/coffeeProducts';
import { ProductSize } from './product';

export type OrderStatusType =
  | 'PENDING'
  | 'PAID'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'PAYMENT_FAILED'
  | 'CANCELLED';

export interface OrderItemView {
  productId: number;
  productName: string;
  imageUrl: string;
  size: ProductSize;
  quantity: number;
  toppings: string[];
  unitPrice: number;
  lineTotal: number;
}

export interface OrderView {
  id: string;
  orderCode: string;
  userId: string;
  status: OrderStatusType;
  items: OrderItemView[];
  totalAmount: number;
  promoCode?: string;
  pointsToUse?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusMeta {
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
  dotClass: string;
  stepIndex: number;
  nextDemoStatus?: OrderStatusType;
  nextDemoLabel?: string;
  canCancel: boolean;
  canRetryPayment: boolean;
}

export const MAIN_FLOW_STEPS: Array<{ status: OrderStatusType; label: string }> = [
  { status: 'PENDING', label: 'Chờ thanh toán' },
  { status: 'PAID', label: 'Đã thanh toán' },
  { status: 'PREPARING', label: 'Đang pha chế' },
  { status: 'READY', label: 'Chờ nhận nước' },
  { status: 'COMPLETED', label: 'Hoàn tất' },
];

export const ORDER_STATUS_META: Record<OrderStatusType, OrderStatusMeta> = {
  PENDING: {
    label: 'Chờ thanh toán',
    shortLabel: 'Chờ TT',
    description: 'Đơn hàng đã khởi tạo, đang chờ xác nhận thanh toán không tiền mặt.',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
    stepIndex: 0,
    nextDemoStatus: 'PAID',
    nextDemoLabel: 'Xác nhận PAID',
    canCancel: true,
    canRetryPayment: true,
  },
  PAID: {
    label: 'Đã thanh toán',
    shortLabel: 'Đã TT',
    description: 'Thanh toán thành công. Quầy Barista đã nhận đơn của bạn.',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500',
    stepIndex: 1,
    nextDemoStatus: 'PREPARING',
    nextDemoLabel: 'Barista nhận đơn (PREPARING)',
    canCancel: true,
    canRetryPayment: false,
  },
  PREPARING: {
    label: 'Đang pha chế',
    shortLabel: 'Pha chế',
    description: 'Barista đang pha chế đồ uống tươi ngon cho bạn.',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    dotClass: 'bg-sky-500',
    stepIndex: 2,
    nextDemoStatus: 'READY',
    nextDemoLabel: 'Pha xong (READY)',
    canCancel: false,
    canRetryPayment: false,
  },
  READY: {
    label: 'Mời nhận tại quầy',
    shortLabel: 'Chờ lấy',
    description: 'Đồ uống đã sẵn sàng! Mời bạn đến quầy nhận nước.',
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-200',
    dotClass: 'bg-violet-500',
    stepIndex: 3,
    nextDemoStatus: 'COMPLETED',
    nextDemoLabel: 'Giao khách (COMPLETED)',
    canCancel: false,
    canRetryPayment: false,
  },
  COMPLETED: {
    label: 'Hoàn tất',
    shortLabel: 'Hoàn tất',
    description: 'Đơn hàng đã được giao thành công. Cảm ơn bạn đã chọn BrewLite!',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
    dotClass: 'bg-stone-500',
    stepIndex: 4,
    canCancel: false,
    canRetryPayment: false,
  },
  PAYMENT_FAILED: {
    label: 'Thanh toán thất bại',
    shortLabel: 'TT Lỗi',
    description: 'Giao dịch thanh toán bị từ chối hoặc gián đoạn. Bạn có thể bấm thử thanh toán lại.',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    dotClass: 'bg-rose-500',
    stepIndex: -1,
    nextDemoStatus: 'PAID',
    nextDemoLabel: 'Thử lại thành công (PAID)',
    canCancel: true,
    canRetryPayment: true,
  },
  CANCELLED: {
    label: 'Đã hủy',
    shortLabel: 'Đã hủy',
    description: 'Đơn hàng này đã bị hủy.',
    badgeClass: 'bg-stone-200 text-stone-600 border-stone-300',
    dotClass: 'bg-stone-400',
    stepIndex: -1,
    canCancel: false,
    canRetryPayment: false,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function normalizeOrderStatus(rawStatus: unknown): OrderStatusType {
  if (typeof rawStatus !== 'string') return 'PENDING';
  const upper = rawStatus.toUpperCase();
  if (upper === 'CANCELED') return 'CANCELLED';
  if (
    upper === 'PENDING' ||
    upper === 'PAID' ||
    upper === 'PREPARING' ||
    upper === 'READY' ||
    upper === 'COMPLETED' ||
    upper === 'PAYMENT_FAILED' ||
    upper === 'CANCELLED'
  ) {
    return upper;
  }
  return 'PENDING';
}

export function normalizeProductSize(rawSize: unknown): ProductSize {
  if (rawSize === 'S' || rawSize === 'M' || rawSize === 'L') {
    return rawSize;
  }
  return 'M';
}

export function parseProductId(rawId: unknown): number {
  if (typeof rawId === 'number' && Number.isFinite(rawId)) {
    return rawId;
  }
  if (typeof rawId === 'string') {
    const match = rawId.match(/\d+/);
    if (match) {
      return parseInt(match[0], 10);
    }
  }
  return 1;
}

export function normalizeOrderItem(raw: unknown): OrderItemView {
  if (!isRecord(raw)) {
    const fallbackProduct = COFFEE_PRODUCTS[0];
    return {
      productId: fallbackProduct.id,
      productName: fallbackProduct.name,
      imageUrl: fallbackProduct.imageUrl,
      size: 'M',
      quantity: 1,
      toppings: [],
      unitPrice: fallbackProduct.price,
      lineTotal: fallbackProduct.price,
    };
  }

  const productId = parseProductId(raw.productId);
  const catalogProduct = COFFEE_PRODUCTS.find((p) => p.id === productId);
  const size = normalizeProductSize(raw.size);
  const quantity =
    typeof raw.quantity === 'number' && raw.quantity > 0
      ? raw.quantity
      : typeof raw.qty === 'number' && raw.qty > 0
        ? raw.qty
        : 1;

  const toppings: string[] = [];
  if (Array.isArray(raw.toppings)) {
    for (const t of raw.toppings) {
      if (typeof t === 'string' && t.trim().length > 0) {
        toppings.push(t.trim());
      } else if (isRecord(t) && typeof t.name === 'string') {
        toppings.push(t.name);
      }
    }
  }

  const basePrice = catalogProduct?.price ?? 35000;
  const sizeAddon = SIZE_PRICES[size] ?? 0;
  const toppingsAddon = toppings.reduce((sum, tName) => {
    const matchedTopping = COFFEE_TOPPINGS.find(
      (ct) => ct.name.toLowerCase() === tName.toLowerCase(),
    );
    return sum + (matchedTopping ? matchedTopping.price : 5000);
  }, 0);

  const unitPrice =
    typeof raw.unitPrice === 'number' && raw.unitPrice > 0
      ? raw.unitPrice
      : basePrice + sizeAddon + toppingsAddon;

  const lineTotal =
    typeof raw.lineTotal === 'number' && raw.lineTotal > 0
      ? raw.lineTotal
      : unitPrice * quantity;

  const productObj = isRecord(raw.product) ? raw.product : null;
  const productName =
    typeof raw.name === 'string' && raw.name.length > 0
      ? raw.name
      : productObj && typeof productObj.name === 'string'
        ? productObj.name
        : catalogProduct?.name ?? `Thức uống #${productId}`;

  const imageUrl =
    productObj && typeof productObj.imageUrl === 'string'
      ? productObj.imageUrl
      : catalogProduct?.imageUrl ??
        'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80';

  return {
    productId,
    productName,
    imageUrl,
    size,
    quantity,
    toppings,
    unitPrice,
    lineTotal,
  };
}

export function normalizeOrderRecord(raw: unknown): OrderView | null {
  if (!isRecord(raw)) return null;

  const id =
    typeof raw.id === 'string' || typeof raw.id === 'number'
      ? String(raw.id)
      : 'unknown';
  const orderCode =
    typeof raw.orderCode === 'string' && raw.orderCode.length > 0
      ? raw.orderCode
      : `ORD-${id}`;

  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items = itemsRaw.map((item) => normalizeOrderItem(item));

  const computedSum = items.reduce((acc, i) => acc + i.lineTotal, 0);
  const totalAmount =
    typeof raw.totalAmount === 'number' && raw.totalAmount > 0
      ? raw.totalAmount
      : typeof raw.total === 'number' && raw.total > 0
        ? raw.total
        : computedSum;

  const createdAt =
    typeof raw.createdAt === 'string'
      ? raw.createdAt
      : new Date().toISOString();
  const updatedAt =
    typeof raw.updatedAt === 'string' ? raw.updatedAt : createdAt;

  return {
    id,
    orderCode,
    userId: typeof raw.userId === 'string' ? raw.userId : String(raw.userId ?? 'user-default-id'),
    status: normalizeOrderStatus(raw.status),
    items,
    totalAmount,
    promoCode: typeof raw.promoCode === 'string' ? raw.promoCode : undefined,
    pointsToUse: typeof raw.pointsToUse === 'number' ? raw.pointsToUse : undefined,
    createdAt,
    updatedAt,
  };
}

export function formatOrderDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatCurrencyVND(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} đ`;
}

