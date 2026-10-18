import { Cart } from './cart.entity.js';

export const CART_REPOSITORY = 'CART_REPOSITORY';

export interface ICartRepository {
  findByUserId(userId: string): Promise<Cart | null>;
  save(cart: Cart): Promise<Cart>;
  deleteByUserId(userId: string): Promise<void>;
}

