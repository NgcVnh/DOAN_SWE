import { Injectable } from '@nestjs/common';
import { PaymentStrategy, GatewayResponse } from './payment-strategy.interface.js';

/**
 * [OOP - Tính Kế thừa (Inheritance) & Đa hình (Polymorphism)]
 * Class CardPaymentStrategy kế thừa (extends) từ lớp trừu tượng PaymentStrategy
 * và định nghĩa cách thanh toán cụ thể cho Thẻ ngân hàng (ATM / Visa / Mastercard).
 */
@Injectable()
export class CardPaymentStrategy extends PaymentStrategy {
  async charge(amount: number, mockSuccess = true): Promise<GatewayResponse> {
    // Giả lập độ trễ mạng 200ms:
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

