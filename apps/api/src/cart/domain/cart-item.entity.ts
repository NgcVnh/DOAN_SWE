import { ICartItem } from './cart.interface.js';

export class CartItem implements ICartItem {
  public productId: number;
  public name: string;
  public price: number;
  public image?: string;
  public quantity: number;

  constructor(
    productId: number,
    name: string,
    price: number,
    quantity: number = 1,
    image?: string,
  ) {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }
    if (price < 0) {
      throw new Error('Price cannot be negative');
    }

    this.productId = productId;
    this.name = name;
    this.price = price;
    this.quantity = quantity;
    this.image = image;
  }

  updateQuantity(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }
    this.quantity = quantity;
  }

  increaseQuantity(amount: number = 1): void {
    if (amount <= 0) {
      throw new Error('Amount to increase must be positive');
    }
    this.quantity += amount;
  }

  decreaseQuantity(amount: number = 1): void {
    if (amount <= 0) {
      throw new Error('Amount to decrease must be positive');
    }
    if (this.quantity - amount <= 0) {
      throw new Error('Quantity cannot be reduced below 1');
    }
    this.quantity -= amount;
  }

  getTotalPrice(): number {
    return this.price * this.quantity;
  }

  toJSON(): ICartItem {
    return {
      productId: this.productId,
      name: this.name,
      price: this.price,
      quantity: this.quantity,
      image: this.image,
    };
  }
}

