import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { GetMyOrdersDto } from './dto/get-my-orders.dto.js';
import { Order } from './entities/order.entity.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

interface AuthenticatedRequest {
  user?: {
    id?: string;
    sub?: string;
  };
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser('id') userId: string,
  ): Promise<Order> {
    return this.ordersService.createOrder(createOrderDto, userId);
  }

  @Get()
  async getAllOrders(): Promise<Order[]> {
    return this.ordersService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(
    @CurrentUser('id') userId: string,
    @Query() query?: GetMyOrdersDto,
  ): Promise<Order[]> {
    return this.ordersService.findByUserId(userId, query?.status);
  }

  // Hỗ trợ xem chi tiết đơn và chuyển trạng thái 
  @Get(':orderCode')
  async getOrder(@Param('orderCode') orderCode: string): Promise<Order> {
    return this.ordersService.findByCode(orderCode);
  }

  @Patch(':orderCode/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('orderCode') orderCode: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    return this.ordersService.transitionOrderStatus(orderCode, updateStatusDto.status);
  }
}
