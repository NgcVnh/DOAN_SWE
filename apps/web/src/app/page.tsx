'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<string>('Đang kiểm tra kết nối tới Backend...');
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetch(apiUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((data) => {
        setBackendStatus(`Kết nối thành công! Phản hồi từ backend: "${data}"`);
        setBackendHealthy(true);
      })
      .catch((err) => {
        setBackendStatus(`Chưa kết nối được với Backend (${apiUrl}). Hãy đảm bảo Backend đang chạy (npm run dev:backend).`);
        setBackendHealthy(false);
      });
  }, [apiUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col justify-between p-8 sm:p-16">
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between border-b border-slate-700/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            DOAN_SWE
          </h1>
          <p className="text-slate-400 text-sm mt-1">Full-Stack Monorepo: Next.js + NestJS</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
          v1.0.0
        </span>
      </header>

      <main className="max-w-4xl mx-auto w-full my-auto py-12 flex flex-col gap-8">
        {/* Connection status banner */}
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

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🌐</span>
              <h2 className="text-lg font-bold text-slate-100">Frontend (Next.js)</h2>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Xây dựng với Next.js App Router, React 19, TypeScript và Tailwind CSS.
            </p>
            <div className="text-xs space-y-1.5 text-slate-400">
              <p>📍 URL: <code className="bg-slate-900 px-2 py-0.5 rounded text-blue-300">http://localhost:3000</code></p>
              <p>⚡ Lệnh chạy: <code className="bg-slate-900 px-2 py-0.5 rounded text-indigo-300">npm run dev:frontend</code></p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">⚙️</span>
              <h2 className="text-lg font-bold text-slate-100">Backend (NestJS)</h2>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Xây dựng với NestJS v12, kiến trúc module, RESTful API và TypeScript.
            </p>
            <div className="text-xs space-y-1.5 text-slate-400">
              <p>📍 API: <code className="bg-slate-900 px-2 py-0.5 rounded text-blue-300">http://localhost:3001</code></p>
              <p>⚡ Lệnh chạy: <code className="bg-slate-900 px-2 py-0.5 rounded text-indigo-300">npm run dev:backend</code></p>
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
        DOAN_SWE — Đồ án Kỹ thuật Phần mềm
      </footer>
    </div>
  );
}
