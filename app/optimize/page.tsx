'use client';

import { useState, useEffect } from 'react';

export default function OptimizePage() {
  const [query, setQuery] = useState<string>('pho');
  const [tableId, setTableId] = useState<string>('B05');
  const [searchData, setSearchData] = useState<any>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const runSearchTest = async (keyword: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(keyword)}&limit=5`);
      const data = await res.json();
      setSearchData(data);
    } catch (err) {
      console.error('Lỗi test tìm kiếm:', err);
    } finally {
      setLoading(false);
    }
  };

  const runBookingCheck = async (targetTable: string) => {
    try {
      const res = await fetch(`/api/booking?tableId=${encodeURIComponent(targetTable)}`);
      const data = await res.json();
      setBookingData(data);
    } catch (err) {
      console.error('Lỗi kiểm tra API đặt bàn:', err);
    }
  };

  useEffect(() => {
    runSearchTest('pho');
    runBookingCheck('B05');
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Card 1: Tối ưu truy vấn Vector Search */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
            SmaRes • Tối Ưu Hiệu Năng Truy Vấn
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Kiểm Thử Tốc Độ Tìm Kiếm & Cache
          </h1>

          <div className="flex flex-wrap gap-3 mb-5">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập từ khóa món ăn (vd: pho, ca, vit)..."
              className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-600"
            />
            <button
              type="button"
              onClick={() => runSearchTest(query)}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition cursor-pointer"
            >
              ⚡ Truy vấn ngay
            </button>
          </div>

          {searchData && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                  <p className="text-[11px] text-gray-500 font-semibold uppercase">Trạng thái Cache</p>
                  <p className="text-base font-bold text-emerald-800 mt-1">
                    {searchData.cached ? 'HIT (Từ Cache)' : 'MISS (Lần đầu)'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                  <p className="text-[11px] text-gray-500 font-semibold uppercase">Thời gian phản hồi</p>
                  <p className="text-base font-bold text-gray-900 mt-1">
                    {searchData.responseTimeMs ?? 0} ms
                  </p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100">
                  <p className="text-[11px] text-gray-500 font-semibold uppercase">Số món trả về</p>
                  <p className="text-base font-bold text-gray-900 mt-1">
                    {Array.isArray(searchData.results) ? searchData.results.length : 0} món
                  </p>
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-gray-500">Đang truy vấn...</p>
              ) : (
                <div className="space-y-2.5">
                  {(searchData.results || []).map((dish: any) => (
                    <div
                      key={dish.id}
                      className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100"
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-900">{dish.name}</p>
                        <p className="text-xs text-gray-500">Từ khóa: {dish.tags}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-700">
                        {Number(dish.price || 0).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Card 2: Kiểm tra API Đặt bàn */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Kiểm Tra Phản Hồi API Đặt Bàn
          </h2>
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              placeholder="Mã bàn (vd: B05)..."
              className="w-40 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-600"
            />
            <button
              type="button"
              onClick={() => runBookingCheck(tableId)}
              className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm transition cursor-pointer"
            >
              Kiểm tra bàn
            </button>
          </div>

          {bookingData && (
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between text-sm">
              <div>
                <p className="font-bold text-gray-900">Bàn {bookingData.tableId}</p>
                <p className="text-xs text-gray-500">
                  Trạng thái: {bookingData.booking?.status || 'Sẵn sàng tiếp nhận giữ chỗ'}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                {bookingData.responseTimeMs ?? 0} ms • 200 OK
              </span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}