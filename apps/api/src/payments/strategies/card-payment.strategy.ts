import { Injectable } from '@nestjs/common';
import { PaymentStrategy, GatewayResponse } from './payment-strategy.interface.js';

@Injectable()
export class CardPaymentStrategy extends PaymentStrategy {
  async charge(amount: number, mockSuccess = true): Promise<GatewayResponse> {
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

