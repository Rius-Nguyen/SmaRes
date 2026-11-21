import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7f5] px-4 py-12 text-center">
      <div className="w-full max-w-md rounded-3xl border border-emerald-950/10 bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
          Lỗi phân quyền • 403
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Không có quyền truy cập
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Tài khoản hiện tại của bạn không đủ quyền để vào khu vực này. Vui lòng quay lại trang chủ hoặc đăng nhập bằng tài khoản có quyền phù hợp.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-[#155e42] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f4430]"
          >
            Về trang chủ
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Đăng nhập lại
          </Link>
        </div>
      </div>
    </main>
  );
}