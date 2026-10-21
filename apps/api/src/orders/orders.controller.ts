import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(createOrderDto);
  }

  @Get()
  async getAllOrders() {
    return this.ordersService.findAll();
  }

  // Hỗ trợ xem chi tiết đơn và chuyển trạng thái 
  @Get(':orderCode')
  async getOrder(@Param('orderCode') orderCode: string) {
    return this.ordersService.findByCode(orderCode);
  }

  @Patch(':orderCode/status')
  async updateStatus(
    @Param('orderCode') orderCode: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.transitionOrderStatus(orderCode, updateStatusDto.status);
  }
}

