/**
 * Kết quả trả về từ cổng thanh toán giả lập (Mock Payment Gateway)
 */
export interface GatewayResponse {
  success: boolean;
  transactionRef?: string;
  errorMessage?: string;
}

/**
 * [OOP - Tính Trừu tượng (Abstraction) & Strategy Pattern]
 * Lớp trừu tượng PaymentStrategy định nghĩa bản hợp đồng chung cho mọi phương thức thanh toán.
 * Nhờ lớp này, PaymentsService chỉ cần gọi `strategy.charge(...)` mà không cần quan tâm
 * bên dưới là Ví điện tử (Momo/VNPay) hay Thẻ ngân hàng (Stripe/Visa).
 */
export abstract class PaymentStrategy {
  /**
   * Phương thức trừu tượng bắt buộc các class con (Wallet, Card) phải ghi đè (Override)
   * @param amount Số tiền cần thanh toán
   * @param mockSuccess Cờ giả lập thành công (true) hoặc thất bại (false)
   */
  abstract charge(amount: number, mockSuccess?: boolean): Promise<GatewayResponse>;
}

