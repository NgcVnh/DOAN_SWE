import { Injectable } from '@nestjs/common';
import { Products } from './Interfaces/product.interface.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  RECIPE_STANDARDS,
  getProductRecipeCode,
  getRecipeItem,
} from './sugar-ice.calculator.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // Danh sách nguyên liệu trong bộ nhớ (In-memory fallback & đồng bộ DB)
  private static inMemoryToppings = [
    { id: 1, name: 'Trân châu đen', price: 10000, stock: 15, isAvailable: true },
    { id: 2, name: 'Trân châu trắng', price: 10000, stock: 0, isAvailable: false },
    { id: 3, name: 'Kem Cheese', price: 12000, stock: 8, isAvailable: true },
    { id: 4, name: 'Thạch nha đam', price: 8000, stock: 20, isAvailable: true },
  ];

  private static inMemoryIngredients = [
    { code: 'SUGAR', name: 'Đường cát tinh luyện', stock: 20000, unit: 'g', minThreshold: 1000 },
    { code: 'ICE', name: 'Đá viên tinh khiết', stock: 50000, unit: 'g', minThreshold: 2000 },
    { code: 'COFFEE_BEANS', name: 'Hạt cà phê Robusta rang mộc', stock: 5000, unit: 'g', minThreshold: 500 }, // 5kg
    { code: 'TEA_LEAVES', name: 'Lá trà Oolong & Trà đen khô', stock: 3000, unit: 'g', minThreshold: 300 },   // 3kg
    { code: 'MILK', name: 'Sữa tươi & Sữa đặc pha chế', stock: 10000, unit: 'ml', minThreshold: 1000 },      // 10 lít
  ];

  // Theo dõi các đơn hàng đã trừ tồn kho / hoàn tồn kho để đảm bảo Idempotent (chống trừ lặp / hoàn lặp)
  private static readonly deductedSugarIceOrders = new Set<number>();
  private static readonly deductedToppingOrders = new Set<number>();
  private static readonly restoredStockOrders = new Set<number>();

  static isSugarIceDeducted(orderId: number): boolean {
    return ProductsService.deductedSugarIceOrders.has(orderId);
  }

  static markSugarIceDeducted(orderId: number): void {
    ProductsService.deductedSugarIceOrders.add(orderId);
    ProductsService.restoredStockOrders.delete(orderId);
  }

  static isToppingDeducted(orderId: number): boolean {
    return ProductsService.deductedToppingOrders.has(orderId);
  }

  static markToppingDeducted(orderId: number): void {
    ProductsService.deductedToppingOrders.add(orderId);
    ProductsService.restoredStockOrders.delete(orderId);
  }

  static isStockRestored(orderId: number): boolean {
    return ProductsService.restoredStockOrders.has(orderId);
  }

  static markStockRestored(orderId: number): void {
    ProductsService.restoredStockOrders.add(orderId);
    ProductsService.deductedSugarIceOrders.delete(orderId);
    ProductsService.deductedToppingOrders.delete(orderId);
  }

  /**
   * Kiểm tra một sản phẩm có đủ nguyên liệu tối thiểu (Size S) để bán hay không
   */
  static isProductAvailableByStock(
    productName: string,
    coffeeStock: number,
    teaStock: number,
    milkStock: number = 999999,
  ): boolean {
    const recipeS = getRecipeItem(productName, 'S');
    if (recipeS.coffee > 0 && coffeeStock < recipeS.coffee) return false;
    if (recipeS.tea > 0 && teaStock < recipeS.tea) return false;
    if (recipeS.milk > 0 && milkStock < recipeS.milk) return false;
    return true;
  }

  async findAll(): Promise<Products[]> {
    let coffeeStock = ProductsService.getInMemoryIngredientStock('COFFEE_BEANS');
    let teaStock = ProductsService.getInMemoryIngredientStock('TEA_LEAVES');
    let milkStock = ProductsService.getInMemoryIngredientStock('MILK');

    try {
      if (this.prisma?.isConnected !== false && (this.prisma as any)?.ingredient?.findUnique) {
        const cRecord = await (this.prisma as any).ingredient.findUnique({ where: { code: 'COFFEE_BEANS' } });
        const tRecord = await (this.prisma as any).ingredient.findUnique({ where: { code: 'TEA_LEAVES' } });
        const mRecord = await (this.prisma as any).ingredient.findUnique({ where: { code: 'MILK' } });
        if (cRecord) coffeeStock = cRecord.stock;
        if (tRecord) teaStock = tRecord.stock;
        if (mRecord) milkStock = mRecord.stock;
      }
    } catch {
      // In-memory fallback
    }

    try {
      if (this.prisma?.isConnected !== false && this.prisma?.product?.findMany) {
        const products = await this.prisma.product.findMany({
          orderBy: { id: 'asc' },
        });

        if (products && products.length > 0) {
          return products.map((p) => {
            const hasBaseIngredient = ProductsService.isProductAvailableByStock(
              p.name,
              coffeeStock,
              teaStock,
              milkStock,
            );
            return {
              id: p.id,
              name: p.name,
              price: p.price,
              image: p.imageUrl || '',
              description: p.description ?? undefined,
              isAvailable: p.isAvailable && hasBaseIngredient,
            };
          });
        }
      }
    } catch {
    }

    const fallbackProducts = [
      {
        id: 1,
        name: 'Cà phê Đen Đá',
        price: 25000,
        image: '/images/coffee1.png',
        description: 'Cà phê Robusta rang đậm nguyên chất mang hương vị truyền thống.',
      },
      {
        id: 2,
        name: 'Cà phê Sữa Đá',
        price: 29000,
        image: '/images/coffee2.png',
        description: 'Sự hòa quyện hoàn hảo giữa cà phê đậm đà và sữa đặc ngọt béo.',
      },
      {
        id: 3,
        name: 'Trà Sữa Ô Long',
        price: 35000,
        image: '/images/tea1.png',
        description: 'Trà ô long thượng hạng kết hợp sữa tươi thanh béo.',
      },
      {
        id: 4,
        name: 'Bạc Xỉu',
        price: 32000,
        image: '/images/coffee3.png',
        description: 'Nhiều sữa ít cà phê, béo ngậy ngọt ngào phù hợp mọi người.',
      },
    ];

    return fallbackProducts.map((p) => ({
      ...p,
      isAvailable: ProductsService.isProductAvailableByStock(p.name, coffeeStock, teaStock, milkStock),
    }));
  }

  async findAllToppings() {
    try {
      if (this.prisma?.isConnected !== false && this.prisma?.topping?.findMany) {
        const toppings = await this.prisma.topping.findMany({
          orderBy: { id: 'asc' },
        });
        if (toppings && toppings.length > 0) {
          return toppings.map((t) => ({
            id: t.id,
            name: t.name,
            price: t.price,
            stock: t.stock,
            isAvailable: t.isAvailable && t.stock > 0,
          }));
        }
      }
    } catch {
    }

    return ProductsService.inMemoryToppings.map((t) => ({
      ...t,
      isAvailable: t.isAvailable && t.stock > 0,
    }));
  }

  static deductInMemoryToppingStock(name: string, quantity: number) {
    const item = ProductsService.inMemoryToppings.find(
      (t) => t.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (item) {
      item.stock = Math.max(0, item.stock - quantity);
      if (item.stock === 0) {
        item.isAvailable = false;
      }
    }
  }

  static restoreInMemoryToppingStock(name: string, quantity: number) {
    const item = ProductsService.inMemoryToppings.find(
      (t) => t.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (item) {
      item.stock += quantity;
      item.isAvailable = item.stock > 0;
    }
  }

  async findAllIngredients() {
    try {
      if (this.prisma?.isConnected !== false && (this.prisma as any)?.ingredient?.findMany) {
        const list = await (this.prisma as any).ingredient.findMany({
          orderBy: { id: 'asc' },
        });
        if (list && list.length > 0) {
          return list.map((item: any) => ({
            code: item.code,
            name: item.name,
            stock: item.stock,
            unit: item.unit,
            isAvailable: item.stock > 0,
          }));
        }
      }
    } catch {
    }

    return ProductsService.inMemoryIngredients.map((item) => ({
      code: item.code,
      name: item.name,
      stock: item.stock,
      unit: item.unit,
      isAvailable: item.stock > 0,
    }));
  }

  static deductInMemoryIngredientStock(
    code: 'SUGAR' | 'ICE' | 'COFFEE_BEANS' | 'TEA_LEAVES' | 'MILK' | string,
    amountGramsOrMl: number,
  ) {
    const ing = ProductsService.inMemoryIngredients.find((i) => i.code === code);
    if (ing) {
      ing.stock = Math.max(0, Math.round((ing.stock - amountGramsOrMl) * 10) / 10);
    }
  }

  static restoreInMemoryIngredientStock(
    code: 'SUGAR' | 'ICE' | 'COFFEE_BEANS' | 'TEA_LEAVES' | 'MILK' | string,
    amountGramsOrMl: number,
  ) {
    const ing = ProductsService.inMemoryIngredients.find((i) => i.code === code);
    if (ing) {
      ing.stock = Math.round((ing.stock + amountGramsOrMl) * 10) / 10;
    }
  }

  static getInMemoryIngredientStock(
    code: 'SUGAR' | 'ICE' | 'COFFEE_BEANS' | 'TEA_LEAVES' | 'MILK' | string,
  ): number {
    const ing = ProductsService.inMemoryIngredients.find((i) => i.code === code);
    return ing ? ing.stock : 999999;
  }

  static setInMemoryIngredientStock(
    code: 'SUGAR' | 'ICE' | 'COFFEE_BEANS' | 'TEA_LEAVES' | 'MILK' | string,
    newStock: number,
  ) {
    const ing = ProductsService.inMemoryIngredients.find((i) => i.code === code);
    if (ing) {
      ing.stock = Math.max(0, newStock);
    }
  }
}
