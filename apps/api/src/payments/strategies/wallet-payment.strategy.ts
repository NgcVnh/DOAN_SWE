import { Injectable } from '@nestjs/common';
import { PaymentStrategy, GatewayResponse } from './payment-strategy.interface.js';

/**
 * [OOP - Tính Kế thừa (Inheritance) & Đa hình (Polymorphism)]
 * Class WalletPaymentStrategy kế thừa (extends) từ lớp trừu tượng PaymentStrategy
 * và định nghĩa cách thanh toán cụ thể cho Ví điện tử (Momo / ZaloPay / VNPay).
 */
@Injectable()
export class WalletPaymentStrategy extends PaymentStrategy {
  async charge(amount: number, mockSuccess = true): Promise<GatewayResponse> {
    // giả lập độ trễ mạng 200ms:
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

