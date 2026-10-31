import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PaymentStrategy, GatewayResponse, PaymentContext } from './payment-strategy.interface.js';

interface ZaloPayCreateResponse {
  return_code: number;
  return_message: string;
  sub_return_code?: number;
  sub_return_message?: string;
  zp_trans_token?: string;
  order_url?: string;
  order_token?: string;
}

interface ZaloPayQueryResponse {
  return_code: number;
  return_message: string;
  sub_return_code?: number;
  sub_return_message?: string;
  is_processing?: boolean;
  amount?: number;
  zp_trans_id?: number | string;
}

@Injectable()
export class WalletPaymentStrategy extends PaymentStrategy {
  private readonly appId = Number(process.env.ZALOPAY_APP_ID || 2554);
  private readonly key1 = process.env.ZALOPAY_KEY1 || 'sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn';
  private readonly key2 = process.env.ZALOPAY_KEY2 || 'trMrHtvjo6myautxDUiAcYsVtaeQ8nhf';
  private readonly createUrl =
    process.env.ZALOPAY_CREATE_URL || 'https://sb-openapi.zalopay.vn/v2/create';
  private readonly queryUrl =
    process.env.ZALOPAY_QUERY_URL || 'https://sb-openapi.zalopay.vn/v2/query';
  private readonly returnUrl =
    process.env.ZALOPAY_RETURN_URL || 'http://localhost:3000/orders/zalopay-return';

  async charge(
    amount: number,
    mockSuccess = true,
    context?: PaymentContext,
  ): Promise<GatewayResponse> {
    if (context?.useSandbox) {
      return this.createZaloPayOrder(amount, context);
    }

    await new Promise((resolve) => setTimeout(resolve, 150));

    if (!mockSuccess || amount <= 0) {
      return {
        success: false,
        errorMessage: 'Số dư ví điện tử không đủ hoặc giao dịch bị từ chối bởi cổng Ví',
      };
    }

    return {
      success: true,
      transactionRef: `WALLET_${Date.now()}`,
    };
  }

  async createZaloPayOrder(amount: number, context?: PaymentContext): Promise<GatewayResponse> {
    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 3600 * 1000);
    const yy = String(vnTime.getUTCFullYear()).slice(-2);
    const mm = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(vnTime.getUTCDate()).padStart(2, '0');

    const baseOrderCode = context?.orderCode || `ORD-${context?.orderId || 1}`;
    const orderIdNum = context?.orderId || 1;
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const appTransId = `${yy}${mm}${dd}_ORD${orderIdNum}_${randomSuffix}`;
    const appTime = now.getTime();
    const appUser = 'brewlite_customer';
    const validAmount = Math.max(1000, Math.round(amount));

    const baseRedirect = context?.returnUrl || this.returnUrl;
    const redirectWithParams = `${baseRedirect}?orderCode=${encodeURIComponent(baseOrderCode)}&app_trans_id=${encodeURIComponent(appTransId)}`;

    const embedData = JSON.stringify({
      redirecturl: redirectWithParams,
    });
    const item = JSON.stringify([
      {
        itemid: String(orderIdNum),
        itemname: `Đơn hàng BrewLite #${baseOrderCode}`,
        itemprice: validAmount,
        itemquantity: 1,
      },
    ]);
    const description = `BrewLite - Thanh toan Vi ZaloPay don hang #${baseOrderCode}`;

    const signData = `${this.appId}|${appTransId}|${appUser}|${validAmount}|${appTime}|${embedData}|${item}`;
    const mac = crypto.createHmac('sha256', this.key1).update(signData).digest('hex');

    const response = await fetch(this.createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: this.appId,
        app_user: appUser,
        app_time: appTime,
        amount: validAmount,
        app_trans_id: appTransId,
        embed_data: embedData,
        item,
        description,
        bank_code: '',
        mac,
      }),
    });

    const data = (await response.json()) as ZaloPayCreateResponse;

    if (data.return_code === 1 && data.order_url) {
      return {
        success: true,
        transactionRef: appTransId,
        paymentUrl: data.order_url,
      };
    }

    return {
      success: false,
      errorMessage:
        data.sub_return_message ||
        data.return_message ||
        'Không thể khởi tạo giao dịch trên cổng ZaloPay Sandbox',
    };
  }

  async verifyAndQueryReturn(query: Record<string, string>): Promise<{
    isValid: boolean;
    isSuccess: boolean;
    isProcessing: boolean;
    orderCode: string;
    appTransId: string;
    zpTransId: string;
    amount: number;
  }> {
    const appTransId = query.apptransid || query.app_trans_id || '';
    const rawOrderCode = query.orderCode || '';
    let orderCode = rawOrderCode;

    if (!orderCode && appTransId) {
      const match = appTransId.match(/_ORD(\d+)_/);
      if (match) {
        orderCode = `ORD-${match[1]}`;
      }
    }

    let redirectChecksumValid = true;
    if (query.checksum && query.appid && query.apptransid && query.status !== undefined) {
      const checksumData = `${query.appid}|${query.apptransid}|${query.pmcid || ''}|${query.bankcode || ''}|${query.amount || ''}|${query.discountamount || ''}|${query.status}`;
      const expectedChecksum = crypto
        .createHmac('sha256', this.key2)
        .update(checksumData)
        .digest('hex');
      redirectChecksumValid =
        expectedChecksum.toLowerCase() === String(query.checksum).toLowerCase();
    }

    if (!redirectChecksumValid) {
      return {
        isValid: false,
        isSuccess: false,
        isProcessing: false,
        orderCode,
        appTransId,
        zpTransId: '',
        amount: Number(query.amount || 0),
      };
    }

    if (query.status !== undefined && String(query.status) !== '1') {
      return {
        isValid: true,
        isSuccess: false,
        isProcessing: false,
        orderCode,
        appTransId,
        zpTransId: '',
        amount: Number(query.amount || 0),
      };
    }

    if (appTransId) {
      try {
        const querySignData = `${this.appId}|${appTransId}|${this.key1}`;
        const mac = crypto.createHmac('sha256', this.key1).update(querySignData).digest('hex');

        const res = await fetch(this.queryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app_id: this.appId,
            app_trans_id: appTransId,
            mac,
          }),
        });

        const queryData = (await res.json()) as ZaloPayQueryResponse;
        if (queryData.return_code === 1) {
          return {
            isValid: true,
            isSuccess: true,
            isProcessing: false,
            orderCode,
            appTransId,
            zpTransId: String(queryData.zp_trans_id || appTransId),
            amount: Number(queryData.amount || query.amount || 0),
          };
        }

        if (queryData.return_code === 2) {
          return {
            isValid: true,
            isSuccess: false,
            isProcessing: false,
            orderCode,
            appTransId,
            zpTransId: '',
            amount: Number(query.amount || 0),
          };
        }

        if (String(query.status) === '1') {
          return {
            isValid: true,
            isSuccess: true,
            isProcessing: false,
            orderCode,
            appTransId,
            zpTransId: appTransId,
            amount: Number(query.amount || 0),
          };
        }

        return {
          isValid: true,
          isSuccess: false,
          isProcessing: Boolean(queryData.is_processing),
          orderCode,
          appTransId,
          zpTransId: '',
          amount: Number(query.amount || 0),
        };
      } catch {
        if (String(query.status) === '1') {
          return {
            isValid: true,
            isSuccess: true,
            isProcessing: false,
            orderCode,
            appTransId,
            zpTransId: appTransId,
            amount: Number(query.amount || 0),
          };
        }
      }
    }

    return {
      isValid: Boolean(orderCode),
      isSuccess: String(query.status) === '1',
      isProcessing: false,
      orderCode,
      appTransId,
      zpTransId: appTransId,
      amount: Number(query.amount || 0),
    };
  }
}
