"use client";

import { useEffect, useState } from "react";

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Hàm gọi API lấy danh sách sản phẩm từ backend
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    const endpoints = [
      process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/products`
        : null,
      "http://localhost:3001/products",
      "http://127.0.0.1:3001/products",
      "/api/products",
    ].filter(Boolean) as string[];

    let lastError: unknown = null;
    let fetchedData: Product[] | null = null;

    for (const url of endpoints) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          fetchedData = await response.json();
          break;
        }
      } catch (err: unknown) {
        lastError = err;
      }
    }

    if (fetchedData !== null) {
      setProducts(fetchedData);
    } else {
      const errMessage =
        lastError instanceof Error
          ? lastError.message
          : "Không thể kết nối đến máy chủ backend (Port 3001)";
      setError(
        `Không thể tải dữ liệu từ backend: ${errMessage}. Vui lòng kiểm tra backend đã được khởi động chưa (npm --prefix backend run start:dev).`
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    let ignore = false;

    const loadInitialData = async () => {
      const endpoints = [
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/products`
          : null,
        "http://localhost:3001/products",
        "http://127.0.0.1:3001/products",
        "/api/products",
      ].filter(Boolean) as string[];

      let lastError: unknown = null;
      let fetchedData: Product[] | null = null;

      for (const url of endpoints) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            fetchedData = await response.json();
            break;
          }
        } catch (err: unknown) {
          lastError = err;
        }
      }

      if (!ignore) {
        if (fetchedData !== null) {
          setProducts(fetchedData);
          setError(null);
        } else {
          const errMessage =
            lastError instanceof Error
              ? lastError.message
              : "Không thể kết nối đến máy chủ backend (Port 3001)";
          setError(
            `Không thể tải dữ liệu từ backend: ${errMessage}. Vui lòng kiểm tra backend đã được khởi động chưa (npm --prefix backend run start:dev).`
          );
        }
        setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Danh sách sản phẩm
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Dữ liệu được lấy trực tiếp từ Backend NestJS (GET /products)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!loading && !error && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                {products.length} sản phẩm
              </span>
            )}

            <button
              type="button"
              onClick={fetchProducts}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-xs ring-1 ring-slate-300 ring-inset hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              title="Tải lại danh sách"
            >
              <svg
                className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              <span>{loading ? "Đang tải..." : "Làm mới"}</span>
            </button>
          </div>
        </div>

        {/* 1. Trạng thái Loading: Hiển thị Skeleton Grid */}
        {loading && (
          <div>
            <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-blue-50/70 p-3 text-sm text-blue-700">
              <svg
                className="h-4 w-4 animate-spin text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              <span>Đang kết nối backend và tải danh sách sản phẩm...</span>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs animate-pulse"
                >
                  <div className="h-48 w-full rounded-xl bg-slate-200" />
                  <div className="mt-4 h-5 w-3/4 rounded bg-slate-200" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-slate-200" />
                  <div className="mt-6 flex items-center justify-between pt-2">
                    <div className="h-6 w-24 rounded bg-slate-200" />
                    <div className="h-8 w-20 rounded-lg bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Trạng thái Error: Có lỗi kết nối API */}
        {!loading && error && (
          <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50/80 p-8 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg
                className="h-7 w-7"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-red-900">
              Lỗi tải dữ liệu từ Backend
            </h3>
            <p className="mt-2 text-sm text-red-700 leading-relaxed">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={fetchProducts}
                className="inline-flex items-center rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors"
              >
                Thử lại ngay
              </button>
            </div>
          </div>
        )}

        {/* 3. Trạng thái Empty: Không có sản phẩm nào */}
        {!loading && !error && products.length === 0 && (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <svg
                className="h-8 w-8"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-800">
              Chưa có sản phẩm nào
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Hiện tại danh sách sản phẩm trong backend đang trống.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={fetchProducts}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 transition-colors"
              >
                Làm mới danh sách
              </button>
            </div>
          </div>
        )}

        {/* 4. Render danh sách sản phẩm dạng lưới (Grid) */}
        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <article
                key={product.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
              >
                {/* Product Image */}
                <div className="relative h-52 w-full overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-xs">
                    ID: #{product.id}
                  </div>
                </div>

                {/* Product Content */}
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-base font-semibold text-slate-800 transition-colors group-hover:text-blue-600 line-clamp-2">
                    {product.name}
                  </h2>

                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-medium text-slate-400">
                        Giá bán
                      </span>
                      <p className="text-lg font-bold text-rose-600">
                        {formatPrice(product.price)}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}