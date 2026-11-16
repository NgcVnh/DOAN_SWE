import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { GetMyOrdersDto } from './dto/get-my-orders.dto.js';
import { Order } from './entities/order.entity.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser('id') userId: string,
  ): Promise<Order> {
    return await this.ordersService.createOrder(createOrderDto, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllOrders(@CurrentUser('id') userId: string): Promise<Order[]> {
    return await this.ordersService.findByUserId(userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(
    @CurrentUser('id') userId: string,
    @Query() query?: GetMyOrdersDto,
  ): Promise<Order[]> {
    return await this.ordersService.findByUserId(userId, query?.status);
  }

  @Get(':orderCode')
  @UseGuards(JwtAuthGuard)
  async getOrder(
    @Param('orderCode') orderCode: string,
    @CurrentUser('id') userId: string,
  ): Promise<Order> {
    return await this.ordersService.findByCode(orderCode, userId);
  }

  @Patch(':orderCode/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('orderCode') orderCode: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    return await this.ordersService.transitionOrderStatus(orderCode, updateStatusDto.status);
  }
}
