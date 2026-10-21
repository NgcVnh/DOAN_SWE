'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  // State các trường thông tin trong form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Tùy chọn ẩn / hiện mật khẩu
  const [showPassword, setShowPassword] = useState(false);

  // State quản lý lỗi và trạng thái tải
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Xác thực phía Client trước khi gửi request lên máy chủ
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Kiểm tra Họ và tên
    if (!fullName.trim()) {
      errors.fullName = 'Vui lòng nhập họ và tên của bạn';
    }

    // 2. Kiểm tra Email
    if (!email.trim()) {
      errors.email = 'Vui lòng nhập địa chỉ email';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.email = 'Địa chỉ email không đúng định dạng (ví dụ: user@example.com)';
      }
    }

    // 3. Kiểm tra Mật khẩu (thống nhất với backend: tối thiểu 6 ký tự)
    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      errors.password = 'Mật khẩu phải có độ dài tối thiểu 6 ký tự';
    }

    // 4. Kiểm tra Xác nhận mật khẩu
    if (!confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận lại mật khẩu';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Xử lý gửi biểu mẫu Đăng ký
   */
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
        // Chỉ gửi đúng các trường được phép, không gửi role/quyền hạn
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Xử lý thông báo lỗi từ Backend (class-validator hoặc ConflictException)
        if (Array.isArray(data.message)) {
          throw new Error(data.message.join('. '));
        } else {
          throw new Error(data.message || 'Đăng ký tài khoản không thành công');
        }
      }

      setSuccessMessage('Đăng ký tài khoản thành công! Đang chuyển hướng sang trang đăng nhập...');
      // Chuyển hướng sang trang đăng nhập sau 1.5 giây
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi kết nối tới máy chủ. Vui lòng thử lại sau.';
      setGeneralError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/70 via-stone-50 to-emerald-50/40 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-black tracking-tight text-emerald-800">
              ☕ BrewLite
            </span>
          </Link>
          <h1 className="text-xl font-bold text-slate-800 mt-2">Tạo tài khoản mới</h1>
          <p className="text-xs text-slate-500 mt-1">
            Đăng ký để tích điểm thưởng và đặt đồ uống nhanh chóng
          </p>
        </div>

        {/* Thông báo thành công */}
        {successMessage && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
            <span className="text-lg">✓</span>
            <p className="font-medium">{successMessage}</p>
          </div>
        )}

        {/* Thông báo lỗi tổng quát */}
        {generalError && (
          <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
            <span className="font-bold text-base leading-none">⚠️</span>
            <p>{generalError}</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4" noValidate>
          {/* Họ và tên */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 focus:outline-none transition ${
                fieldErrors.fullName
                  ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500'
                  : 'border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
              }`}
            />
            {fieldErrors.fullName && (
              <p className="text-xs text-rose-600 mt-1">{fieldErrors.fullName}</p>
            )}
          </div>

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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
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

          {/* Xác nhận mật khẩu */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Xác nhận mật khẩu <span className="text-rose-500">*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu ở trên"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 focus:outline-none transition ${
                fieldErrors.confirmPassword
                  ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500'
                  : 'border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
              }`}
            />
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-rose-600 mt-1">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm transition shadow-md"
          >
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
          </button>
        </form>

        {/* Footer chuyển sang Đăng nhập */}
        <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
          <span>Đã có tài khoản? </span>
          <Link href="/login" className="font-semibold text-emerald-700 hover:underline">
            Đăng nhập tại đây
          </Link>
        </div>
      </div>
    </div>
  );
}

