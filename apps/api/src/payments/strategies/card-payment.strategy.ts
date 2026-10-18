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
    // TODO 1: Giả lập độ trễ mạng 200ms:
    // await new Promise((resolve) => setTimeout(resolve, 200));

    // TODO 2: Nếu !mockSuccess (hoặc amount <= 0) thì trả về:
    // return { success: false, errorMessage: 'Thẻ ngân hàng không hợp lệ hoặc hết hạn mức' };

    // TODO 3: Nếu thành công, trả về:
    // return { success: true, transactionRef: `CARD_${Date.now()}` };

    throw new Error('TODO: Hãy tự viết logic hàm charge() trong CardPaymentStrategy');
  }
}

