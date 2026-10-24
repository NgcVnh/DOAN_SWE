import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';

/**
 * [OOP - Single Responsibility Principle]
 * PaymentsController chỉ chịu trách nhiệm tiếp nhận HTTP Request (POST /payments),
 * nhận dữ liệu đã được validate qua CreatePaymentDto và chuyển giao cho PaymentsService xử lý.
 */
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async createPayment(@Body() dto: CreatePaymentDto) {
    // TODO: Gọi hàm processPayment(dto) từ this.paymentsService và trả về kết quả
    return this.paymentsService.processPayment(dto);
  }
}

