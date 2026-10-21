import { Injectable } from '@nestjs/common';
import { Products } from './Interfaces/product.interface.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy toàn bộ danh sách sản phẩm từ bảng products qua Prisma ORM
   * Tiêu chí Task 2: NestJS GET /products trả về JSON menu (id, tên, giá, ảnh) từ CSDL
   */
  async findAll(): Promise<Products[]> {
    const products = await this.prisma.product.findMany({
      orderBy: { id: 'asc' },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.imageUrl || '',
      description: p.description ?? undefined,
    }));
  }
}
