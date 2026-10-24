'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';

type PaymentMethodType = 'WALLET' | 'CARD';

export default function CheckoutPage() {
  // State lưu phương thức thanh toán người dùng chọn (Ví điện tử hoặc Thẻ ngân hàng)
  const [method, setMethod] = useState<PaymentMethodType>('WALLET');

  // State giả lập lỗi để demo kịch bản PAYMENT_FAILED cho giảng viên
  const [mockSuccess, setMockSuccess] = useState<boolean>(true);

  // State quản lý trạng thái gọi API
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderPaidResult, setOrderPaidResult] = useState<{ orderId: number; status: string } | null>(null);

  // Giả sử đơn hàng đang chờ thanh toán (khi ghép với giỏ hàng của nhóm, lấy từ URL hoặc Cart Store)
  const [orderId] = useState<number>(1);
  const [totalAmount] = useState<number>(123000);
  
  const { clearCart } = useCartStore();

  /**
   * Hàm xử lý khi khách hàng bấm nút "Xác nhận trả"
   */
  const handleConfirmPayment = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const idempotencyKey = crypto.randomUUID();

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderId,
          method: method,
          idempotencyKey: idempotencyKey,
          mockSuccess: mockSuccess,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Thanh toán thất bại');
      }

      if (data.orderStatus === 'PAID') {
        // [Thành công]: Chuyển sang màn hình Xác nhận
        setOrderPaidResult({
          orderId: data.orderId,
          status: 'PAID',
        });
        clearCart();
      } else {
        setErrorMessage(
          data.errorMessage || 'Giao dịch thanh toán bị từ chối. Giỏ hàng của bạn vẫn được giữ nguyên',
        );
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Có lỗi kết nối tới máy chủ thanh toán';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Màn hình (5) Xác nhận đơn hàng khi thanh toán thành công (PAID) - Task 9
  if (orderPaidResult) {
    return (
      <div className="min-h-screen bg-amber-50/40 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-emerald-100">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Đặt hàng thành công</h1>
          <div className="bg-slate-50 rounded-xl p-4 my-6 space-y-2 text-sm text-slate-700">
            <p>
              Mã đơn: <strong className="text-slate-900">#{orderPaidResult.orderId}</strong>
            </p>
            <p>
              Trạng thái:{' '}
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                {orderPaidResult.status}
              </span>
            </p>
          </div>
          <p className="text-slate-600 text-sm mb-6">Mời bạn tới quầy nhận đồ uống nhé!</p>
          <Link
            href="/"
            className="block w-full py-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold transition"
          >
            Về thực đơn
          </Link>
        </div>
      </div>
    );
  }

  // Màn hình (4) Chọn phương thức Thanh toán theo đúng Wireframe đề bài
  return (
    <div className="min-h-screen bg-amber-50/40 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
        <h1 className="text-xl font-bold text-center text-slate-800 border-b pb-4">Thanh toán</h1>

        <div className="py-6 text-center border-b border-dashed">
          <p className="text-sm text-slate-500">Tổng tiền đơn hàng #{orderId}</p>
          <p className="text-3xl font-extrabold text-emerald-700 mt-1">
            {totalAmount.toLocaleString('vi-VN')} đ
          </p>
        </div>

        {/* Chọn phương thức thanh toán */}
        <div className="py-6 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Phương thức thanh toán (Không dùng tiền mặt):</p>

          <label
            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
              method === 'WALLET' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="WALLET"
              checked={method === 'WALLET'}
              onChange={() => setMethod('WALLET')}
              className="w-4 h-4 accent-emerald-600"
            />
            <div>
              <p className="font-semibold text-slate-800 text-sm">Ví điện tử (Momo / VNPay)</p>
              <p className="text-xs text-slate-500">Thanh toán siêu tốc qua ví điện tử</p>
            </div>
          </label>

          <label
            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
              method === 'CARD' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="CARD"
              checked={method === 'CARD'}
              onChange={() => setMethod('CARD')}
              className="w-4 h-4 accent-emerald-600"
            />
            <div>
              <p className="font-semibold text-slate-800 text-sm">Thẻ ngân hàng (ATM / Visa)</p>
              <p className="text-xs text-slate-500">Thanh toán qua cổng thẻ nội địa hoặc quốc tế</p>
            </div>
          </label>
        </div>

        {/* Tùy chọn phục vụ lúc Demo cho giảng viên */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs text-slate-600 flex items-center justify-between">
          <span>Chế độ giả lập (Demo cho giảng viên):</span>
          <button
            type="button"
            onClick={() => setMockSuccess(!mockSuccess)}
            className={`px-2.5 py-1 rounded font-semibold ${
              mockSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {mockSuccess ? 'Giả lập: THÀNH CÔNG' : 'Giả lập: THẤT BẠI (Lỗi)'}
          </button>
        </div>

        {/* Hiển thị lỗi khi thanh toán thất bại (PAYMENT_FAILED) */}
        {errorMessage && (
          <div className="p-4 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <p className="font-bold">⚠️ Thanh toán thất bại (PAYMENT_FAILED)</p>
            <p className="mt-1">{errorMessage}</p>
            <p className="mt-1 italic text-rose-600">
              * Giỏ hàng của bạn vẫn được giữ nguyên. Bạn có thể bấm nút bên dưới để thử lại.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirmPayment}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold transition shadow-md"
        >
          {loading ? 'Đang xử lý giao dịch...' : errorMessage ? 'Thử thanh toán lại' : 'Xác nhận trả'}
        </button>
      </div>
    </div>
  );
}
