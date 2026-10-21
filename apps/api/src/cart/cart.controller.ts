import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CartService } from './cart.service.js';
import { AddToCartDto } from './dto/add-to-cart.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private resolveUserId(userIdHeader?: string, userIdQuery?: string): string {
    return userIdHeader || userIdQuery || 'default-user';
  }

  @Get()
  async getCart(
    @Headers('x-user-id') userIdHeader?: string,
    @Query('userId') userIdQuery?: string,
  ) {
    const userId = this.resolveUserId(userIdHeader, userIdQuery);
    const cart = await this.cartService.getCart(userId);
    return cart.toJSON();
  }

  @Post(['', 'items'])
  async addToCart(
    @Body() dto: AddToCartDto,
    @Headers('x-user-id') userIdHeader?: string,
    @Query('userId') userIdQuery?: string,
  ) {
    const userId = this.resolveUserId(userIdHeader, userIdQuery);
    const cart = await this.cartService.addToCart(userId, dto);
    return cart.toJSON();
  }

  @Put('items/:productId')
  async updateItemQuantity(
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
    @Headers('x-user-id') userIdHeader?: string,
    @Query('userId') userIdQuery?: string,
  ) {
    const userId = this.resolveUserId(userIdHeader, userIdQuery);
    const cart = await this.cartService.updateItemQuantity(
      userId,
      Number(productId),
      dto,
    );
    return cart.toJSON();
  }

  @Patch('items/:productId')
  async patchItemQuantity(
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
    @Headers('x-user-id') userIdHeader?: string,
    @Query('userId') userIdQuery?: string,
  ) {
    return this.updateItemQuantity(productId, dto, userIdHeader, userIdQuery);
  }

  @Delete('items/:productId')
  async removeItem(
    @Param('productId') productId: string,
    @Headers('x-user-id') userIdHeader?: string,
    @Query('userId') userIdQuery?: string,
  ) {
    const userId = this.resolveUserId(userIdHeader, userIdQuery);
    const cart = await this.cartService.removeItem(userId, Number(productId));
    return cart.toJSON();
  }

  @Delete()
  async clearCart(
    @Headers('x-user-id') userIdHeader?: string,
    @Query('userId') userIdQuery?: string,
  ) {
    const userId = this.resolveUserId(userIdHeader, userIdQuery);
    await this.cartService.clearCart(userId);
    return { success: true, message: 'Cart cleared successfully' };
  }
}

