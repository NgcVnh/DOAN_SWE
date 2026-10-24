import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderStatus, DrinkSize } from './enums/order-status.enum.js';
import { Order } from './entities/order.entity.js';
import { randomUUID } from 'crypto';

/**
 * Lớp Mutex xử lý concurrency (Race-condition) khi nhiều khách hàng
 * đồng thời đặt cùng 1 sản phẩm cuối cùng trong kho.
 */
class AsyncMutex {
  private queue = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    let release: () => void;
    const ticket = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.queue;
    this.queue = ticket;

    await previous;
    try {
      return await fn();
    } finally {
      release!();
    }
  }
}

export interface PromotionRule {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number; // Tỉ lệ % hoặc số tiền giảm cố định (VNĐ)
  minOrderValue: number;
  maxDiscount?: number;
  isActive: boolean;
  expiredAt: Date;
}

@Injectable()
export class OrdersService {
  private orders: Order[] = [];
  private readonly mutex = new AsyncMutex();

  // =========================================================================
  // TASK 10.3: QUẢN LÝ TỒN KHO & KIỂM SOÁT ĐỒNG THỜI (CONCURRENCY CONTROL)
  // =========================================================================
  private productStocks: Map<string, number> = new Map([
    ['1', 50],
    ['2', 50],
    ['3', 30],
    ['4', 40],
    ['prod-tra-sua-olong', 20],
    ['prod-cafe-sua', 15],
    ['prod-limited', 2], // Sản phẩm số lượng có hạn để kiểm thử race-condition
  ]);

  // =========================================================================
  // TASK 10.4: DANH SÁCH MÃ KHUYẾN MÃI (PROMOTION ENGINE)
  // =========================================================================
  private promotions: Map<string, PromotionRule> = new Map([
    [
      'GIAM10K',
      {
        code: 'GIAM10K',
        type: 'FIXED',
        value: 10000,
        minOrderValue: 40000,
        isActive: true,
        expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Còn 30 ngày
      },
    ],
    [
      'BREWLITE20',
      {
        code: 'BREWLITE20',
        type: 'PERCENTAGE',
        value: 20, // Giảm 20%
        minOrderValue: 50000,
        maxDiscount: 30000, // Tối đa 30k
        isActive: true,
        expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    ],
    [
      'CHAOBANMOI',
      {
        code: 'CHAOBANMOI',
        type: 'PERCENTAGE',
        value: 50, // Giảm 50%
        minOrderValue: 30000,
        maxDiscount: 50000,
        isActive: true,
        expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    ],
    [
      'HETHAN',
      {
        code: 'HETHAN',
        type: 'FIXED',
        value: 20000,
        minOrderValue: 20000,
        isActive: true,
        expiredAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Đã hết hạn hôm qua
      },
    ],
  ]);

  // =========================================================================
  // TASK 10.1: BẢNG CHUYỂN ĐỔI MÁY TRẠNG THÁI (ORDER STATE MACHINE)
  // Quy tắc chuẩn nghiệp vụ đồ án:
  // Luồng chính: PENDING -> PAID -> PREPARING -> READY -> COMPLETED.
  // Ngoại lệ: PAYMENT_FAILED (cho phép retry sang PAID) hoặc CANCELLED.
  // =========================================================================
  private readonly validTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [
      OrderStatus.PAID,
      OrderStatus.PAYMENT_FAILED,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.PAID]: [
      OrderStatus.PREPARING,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.PREPARING]: [
      OrderStatus.READY,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.READY]: [
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.PAYMENT_FAILED]: [
      OrderStatus.PAID, // Khách hàng bấm thử lại thanh toán
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.COMPLETED]: [], // Trạng thái kết thúc - không cho chuyển tiếp
    [OrderStatus.CANCELLED]: [], // Trạng thái kết thúc - không cho chuyển tiếp
  };

  /**
   * Tạo đơn hàng mới với đầy đủ xác thực tồn kho đồng thời (Concurrency),
   * áp mã khuyến mãi (Promotion), và trừ/tích điểm thưởng (Loyalty).
   */
  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    return this.mutex.runExclusive(async () => {
      // 1. Kiểm tra tồn kho chống bán vượt (Race Condition / Overselling Prevention)
      for (const item of createOrderDto.items) {
        const availableStock = this.productStocks.get(item.productId) ?? 50;
        if (availableStock < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm ID "${item.productId}" không đủ tồn kho (Còn lại: ${availableStock}, yêu cầu: ${item.quantity}). Vui lòng giảm số lượng!`,
          );
        }
      }

      // 2. Tính tiền hàng gốc (Subtotal)
      const subtotal = createOrderDto.items.reduce((sum, item) => {
        let itemPrice = 35000; // Giá đồ uống cơ bản
        if (item.size === DrinkSize.M) itemPrice += 5000;
        if (item.size === DrinkSize.L) itemPrice += 10000;
        if (item.toppings && item.toppings.length > 0) {
          itemPrice += item.toppings.length * 5000;
        }
        return sum + itemPrice * item.quantity;
      }, 0);

      // 3. Xử lý mã khuyến mãi (Promotion)
      let discountAmount = 0;
      if (createOrderDto.promoCode) {
        discountAmount = this.calculatePromotionDiscount(
          createOrderDto.promoCode,
          subtotal,
        );
      }

      // 4. Xử lý điểm thưởng (Loyalty Points): 1 điểm = 1.000đ
      let pointsDiscount = 0;
      if (createOrderDto.pointsToUse && createOrderDto.pointsToUse > 0) {
        const remainingAfterPromo = Math.max(0, subtotal - discountAmount);
        const maxPointsDiscount = createOrderDto.pointsToUse * 1000;
        // Số tiền giảm từ điểm không được vượt quá số tiền còn lại sau khuyến mãi
        pointsDiscount = Math.min(remainingAfterPromo, maxPointsDiscount);
      }

      // 5. Tính tổng thanh toán cuối cùng
      const totalAmount = Math.max(0, subtotal - discountAmount - pointsDiscount);

      // 6. Tính điểm thưởng tích lũy (Cashback 5% giá trị đơn hàng, 1000đ = 1 điểm)
      const pointsEarned = Math.floor((totalAmount * 0.05) / 1000);

      // 7. Trừ tồn kho đồng thời an toàn (Atomic deduction)
      for (const item of createOrderDto.items) {
        const currentStock = this.productStocks.get(item.productId) ?? 50;
        this.productStocks.set(item.productId, currentStock - item.quantity);
      }

      // 8. Khởi tạo đơn hàng trạng thái PENDING
      const timestamp = Date.now();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderCode = `ORD-${timestamp}-${randomSuffix}`;

      const newOrder: Order = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : randomUUID(),
        orderCode,
        userId: 1,
        items: createOrderDto.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          size: item.size,
          toppings: item.toppings || [],
        })),
        status: OrderStatus.PENDING,
        subtotal,
        discountAmount,
        pointsDiscount,
        pointsToUse: createOrderDto.pointsToUse,
        pointsEarned,
        totalAmount,
        promoCode: createOrderDto.promoCode,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.orders.push(newOrder);
      return newOrder;
    });
  }

  /**
   * Tính toán giảm giá cho mã khuyến mãi với điều kiện chặt chẽ
   */
  calculatePromotionDiscount(code: string, subtotal: number): number {
    const promo = this.promotions.get(code.toUpperCase().trim());
    if (!promo) {
      throw new BadRequestException(`Mã khuyến mãi "${code}" không tồn tại.`);
    }

    if (!promo.isActive) {
      throw new BadRequestException(`Mã khuyến mãi "${code}" hiện đang bị tạm khóa.`);
    }

    if (new Date() > promo.expiredAt) {
      throw new BadRequestException(`Mã khuyến mãi "${code}" đã hết hạn sử dụng.`);
    }

    if (subtotal < promo.minOrderValue) {
      throw new BadRequestException(
        `Đơn hàng chưa đạt giá trị tối thiểu ${promo.minOrderValue.toLocaleString('vi-VN')}đ để áp dụng mã "${code}".`,
      );
    }

    let discount = 0;
    if (promo.type === 'FIXED') {
      discount = promo.value;
    } else if (promo.type === 'PERCENTAGE') {
      discount = Math.round((subtotal * promo.value) / 100);
      if (promo.maxDiscount && discount > promo.maxDiscount) {
        discount = promo.maxDiscount;
      }
    }

    return Math.min(discount, subtotal);
  }

  /**
   * Chuyển trạng thái đơn hàng theo sơ đồ Order State Machine nghiêm ngặt
   */
  transitionOrderStatus(orderCode: string, nextStatus: OrderStatus): Order {
    const order = this.findByCode(orderCode);
    const currentStatus = order.status;

    if (currentStatus === nextStatus) {
      return order; // Không thay đổi
    }

    if (currentStatus === OrderStatus.COMPLETED) {
      throw new BadRequestException(
        `Đơn hàng #${orderCode} đã hoàn tất (COMPLETED). Không thể thay đổi trạng thái nữa!`,
      );
    }

    if (currentStatus === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        `Đơn hàng #${orderCode} đã bị hủy (CANCELLED). Không thể thay đổi trạng thái nữa!`,
      );
    }

    const allowed = this.validTransitions[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Vi phạm Order State Machine: Không được phép chuyển trạng thái từ "${currentStatus}" sang "${nextStatus}".`,
      );
    }

    // Nếu đơn bị hủy, tự động hoàn trả số lượng vào kho (Restoration of Stock)
    if (nextStatus === OrderStatus.CANCELLED) {
      for (const item of order.items) {
        const currentStock = this.productStocks.get(item.productId) ?? 0;
        this.productStocks.set(item.productId, currentStock + item.quantity);
      }
    }

    order.status = nextStatus;
    order.updatedAt = new Date();
    return order;
  }

  findByCode(orderCode: string): Order {
    const order = this.orders.find(
      (o) => o.orderCode === orderCode || o.id === orderCode,
    );
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã: ${orderCode}`);
    }
    return order;
  }

  findAll(): Order[] {
    return this.orders;
  }

  // Helper quản lý kho phục vụ kiểm thử Concurrency
  getProductStock(productId: string): number {
    return this.productStocks.get(productId) ?? 0;
  }

  setProductStock(productId: string, stock: number): void {
    this.productStocks.set(productId, stock);
  }
}
