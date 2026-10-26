export interface GatewayResponse {
  success: boolean;
  transactionRef?: string;
  errorMessage?: string;
}

export abstract class PaymentStrategy {
  abstract charge(amount: number, mockSuccess?: boolean): Promise<GatewayResponse>;
}

