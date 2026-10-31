import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { WalletPaymentStrategy } from './strategies/wallet-payment.strategy.js';
import { CardPaymentStrategy } from './strategies/card-payment.strategy.js';
import { VnpayPaymentStrategy } from './strategies/vnpay-payment.strategy.js';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    WalletPaymentStrategy,
    CardPaymentStrategy,
    VnpayPaymentStrategy,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
