export interface ICartItem {
  productId: number;
  name: string;
  price: number;
  image?: string;
  quantity: number;
}

export interface ICart {
  id: string;
  userId: string;
  items: ICartItem[];
  totalPrice: number;
  totalQuantity: number;
}

