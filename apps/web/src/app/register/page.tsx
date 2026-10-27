'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Coffee } from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = 'Vui lòng nhập họ và tên của bạn';
    }

    if (!email.trim()) {
      errors.email = 'Vui lòng nhập địa chỉ email';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.email = 'Địa chỉ email không đúng định dạng (ví dụ: user@example.com)';
      }
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      errors.password = 'Mật khẩu phải có độ dài tối thiểu 6 ký tự';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận lại mật khẩu';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (Array.isArray(data.message)) {
          throw new Error(data.message.join('. '));
        } else {
          throw new Error(data.message || 'Đăng ký tài khoản không thành công');
        }
      }

      setSuccessMessage('Đăng ký tài khoản thành công! Đang chuyển hướng sang trang đăng nhập...');
      setTimeout(() => {
        router.push(`/login${redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi kết nối tới máy chủ. Vui lòng thử lại sau.';
      setGeneralError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-stone-200/90 p-8">
      <div className="mb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 px-3 py-1.5 rounded-xl transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang hiển thị sản phẩm</span>
        </Link>
      </div>

      <div className="text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-2xl font-black tracking-tight text-amber-900">
          <div className="bg-amber-600 text-white p-2 rounded-xl shadow-xs">
            <Coffee className="w-5 h-5" />
          </div>
          <span>Brew<span className="text-amber-600">Lite</span></span>
        </Link>
        <h1 className="text-xl font-bold text-stone-900 mt-3">Tạo tài khoản mới</h1>
        <p className="text-xs text-stone-500 mt-1">
          Đăng ký để thêm món vào giỏ, tích điểm thưởng và đặt đồ uống
        </p>
      </div>

      {successMessage && (
        <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <span className="text-lg">✓</span>
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {generalError && (
        <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
          <span className="font-bold text-base leading-none">⚠️</span>
          <p>{generalError}</p>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4" noValidate>
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Họ và tên <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ví dụ: Nguyễn Văn A"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-stone-800 focus:outline-none transition ${
              fieldErrors.fullName
                ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500'
                : 'border-stone-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600'
            }`}
          />
          {fieldErrors.fullName && (
            <p className="text-xs text-rose-600 mt-1">{fieldErrors.fullName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Địa chỉ Email <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-stone-800 focus:outline-none transition ${
              fieldErrors.email
                ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500'
                : 'border-stone-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600'
            }`}
          />
          {fieldErrors.email && (
            <p className="text-xs text-rose-600 mt-1">{fieldErrors.email}</p>
          )}
        </div>

        {/* Mật khẩu */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Mật khẩu <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-stone-800 focus:outline-none transition pr-16 ${
                fieldErrors.password
                  ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500'
                  : 'border-stone-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-xs text-stone-500 hover:text-stone-800"
            >
              {showPassword ? 'Ẩn' : 'Hiện'}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-xs text-rose-600 mt-1">{fieldErrors.password}</p>
          )}
        </div>

        {/* Xác nhận mật khẩu */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Xác nhận mật khẩu <span className="text-rose-500">*</span>
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu ở trên"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-stone-800 focus:outline-none transition ${
              fieldErrors.confirmPassword
                ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500'
                : 'border-stone-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600'
            }`}
          />
          {fieldErrors.confirmPassword && (
            <p className="text-xs text-rose-600 mt-1">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm transition shadow-md"
        >
          {loading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
        </button>
      </form>

      {/* Footer chuyển sang Đăng nhập */}
      <div className="mt-6 text-center text-xs text-stone-500 border-t border-stone-100 pt-4">
        <span>Đã có tài khoản? </span>
        <Link
          href={`/login${redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
          className="font-semibold text-amber-700 hover:underline"
        >
          Đăng nhập tại đây
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/70 via-stone-50 to-amber-100/40 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-center text-sm text-stone-500">Đang tải...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
