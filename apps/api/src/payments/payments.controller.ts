import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async createPayment(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.processPayment(dto);
  }

  @Get('vnpay-return')
  async handleVnpayReturn(@Query() query: Record<string, string>) {
    return this.paymentsService.verifyVnpayReturn(query);
  }

  @Get('zalopay-return')
  async handleZalopayReturn(@Query() query: Record<string, string>) {
    return this.paymentsService.verifyZalopayReturn(query);
  }

  @Get('order/:orderId')
  async getPaymentsByOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.getPaymentsByOrderId(orderId);
  }
}
