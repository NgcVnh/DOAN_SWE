import { Injectable } from '@nestjs/common';
import { PaymentStrategy, GatewayResponse } from './payment-strategy.interface.js';

@Injectable()
export class WalletPaymentStrategy extends PaymentStrategy {
  async charge(amount: number, mockSuccess = true): Promise<GatewayResponse> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (!mockSuccess || amount <= 0) {
      return {
        success: false,
        errorMessage: 'Số dư ví điện tử không đủ hoặc giao dịch bị từ chối bởi nhà cung cấp ví',
      };
    }

    return {
      success: true,
      transactionRef: `WALLET_${Date.now()}`,
    };
  }
}
