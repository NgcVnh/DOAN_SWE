import { Injectable } from '@nestjs/common';
import { Products } from './Interfaces/product.interface.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Products[]> {
    try {
      if (this.prisma?.isConnected !== false && this.prisma?.product?.findMany) {
        const products = await this.prisma.product.findMany({
          orderBy: { id: 'asc' },
        });

        if (products && products.length > 0) {
          return products.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.imageUrl || '',
            description: p.description ?? undefined,
            stock: p.stock,
            isAvailable: p.isAvailable && p.stock > 0,
          }));
        }
      }
    } catch {
    }

    return [
      {
        id: 1,
        name: 'Cà phê Đen Đá',
        price: 25000,
        image: '/images/coffee1.png',
        description: 'Cà phê Robusta rang đậm nguyên chất mang hương vị truyền thống.',
        stock: 50,
        isAvailable: true,
      },
      {
        id: 2,
        name: 'Cà phê Sữa Đá',
        price: 29000,
        image: '/images/coffee2.png',
        description: 'Sự hòa quyện hoàn hảo giữa cà phê đậm đà và sữa đặc ngọt béo.',
        stock: 50,
        isAvailable: true,
      },
      {
        id: 3,
        name: 'Trà Sữa Ô Long',
        price: 35000,
        image: '/images/tea1.png',
        description: 'Trà ô long thượng hạng kết hợp sữa tươi thanh béo.',
        stock: 50,
        isAvailable: true,
      },
      {
        id: 4,
        name: 'Bạc Xỉu',
        price: 32000,
        image: '/images/coffee3.png',
        description: 'Nhiều sữa ít cà phê, béo ngậy ngọt ngào phù hợp mọi người.',
        stock: 50,
        isAvailable: true,
      },
    ];
  }

  private static inMemoryToppings = [
    { id: 1, name: 'Trân châu đen', price: 10000, stock: 15, isAvailable: true },
    { id: 2, name: 'Trân châu trắng', price: 10000, stock: 0, isAvailable: false },
    { id: 3, name: 'Kem Cheese', price: 12000, stock: 8, isAvailable: true },
    { id: 4, name: 'Thạch nha đam', price: 8000, stock: 20, isAvailable: true },
  ];

  // In-memory fallback cho nguyên liệu Đường & Đá (đơn vị: gram)
  private static inMemoryIngredients = [
    { code: 'SUGAR', name: 'Đường cát tinh luyện', stock: 20000, unit: 'g', minThreshold: 1000 },
    { code: 'ICE', name: 'Đá viên tinh khiết', stock: 50000, unit: 'g', minThreshold: 2000 },
  ];

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

  static deductInMemoryIngredientStock(code: 'SUGAR' | 'ICE', amountGrams: number) {
    const ing = ProductsService.inMemoryIngredients.find((i) => i.code === code);
    if (ing) {
      ing.stock = Math.max(0, Math.round((ing.stock - amountGrams) * 10) / 10);
    }
  }

  static getInMemoryIngredientStock(code: 'SUGAR' | 'ICE'): number {
    const ing = ProductsService.inMemoryIngredients.find((i) => i.code === code);
    return ing ? ing.stock : 999999;
  }

  static setInMemoryIngredientStock(code: 'SUGAR' | 'ICE', newStock: number) {
    const ing = ProductsService.inMemoryIngredients.find((i) => i.code === code);
    if (ing) {
      ing.stock = Math.max(0, newStock);
    }
  }
}
