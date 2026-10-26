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
  }
}
