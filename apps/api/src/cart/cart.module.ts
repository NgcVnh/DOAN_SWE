import { Module } from '@nestjs/common';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';
import { CART_REPOSITORY } from './domain/cart.repository.interface.js';
import { PrismaCartRepository } from './infrastructure/prisma-cart.repository.js';
import { ProductsModule } from '../products/products.module.js';

@Module({
  imports: [ProductsModule],
  controllers: [CartController],
  providers: [
    CartService,
    {
      provide: CART_REPOSITORY,
      useClass: PrismaCartRepository,
    },
  ],
  exports: [CartService, CART_REPOSITORY],
})
export class CartModule {}

