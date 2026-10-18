import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { WalletPaymentStrategy } from './strategies/wallet-payment.strategy.js';
import { CardPaymentStrategy } from './strategies/card-payment.strategy.js';

/**
 * [OOP - Module Encapsulation & Dependency Injection Container]
 * Đăng ký Controller và các Provider (Service + Strategies) vào IoC Container của NestJS.
 */
@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, WalletPaymentStrategy, CardPaymentStrategy],
  exports: [PaymentsService],
})
export class PaymentsModule {}

