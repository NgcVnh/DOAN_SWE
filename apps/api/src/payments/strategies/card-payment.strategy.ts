import { Injectable } from '@nestjs/common';
import { PaymentStrategy, GatewayResponse, PaymentContext } from './payment-strategy.interface.js';
import { VnpayPaymentStrategy } from './vnpay-payment.strategy.js';

@Injectable()
export class CardPaymentStrategy extends PaymentStrategy {
  private readonly vnpayHelper = new VnpayPaymentStrategy();

  async charge(
    amount: number,
    mockSuccess = true,
    context?: PaymentContext,
  ): Promise<GatewayResponse> {
    if (context?.useSandbox) {
      return this.vnpayHelper.buildSandboxResponse(amount, 'CARD', 'NCB', context);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    if (!mockSuccess || amount <= 0) {
      return {
        success: false,
        errorMessage: 'Thẻ ngân hàng không hợp lệ, hết hạn mức hoặc bị ngân hàng phát hành từ chối',
      };
    }

    return {
      success: true,
      transactionRef: `CARD_${Date.now()}`,
    };
  }
}
