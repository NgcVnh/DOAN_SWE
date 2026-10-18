import { Injectable } from '@nestjs/common';
import { Products } from './Interfaces/product.interface.js';
//mock data
@Injectable()
export class ProductsService {
  private readonly products: Products[] = [
    {
      id: 1,
      name: 'Laptop ASUS',
      price: 15000000,
      image: 'https://placehold.co/400x300?text=ASUS',
    },
    {
      id: 2,
      name: 'Laptop Dell',
      price: 18000000,
      image: 'https://placehold.co/400x300?text=Dell',
    },
    {
      id: 3,
      name: 'Chuột Logitech',
      price: 500000,
      image: 'https://placehold.co/400x300?text=Logitech',
    },
  ];

  findAll(): Products[] {
    return this.products;
  }
}
