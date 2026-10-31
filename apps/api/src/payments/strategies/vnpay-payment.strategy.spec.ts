import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VnpayPaymentStrategy } from './vnpay-payment.strategy.js';
import { WalletPaymentStrategy } from './wallet-payment.strategy.js';
import { CardPaymentStrategy } from './card-payment.strategy.js';
import * as crypto from 'crypto';

describe('Payment Strategies with ZaloPay & VNPay Sandbox (Unit Test)', () => {
  let vnpayStrategy: VnpayPaymentStrategy;
  let walletStrategy: WalletPaymentStrategy;
  let cardStrategy: CardPaymentStrategy;

  beforeEach(() => {
    vnpayStrategy = new VnpayPaymentStrategy();
    walletStrategy = new WalletPaymentStrategy();
    cardStrategy = new CardPaymentStrategy();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('WalletPaymentStrategy (useSandbox=true) should generate ZaloPay Sandbox URL for WALLET', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: async () => ({
        return_code: 1,
        return_message: 'Giao dịch thành công',
        order_url: 'https://qcgateway.zalopay.vn/openinapp?order=mock_token_123',
        zp_trans_token: 'mock_token_123',
      }),
    } as Response);

    const result = await walletStrategy.charge(65000, true, {
      orderId: 5,
      orderCode: 'ORD-5',
      ipAddr: '127.0.0.1',
      useSandbox: true,
    });

    expect(result.success).toBe(true);
    expect(result.paymentUrl).toBeDefined();
    expect(result.paymentUrl).toContain('https://qcgateway.zalopay.vn/openinapp');
    expect(result.transactionRef).toMatch(/^\d{6}_ORD5_/);
  });

  it('CardPaymentStrategy (useSandbox=true) should generate VNPay URL with vnp_BankCode=NCB for CARD', async () => {
    const result = await cardStrategy.charge(85000, true, {
      orderId: 6,
      orderCode: 'ORD-6',
      ipAddr: '127.0.0.1',
      useSandbox: true,
    });

    expect(result.success).toBe(true);
    expect(result.paymentUrl).toBeDefined();
    expect(result.paymentUrl).toContain('vnp_BankCode=NCB');
    expect(result.paymentUrl).toContain('vnp_Amount=8500000');
    expect(result.paymentUrl).toContain('CARD_ORD-6');
    expect(result.paymentUrl).toContain('vnp_SecureHash=');
  });

  it('should verify a valid VNPay return response with responseCode 00 as success', () => {
    const secretKey = 'ICFVGKFTSDUXWXLDYBBHRSCWZZEEBDBU';
    const params: Record<string, string> = {
      vnp_Amount: '8500000',
      vnp_BankCode: 'NCB',
      vnp_CardType: 'ATM',
      vnp_OrderInfo: 'Thanh toan The ngan hang don hang ORD-6',
      vnp_PayDate: '20261027143000',
      vnp_ResponseCode: '00',
      vnp_TmnCode: '8O0IA3FA',
      vnp_TransactionNo: '14589210',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: 'CARD_ORD-6_1793086184',
    };

    const sortedKeys = Object.keys(params).sort();
    const signData = sortedKeys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', secretKey);
    const vnp_SecureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const verified = vnpayStrategy.verifyReturn({
      ...params,
      vnp_SecureHash,
    });

    expect(verified.isValid).toBe(true);
    expect(verified.isSuccess).toBe(true);
    expect(verified.orderCode).toBe('ORD-6');
    expect(verified.method).toBe('CARD');
    expect(verified.transactionNo).toBe('14589210');
    expect(verified.amount).toBe(85000);
  });

  it('should reject a response with invalid or tampered signature', () => {
    const verified = vnpayStrategy.verifyReturn({
      vnp_Amount: '8500000',
      vnp_ResponseCode: '00',
      vnp_TxnRef: 'WALLET_ORD-1',
      vnp_SecureHash: 'fake_tampered_hash_123456',
    });

    expect(verified.isValid).toBe(false);
    expect(verified.isSuccess).toBe(false);
  });
});
