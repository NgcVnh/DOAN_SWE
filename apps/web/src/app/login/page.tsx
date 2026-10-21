'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveAuthData } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  // State các trường thông tin trong form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // State quản lý lỗi và trạng thái tải
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Xác thực biểu mẫu phía Client
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = 'Vui lòng nhập địa chỉ email';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.email = 'Địa chỉ email không đúng định dạng';
      }
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Xử lý gửi biểu mẫu Đăng nhập
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (Array.isArray(data.message)) {
          throw new Error(data.message.join('. '));
        } else {
          throw new Error(data.message || 'Đăng nhập không thành công');
        }
      }

      // Lưu trữ Access Token và thông tin User an toàn vào localStorage
      if (data.accessToken && data.user) {
        saveAuthData(data.accessToken, data.user);
      }

      // Điều hướng về trang đích
      router.push(redirectUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Có lỗi kết nối tới máy chủ';
      setGeneralError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <Link href="/" className="inline-block">
          <span className="text-2xl font-black tracking-tight text-emerald-800">
            ☕ BrewLite
          </span>
        </Link>
        <h1 className="text-xl font-bold text-slate-800 mt-2">Đăng nhập tài khoản</h1>
        <p className="text-xs text-slate-500 mt-1">
          Nhập email và mật khẩu của bạn để tiếp tục
        </p>
      </div>

      {/* Thông báo lỗi tổng quát */}
      {generalError && (
        <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
          <span className="font-bold text-base leading-none">⚠️</span>
          <p>{generalError}</p>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4" noValidate>
        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Địa chỉ Email <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            autoComplete="email"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 focus:outline-none transition ${
              fieldErrors.email
                ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500'
                : 'border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
            }`}
          />
          {fieldErrors.email && (
            <p className="text-xs text-rose-600 mt-1">{fieldErrors.email}</p>
          )}
        </div>

        {/* Mật khẩu */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Mật khẩu <span className="text-rose-500">*</span>
            </label>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 focus:outline-none transition pr-16 ${
                fieldErrors.password
                  ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500'
                  : 'border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-slate-800"
            >
              {showPassword ? 'Ẩn' : 'Hiện'}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-xs text-rose-600 mt-1">{fieldErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm transition shadow-md"
        >
          {loading ? 'Đang xác thực...' : 'Đăng nhập'}
        </button>
      </form>

      {/* Footer chuyển sang Đăng ký */}
      <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
        <span>Chưa có tài khoản? </span>
        <Link href="/register" className="font-semibold text-emerald-700 hover:underline">
          Đăng ký ngay
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/70 via-stone-50 to-emerald-50/40 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-center text-sm text-slate-500">Đang tải...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
