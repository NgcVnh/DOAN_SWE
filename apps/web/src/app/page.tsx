'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clearAuthData, getStoredUser, User } from '@/lib/auth';

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<string>('Đang kiểm tra kết nối tới Backend...');
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    // Kiểm tra trạng thái đăng nhập từ localStorage
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
    }

    // Kiểm tra kết nối backend
    fetch(apiUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((data) => {
        setBackendStatus(`Kết nối thành công! Phản hồi từ backend: "${data}"`);
        setBackendHealthy(true);
      })
      .catch(() => {
        setBackendStatus(
          `Chưa kết nối được với Backend (${apiUrl}). Hãy đảm bảo Backend đang chạy (npm run dev:backend).`,
        );
        setBackendHealthy(false);
      });
  }, [apiUrl]);

  const handleLogout = () => {
    clearAuthData();
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col justify-between p-8 sm:p-16">
      <header className="max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between border-b border-slate-700/60 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-teal-300 to-indigo-300 bg-clip-text text-transparent">
            ☕ BrewLite — DOAN_SWE
          </h1>
          <p className="text-slate-400 text-sm mt-1">Full-Stack Monorepo: Next.js + NestJS</p>
        </div>

        {/* Khối tài khoản & điều hướng nhanh */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs">
              <div>
                <span className="text-slate-400">Xin chào, </span>
                <span className="font-bold text-emerald-400">{currentUser.fullName || currentUser.email}</span>
                <span className="ml-2 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {currentUser.loyaltyPoints} điểm
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 transition font-medium"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full my-auto py-10 flex flex-col gap-6">
        {/* Banner trạng thái backend */}
        <div
          className={`p-5 rounded-xl border flex items-center gap-4 transition-all duration-300 ${
            backendHealthy === true
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : backendHealthy === false
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              : 'bg-slate-800/60 border-slate-700 text-slate-300'
          }`}
        >
          <div
            className={`w-3.5 h-3.5 rounded-full animate-pulse ${
              backendHealthy === true
                ? 'bg-emerald-400'
                : backendHealthy === false
                ? 'bg-amber-400'
                : 'bg-blue-400'
            }`}
          />
          <div className="flex-1">
            <p className="font-semibold text-sm">Trạng thái kết nối Backend</p>
            <p className="text-xs mt-0.5 opacity-90">{backendStatus}</p>
          </div>
        </div>

        {/* Khối truy cập nhanh các chức năng */}
        <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>⚡</span> Các chức năng hệ thống (Assignment 2)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/login"
              className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-700/80 hover:border-emerald-500/60 transition group"
            >
              <div className="text-2xl mb-1 group-hover:scale-110 transition">🔑</div>
              <h3 className="font-bold text-sm text-slate-100">Đăng nhập tài khoản</h3>
              <p className="text-xs text-slate-400 mt-1">
                Xác thực người dùng qua JWT, Passport & mật khẩu băm bcrypt
              </p>
            </Link>

            <Link
              href="/register"
              className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-700/80 hover:border-emerald-500/60 transition group"
            >
              <div className="text-2xl mb-1 group-hover:scale-110 transition">📝</div>
              <h3 className="font-bold text-sm text-slate-100">Đăng ký tài khoản</h3>
              <p className="text-xs text-slate-400 mt-1">
                Kiểm tra định dạng email, mật khẩu an toàn và mã hóa bcrypt
              </p>
            </Link>

            <Link
              href="/checkout"
              className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-700/80 hover:border-emerald-500/60 transition group"
            >
              <div className="text-2xl mb-1 group-hover:scale-110 transition">💳</div>
              <h3 className="font-bold text-sm text-slate-100">Thanh toán (Checkout)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Strategy Pattern: Ví điện tử & Thẻ ngân hàng kèm Idempotency
              </p>
            </Link>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🌐</span>
              <h2 className="text-lg font-bold text-slate-100">Frontend (Next.js)</h2>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Next.js App Router, React 19, TypeScript và Tailwind CSS v4.
            </p>
            <div className="text-xs space-y-1.5 text-slate-400">
              <p>
                📍 URL:{' '}
                <code className="bg-slate-900 px-2 py-0.5 rounded text-blue-300">
                  http://localhost:3000
                </code>
              </p>
              <p>
                ⚡ Lệnh chạy:{' '}
                <code className="bg-slate-900 px-2 py-0.5 rounded text-indigo-300">
                  npm run dev:frontend
                </code>
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">⚙️</span>
              <h2 className="text-lg font-bold text-slate-100">Backend (NestJS)</h2>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              NestJS v12, kiến trúc module, RESTful API, class-validator, JWT Passport.
            </p>
            <div className="text-xs space-y-1.5 text-slate-400">
              <p>
                📍 API:{' '}
                <code className="bg-slate-900 px-2 py-0.5 rounded text-blue-300">
                  http://localhost:3001
                </code>
              </p>
              <p>
                ⚡ Lệnh chạy:{' '}
                <code className="bg-slate-900 px-2 py-0.5 rounded text-indigo-300">
                  npm run dev:backend
                </code>
              </p>
            </div>
          </div>
        </div>

        {/* Quick Instructions */}
        <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/40">
          <h3 className="font-semibold text-sm text-slate-200 mb-3">🚀 Hướng dẫn khởi động nhanh</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-1"># Terminal 1: Backend</span>
              <span className="text-emerald-400">npm run dev:backend</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-1"># Terminal 2: Frontend</span>
              <span className="text-emerald-400">npm run dev:frontend</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto w-full text-center border-t border-slate-800/80 pt-6 text-xs text-slate-500">
        DOAN_SWE — Đồ án Kỹ thuật Phần mềm (BrewLite Monorepo)
      </footer>
    </div>
  );
}
