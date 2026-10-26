import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderStatus, DrinkSize } from './enums/order-status.enum.js';
import { Order } from './entities/order.entity.js';
import { randomUUID } from 'crypto';

/**
 * Lớp Mutex xử lý kiểm soát đồng thời (Concurrency Control / Race-Condition Prevention)
 * Đảm bảo các giao dịch đặt hàng đồng thời được tuần tự hóa, tránh Lost Update và Dirty Read.
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

// Bảng ánh xạ trạng thái hợp lệ theo Order State Machine (Mục 9.1)
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.PAID,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAYMENT_FAILED]: [
    OrderStatus.PAID,
    OrderStatus.PENDING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
  private readonly orders: Order[] = [];
  private readonly mutex = new AsyncMutex();

  // =========================================================================
  // TASK 10.2: QUẢN LÝ TỒN KHO & KIỂM SOÁT ĐỒNG THỜI (CONCURRENCY CONTROL)
  // Bảng theo dõi số lượng tồn kho của từng sản phẩm trong kho
  // =========================================================================
  private readonly productStocks: Map<string, number> = new Map([
    ['1', 50],
    ['2', 50],
    ['3', 30],
    ['4', 40],
    ['prod-1', 50],
    ['prod-2', 50],
    ['prod-tra-sua-olong', 25],
    ['prod-cafe', 30],
    ['prod-limited', 2], // Sản phẩm số lượng có hạn để kiểm thử race-condition chống bán vượt
  ]);

  /**
   * Tạo đơn hàng mới với Transaction kiểm soát tồn kho đồng thời an toàn:
   * 1. Kiểm tra tồn kho toàn bộ giỏ hàng (Validation Phase).
   * 2. Trừ tồn kho đồng thời an toàn, ngăn chặn bán vượt tồn kho (Overselling Prevention).
   * 3. Tạo đơn hàng và lưu trữ nhất quán (Consistent Transaction).
   * 4. Tự động Rollback hoàn trả kho nếu xảy ra lỗi bất ngờ.
   */
  async createOrder(
    createOrderDto: CreateOrderDto,
    userId: string | number = '0',
  ): Promise<Order> {
    return this.mutex.runExclusive(async () => {
      // -------------------------------------------------------------
      // BƯỚC 1: KIỂM TRA TỒN KHO TOÀN BỘ SẢN PHẨM (Validation Phase)
      // Chống bán vượt tồn kho (Overselling Prevention)
      // -------------------------------------------------------------
      for (const item of createOrderDto.items) {
        const availableStock = this.getProductStock(item.productId);
        if (availableStock < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm ID "${item.productId}" không đủ tồn kho (Còn lại: ${availableStock}, yêu cầu: ${item.quantity}). Vui lòng giảm số lượng!`,
          );
        }
      }

      // -------------------------------------------------------------
      // BƯỚC 2: TRANSACTION NGUYÊN TỬ (Atomic Deduction & Order Creation)
      // Đảm bảo tạo đơn và trừ kho hoàn toàn nhất quán.
      // Nếu có bất kỳ lỗi nào xảy ra -> Tự động ROLLBACK.
      // -------------------------------------------------------------
      const deductedItems: { productId: string; qty: number }[] = [];

      try {
        // Thực hiện trừ kho từng món
        for (const item of createOrderDto.items) {
          const currentStock = this.getProductStock(item.productId);
          const newStock = currentStock - item.quantity;
          this.setProductStock(item.productId, newStock);
          deductedItems.push({ productId: item.productId, qty: item.quantity });
        }

        // Tạo mã đơn và tính tổng tiền
        const timestamp = Date.now();
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const orderCode = `ORD-${timestamp}-${randomSuffix}`;

        // Tính tổng tiền ước tính cho đơn hàng (Base: 35.000đ, Size M +5k, L +10k, mỗi topping +5k)
        const totalAmount = createOrderDto.items.reduce((sum, item) => {
          let itemPrice = 35000;
          if (item.size === DrinkSize.M) itemPrice += 5000;
          if (item.size === DrinkSize.L) itemPrice += 10000;
          if (item.toppings && item.toppings.length > 0) {
            itemPrice += item.toppings.length * 5000;
          }
          return sum + itemPrice * item.quantity;
        }, 0);

        const newOrder: Order = {
          id:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : randomUUID(),
          orderCode,
          userId: String(userId),
          items: createOrderDto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            toppings: item.toppings || [],
          })),
          status: OrderStatus.PENDING,
          totalAmount,
          promoCode: createOrderDto.promoCode,
          pointsToUse: createOrderDto.pointsToUse,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        this.orders.push(newOrder);
        return newOrder;
      } catch (error) {
        // ROLLBACK: Hoàn tác lại toàn bộ số lượng kho đã trừ nếu xảy ra lỗi
        for (const d of deductedItems) {
          const cur = this.getProductStock(d.productId);
          this.setProductStock(d.productId, cur + d.qty);
        }
        throw error;
      }
    });
  }

  findByUserId(userId: string | number, status?: OrderStatus): Order[] {
    const targetUserId = String(userId);
    return this.orders
      .filter((order) => {
        const matchUser = String(order.userId) === targetUserId;
        const matchStatus = status ? order.status === status : true;
        return matchUser && matchStatus;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
    return [...this.orders].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  /**
   * Chuyển trạng thái đơn hàng theo sơ đồ Order State Machine
   * Tự động hoàn trả tồn kho (Restoration of Stock) khi đơn hàng bị hủy (CANCELLED).
   */
  transitionOrderStatus(orderCode: string, nextStatus: OrderStatus): Order {
    const order = this.findByCode(orderCode);
    const allowedNext = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowedNext.includes(nextStatus)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái đơn hàng từ "${order.status}" sang "${nextStatus}"`,
      );
    }

    // Tự động hoàn trả lại tồn kho vào kho hàng nếu đơn bị hủy
    if (nextStatus === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
      for (const item of order.items) {
        const cur = this.getProductStock(item.productId);
        this.setProductStock(item.productId, cur + item.quantity);
      }
    }

    order.status = nextStatus;
    order.updatedAt = new Date();
    return order;
  }

  // =========================================================================
  // HELPER METHODS: QUẢN LÝ TỒN KHO PHỤC VỤ DEBUG & KIỂM THỬ (TESTING)
  // =========================================================================

  /**
   * Lấy số lượng tồn kho hiện tại của một sản phẩm
   */
  getProductStock(productId: string): number {
    return this.productStocks.get(productId) ?? 50; // Mặc định 50 nếu chưa cấu hình
  }

  /**
   * Cập nhật số lượng tồn kho (Hữu ích khi setup kịch bản kiểm thử)
   */
  setProductStock(productId: string, stock: number): void {
    this.productStocks.set(productId, Math.max(0, stock));
  }

  /**
   * Lấy toàn bộ trạng thái tồn kho của hệ thống để debug
   */
  getAllStocks(): Record<string, number> {
    const stocks: Record<string, number> = {};
    for (const [key, val] of this.productStocks.entries()) {
      stocks[key] = val;
    }
    return stocks;
  }
}

