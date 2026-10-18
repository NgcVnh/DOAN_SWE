import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import {
  CART_REPOSITORY,
  ICartRepository,
} from './domain/cart.repository.interface.js';
import { Cart } from './domain/cart.entity.js';
import { CartItem } from './domain/cart-item.entity.js';
import { AddToCartDto } from './dto/add-to-cart.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { ProductsService } from '../products/products.service.js';

@Injectable()
export class CartService {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: ICartRepository,
    @Optional()
    private readonly productsService?: ProductsService,
  ) {}

  async getCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      cart = new Cart(userId);
      await this.cartRepository.save(cart);
    }
    return cart;
  }

  async addToCart(userId: string, dto: AddToCartDto): Promise<Cart> {
    const cart = await this.getCart(userId);

    let productName = dto.name;
    let productPrice = dto.price;
    let productImage = dto.image;

    // Lookup product information from ProductsService if not provided in DTO
    if (this.productsService && (!productName || productPrice === undefined)) {
      const product = this.productsService
        .findAll()
        .find((p) => p.id === Number(dto.productId));

      if (product) {
        productName = productName || product.name;
        productPrice = productPrice !== undefined ? productPrice : product.price;
        productImage = productImage || product.image;
      }
    }

    if (!productName || productPrice === undefined) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    const cartItem = new CartItem(
      Number(dto.productId),
      productName,
      productPrice,
      dto.quantity && dto.quantity > 0 ? Number(dto.quantity) : 1,
      productImage,
    );

    cart.addItem(cartItem);
    await this.cartRepository.save(cart);
    return cart;
  }

  async updateItemQuantity(
    userId: string,
    productId: number,
    dto: UpdateCartItemDto,
  ): Promise<Cart> {
    const cart = await this.getCart(userId);
    cart.updateItemQuantity(Number(productId), Number(dto.quantity));
    await this.cartRepository.save(cart);
    return cart;
  }

  async removeItem(userId: string, productId: number): Promise<Cart> {
    const cart = await this.getCart(userId);
    cart.removeItem(Number(productId));
    await this.cartRepository.save(cart);
    return cart;
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.getCart(userId);
    cart.clear();
    await this.cartRepository.save(cart);
  }
}

