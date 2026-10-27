export interface GatewayResponse {
  success: boolean;
  transactionRef?: string;
  errorMessage?: string;
  paymentUrl?: string;
}

export interface PaymentContext {
  orderId?: number;
  orderCode?: string;
  ipAddr?: string;
  returnUrl?: string;
}

export abstract class PaymentStrategy {
  abstract charge(
    amount: number,
    mockSuccess?: boolean,
    context?: PaymentContext,
  ): Promise<GatewayResponse>;
}
