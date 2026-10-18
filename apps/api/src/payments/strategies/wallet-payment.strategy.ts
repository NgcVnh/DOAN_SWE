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
    // TODO 1: Bạn có thể giả lập độ trễ mạng 200ms bằng:
    // await new Promise((resolve) => setTimeout(resolve, 200));

    // TODO 2: Kiểm tra nếu !mockSuccess (hoặc amount <= 0) thì trả về:
    // return { success: false, errorMessage: 'Số dư ví điện tử không đủ hoặc giao dịch bị từ chối' };

    // TODO 3: Nếu thành công, trả về:
    // return { success: true, transactionRef: `WALLET_${Date.now()}` };

    throw new Error('TODO: Hãy tự viết logic hàm charge() trong WalletPaymentStrategy');
  }
}

