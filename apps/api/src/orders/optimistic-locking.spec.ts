import { describe, it, expect } from 'vitest';

/**
 * [Task 10.3 - Concurrency Control & Optimistic Locking]
 * Mô phỏng thuật toán Optimistic Locking với trường version để kiểm soát tồn kho khi nhiều khách đặt đồng thời.
 */
describe('Optimistic Locking & Concurrent Inventory Control (Task 10.3)', () => {
  interface ProductInventory {
    id: number;
    name: string;
    stock: number;
    version: number;
  }

  // Hàm mô phỏng transaction cập nhật tồn kho với Optimistic Locking
  function deductStockWithOptimisticLock(
    product: ProductInventory,
    quantity: number,
    expectedVersion: number,
  ): boolean {
    // Điều kiện Optimistic Locking: Phải khớp version và đủ tồn kho
    if (product.version !== expectedVersion || product.stock < quantity) {
      return false; // Xung đột phiên bản (version mismatch) hoặc hết hàng
    }

    // Giả lập cập nhật nguyên tử (Atomic Update)
    product.stock -= quantity;
    product.version += 1;
    return true;
  }

  it('(c) Đặt đồng thời không vượt quá tồn kho (Optimistic Locking test)', async () => {
    const initialStock = 5;
    const product: ProductInventory = {
      id: 1,
      name: 'Cà phê Robusta Đặc Biệt',
      stock: initialStock,
      version: 1,
    };

    const concurrentRequestsCount = 10; // 10 yêu cầu đặt hàng đồng thời
    let successfulOrders = 0;
    let rejectedOrders = 0;

    // Giả lập 10 khách hàng cùng đọc version ban đầu và đồng thời gửi yêu cầu mua 1 món
    const readVersion = product.version;

    const promises = Array.from({ length: concurrentRequestsCount }).map(async (_, index) => {
      // Giả lập độ trễ mạng ngẫu nhiên nhỏ
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

      const success = deductStockWithOptimisticLock(product, 1, readVersion);
      if (success) {
        successfulOrders++;
      } else {
        rejectedOrders++;
      }
    });

    await Promise.all(promises);

    // Vì tất cả 10 request cùng đọc expectedVersion = 1,
    // Chỉ đúng 1 request đầu tiên được phép thành công và nâng version lên 2.
    // 9 request còn lại bị từ chối do version mismatch (Optimistic Locking hoạt động chính xác)
    expect(successfulOrders).toBe(1);
    expect(rejectedOrders).toBe(9);
    expect(product.stock).toBe(initialStock - 1);
    expect(product.version).toBe(2);
  });

  it('Thử lại có giới hạn (Retry Loop) xử lý hết sạch tồn kho mà không bao giờ bị âm', async () => {
    const initialStock = 3;
    const product: ProductInventory = {
      id: 2,
      name: 'Trà Oolong nướng',
      stock: initialStock,
      version: 1,
    };

    const buyers = 10;
    let successfulOrders = 0;

    // Mô phỏng 10 buyer với retry loop (tối đa 5 lần thử lại khi xung đột version)
    const promises = Array.from({ length: buyers }).map(async () => {
      let attempts = 0;
      const maxRetries = 5;

      while (attempts < maxRetries) {
        attempts++;
        const currentVersion = product.version;
        if (product.stock <= 0) break;

        const success = deductStockWithOptimisticLock(product, 1, currentVersion);
        if (success) {
          successfulOrders++;
          break;
        }
        // Jitter delay nhỏ trước khi retry
        await new Promise((r) => setTimeout(r, Math.random() * 5));
      }
    });

    await Promise.all(promises);

    // Số lượng bán thành công đúng bằng tồn kho ban đầu (3 món), không bao giờ vượt quá tồn kho
    expect(successfulOrders).toBe(initialStock);
    expect(product.stock).toBe(0);
    expect(product.stock).toBeGreaterThanOrEqual(0); // Không bị âm
    expect(product.version).toBe(initialStock + 1);
  });
});
