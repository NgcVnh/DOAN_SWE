import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { Products } from './Interfaces/product.interface.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(): Promise<Products[]> {
    return this.productsService.findAll();
  }

  @Get('toppings')
  async findAllToppings() {
    return this.productsService.findAllToppings();
  }

  @Get('ingredients')
  async findAllIngredients() {
    return this.productsService.findAllIngredients();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Products> {
    return this.productsService.findOne(id);
  }
}
