import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';

/**
 * [OOP - Single Responsibility Principle]
 * PaymentsController tiếp nhận HTTP Request (/payments),
 * nhận dữ liệu đã được validate qua CreatePaymentDto và chuyển giao cho PaymentsService xử lý.
 */
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async createPayment(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.processPayment(dto);
  }

  @Get('order/:orderId')
  async getPaymentsByOrderId(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.getPaymentsByOrderId(orderId);
  }

  @Get(':id')
  async getPaymentById(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.getPaymentById(id);
  }
}

