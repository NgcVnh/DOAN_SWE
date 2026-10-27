import { describe, it, expect } from 'vitest';

describe('Optimistic Locking & Concurrent Inventory Control (Task 10.3)', () => {
  interface ProductInventory {
    id: number;
    name: string;
    stock: number;
    version: number;
  }

  function deductStockWithOptimisticLock(
    product: ProductInventory,
    quantity: number,
    expectedVersion: number,
  ): boolean {
    if (product.version !== expectedVersion || product.stock < quantity) {
      return false; 
    }

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

    const concurrentRequestsCount = 10; 
    let successfulOrders = 0;
    let rejectedOrders = 0;

    const readVersion = product.version;

    const promises = Array.from({ length: concurrentRequestsCount }).map(async (_, index) => {
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

      const success = deductStockWithOptimisticLock(product, 1, readVersion);
      if (success) {
        successfulOrders++;
      } else {
        rejectedOrders++;
      }
    });

    await Promise.all(promises);

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
        await new Promise((r) => setTimeout(r, Math.random() * 5));
      }
    });

    await Promise.all(promises);

    expect(successfulOrders).toBe(initialStock);
    expect(product.stock).toBe(0);
    expect(product.stock).toBeGreaterThanOrEqual(0); 
    expect(product.version).toBe(initialStock + 1);
  });
});
