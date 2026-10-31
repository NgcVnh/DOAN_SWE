import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PaymentStrategy, GatewayResponse, PaymentContext } from './payment-strategy.interface.js';

@Injectable()
export class VnpayPaymentStrategy extends PaymentStrategy {
  private readonly tmnCode = process.env.VNPAY_TMN_CODE || '8O0IA3FA';
  private readonly hashSecret = process.env.VNPAY_HASH_SECRET || 'ICFVGKFTSDUXWXLDYBBHRSCWZZEEBDBU';
  private readonly vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  private readonly returnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:3000/orders/vnpay-return';

  async charge(
    amount: number,
    _mockSuccess = true,
    context?: PaymentContext,
  ): Promise<GatewayResponse> {
    return this.buildSandboxResponse(amount, 'VNPAY', undefined, context);
  }

  buildSandboxResponse(
    amount: number,
    methodPrefix: 'WALLET' | 'CARD' | 'VNPAY',
    bankCode?: string,
    context?: PaymentContext,
  ): GatewayResponse {
    const now = new Date();
    const createDate = this.formatDate(now);
    const baseOrderCode = context?.orderCode || `ORD-${context?.orderId || Date.now()}`;
    const txnRef =
      methodPrefix === 'VNPAY'
        ? baseOrderCode
        : `${methodPrefix}_${baseOrderCode}_${Date.now()}`;

    const methodLabel =
      methodPrefix === 'WALLET'
        ? 'Vi dien tu'
        : methodPrefix === 'CARD'
          ? 'The ngan hang'
          : 'VNPAY';

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan ${methodLabel} don hang ${baseOrderCode}`,
      vnp_OrderType: 'other',
      vnp_Amount: String(Math.round(amount * 100)),
      vnp_ReturnUrl: context?.returnUrl || this.returnUrl,
      vnp_IpAddr: context?.ipAddr || '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    if (bankCode) {
      vnpParams.vnp_BankCode = bankCode;
    }

    const sortedKeys = Object.keys(vnpParams).sort();
    const signData = sortedKeys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(vnpParams[k]).replace(/%20/g, '+')}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    const paymentUrl = `${this.vnpUrl}?${signData}&vnp_SecureHash=${signed}`;

    return {
      success: true,
      transactionRef: txnRef,
      paymentUrl,
    };
  }

  verifyReturn(query: Record<string, string>): {
    isValid: boolean;
    isSuccess: boolean;
    orderCode: string;
    method: 'WALLET' | 'CARD';
    transactionNo: string;
    amount: number;
    responseCode: string;
  } {
    const secureHash = query.vnp_SecureHash;
    const cleanParams: Record<string, string> = {};

    for (const key of Object.keys(query)) {
      if (key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
        cleanParams[key] = query[key];
      }
    }

    const sortedKeys = Object.keys(cleanParams).sort();
    const signData = sortedKeys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(cleanParams[k]).replace(/%20/g, '+')}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const isValid = Boolean(
      secureHash &&
      secureHash.toLowerCase() === signed.toLowerCase(),
    );

    const responseCode = query.vnp_ResponseCode || '';
    const isSuccess = isValid && responseCode === '00';
    const amount = Number(query.vnp_Amount || '0') / 100;
    const rawTxnRef = query.vnp_TxnRef || '';

    const method: 'WALLET' | 'CARD' = rawTxnRef.startsWith('CARD_') ? 'CARD' : 'WALLET';
    const ordMatch = rawTxnRef.match(/ORD-\d+/);
    const orderCode = ordMatch ? ordMatch[0] : rawTxnRef;

    return {
      isValid,
      isSuccess,
      orderCode,
      method,
      transactionNo: query.vnp_TransactionNo || '',
      amount,
      responseCode,
    };
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }
}
