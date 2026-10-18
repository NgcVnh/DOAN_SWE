import { CartItem } from './cart-item.entity.js';
import { ICart } from './cart.interface.js';

export class Cart implements ICart {
  public id: string;
  public userId: string;
  public items: CartItem[];

  constructor(userId: string, id: string = crypto.randomUUID(), items: CartItem[] = []) {
    this.userId = userId;
    this.id = id;
    this.items = items;
  }

  addItem(newItem: CartItem): void {
    const existingItem = this.items.find(
      (item) => item.productId === newItem.productId,
    );

    if (existingItem) {
      existingItem.increaseQuantity(newItem.quantity);
    } else {
      this.items.push(newItem);
    }
  }

  removeItem(productId: number): void {
    this.items = this.items.filter((item) => item.productId !== productId);
  }

  updateItemQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }

    const item = this.items.find((i) => i.productId === productId);
    if (item) {
      item.updateQuantity(quantity);
    } else {
      throw new Error(`Item with product ID ${productId} not found in cart`);
    }
  }

  clear(): void {
    this.items = [];
  }

  get totalPrice(): number {
    return this.getTotalPrice();
  }

  get totalQuantity(): number {
    return this.getTotalQuantity();
  }

  getTotalPrice(): number {
    return this.items.reduce((total, item) => total + item.getTotalPrice(), 0);
  }

  getTotalQuantity(): number {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  getItems(): CartItem[] {
    return [...this.items];
  }

  toJSON(): ICart {
    return {
      id: this.id,
      userId: this.userId,
      items: this.items.map((item) => item.toJSON()),
      totalPrice: this.getTotalPrice(),
      totalQuantity: this.getTotalQuantity(),
    };
  }
}

