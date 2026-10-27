import { describe, it, expect, beforeEach } from 'vitest';
import { VnpayPaymentStrategy } from './vnpay-payment.strategy.js';
import * as crypto from 'crypto';

describe('VnpayPaymentStrategy (Unit Test)', () => {
  let strategy: VnpayPaymentStrategy;

  beforeEach(() => {
    strategy = new VnpayPaymentStrategy();
  });

  it('should generate a valid VNPay payment URL containing required parameters and HMAC-SHA512 secure hash', async () => {
    const result = await strategy.charge(123000, true, {
      orderId: 1,
      orderCode: 'ORD-1',
      ipAddr: '127.0.0.1',
    });

    expect(result.success).toBe(true);
    expect(result.paymentUrl).toBeDefined();
    expect(result.paymentUrl).toContain('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    expect(result.paymentUrl).toContain('vnp_TmnCode=8O0IA3FA');
    expect(result.paymentUrl).toContain('vnp_Amount=12300000');
    expect(result.paymentUrl).toContain('vnp_SecureHash=');
  });

  it('should verify a valid VNPay return response with responseCode 00 as success', () => {
    const secretKey = 'ICFVGKFTSDUXWXLDYBBHRSCWZZEEBDBU';
    const params: Record<string, string> = {
      vnp_Amount: '12300000',
      vnp_BankCode: 'NCB',
      vnp_CardType: 'ATM',
      vnp_OrderInfo: 'Thanh toan don hang ORD-1',
      vnp_PayDate: '20261027143000',
      vnp_ResponseCode: '00',
      vnp_TmnCode: '8O0IA3FA',
      vnp_TransactionNo: '14589210',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: 'ORD-1',
    };

    const sortedKeys = Object.keys(params).sort();
    const signData = sortedKeys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', secretKey);
    const vnp_SecureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const verified = strategy.verifyReturn({
      ...params,
      vnp_SecureHash,
    });

    expect(verified.isValid).toBe(true);
    expect(verified.isSuccess).toBe(true);
    expect(verified.orderCode).toBe('ORD-1');
    expect(verified.transactionNo).toBe('14589210');
    expect(verified.amount).toBe(123000);
  });

  it('should reject a response with invalid or tampered signature', () => {
    const verified = strategy.verifyReturn({
      vnp_Amount: '12300000',
      vnp_ResponseCode: '00',
      vnp_TxnRef: 'ORD-1',
      vnp_SecureHash: 'fake_tampered_hash_123456',
    });

    expect(verified.isValid).toBe(false);
    expect(verified.isSuccess).toBe(false);
  });
});
