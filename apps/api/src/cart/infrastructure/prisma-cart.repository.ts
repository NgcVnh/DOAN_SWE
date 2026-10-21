import { Injectable, Optional } from '@nestjs/common';
import { ICartRepository } from '../domain/cart.repository.interface.js';
import { Cart } from '../domain/cart.entity.js';
import { CartItem } from '../domain/cart-item.entity.js';

@Injectable()
export class PrismaCartRepository implements ICartRepository {
  // In-memory store fallback when Prisma client is not yet configured
  private readonly carts: Map<string, Cart> = new Map();

  constructor(
    // Optional PrismaService injection once Prisma is configured in the project
    @Optional() private readonly prisma?: any,
  ) {}

  async findByUserId(userId: string): Promise<Cart | null> {
    if (this.prisma?.cart) {
      // Prisma schema example:
      // const cartRecord = await this.prisma.cart.findUnique({
      //   where: { userId },
      //   include: { items: true },
      // });
      // return cartRecord ? this.mapToDomain(cartRecord) : null;
    }

    const cart = this.carts.get(userId);
    return cart ?? null;
  }

  async save(cart: Cart): Promise<Cart> {
    if (this.prisma?.cart) {
      // Prisma schema upsert example:
      // await this.prisma.cart.upsert({ ... });
    }

    // Persist to store
    this.carts.set(cart.userId, cart);
    return cart;
  }

  async deleteByUserId(userId: string): Promise<void> {
    if (this.prisma?.cart) {
      // await this.prisma.cart.delete({ where: { userId } });
    }

    this.carts.delete(userId);
  }

  private mapToDomain(record: any): Cart {
    const items = (record.items || []).map(
      (item: any) =>
        new CartItem(
          item.productId,
          item.name,
          item.price,
          item.quantity,
          item.image,
        ),
    );
    return new Cart(record.userId, record.id, items);
  }
}

