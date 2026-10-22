"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BookingStepper from '@/components/BookingStepper';
import { useCart } from '@/app/context/CartContext';

interface TableItem {
  id: string;
  name: string;
  seats: number;
  status: 'available' | 'occupied' | 'cleaning';
  zone: 'VIP' | 'Trung tâm' | 'Cửa sổ';
}

const TABLES_DATA: TableItem[] = [
  // VIP
  { id: 'V01', name: 'V01', seats: 6, status: 'occupied', zone: 'VIP' },
  { id: 'V02', name: 'V02', seats: 6, status: 'available', zone: 'VIP' },
  { id: 'V03', name: 'V03', seats: 10, status: 'cleaning', zone: 'VIP' },
  // Trung tâm
  { id: 'B01', name: 'B01', seats: 2, status: 'occupied', zone: 'Trung tâm' },
  { id: 'B02', name: 'B02', seats: 4, status: 'available', zone: 'Trung tâm' },
  { id: 'B03', name: 'B03', seats: 4, status: 'occupied', zone: 'Trung tâm' },
  { id: 'B04', name: 'B04', seats: 2, status: 'cleaning', zone: 'Trung tâm' },
  { id: 'B05', name: 'B05', seats: 4, status: 'available', zone: 'Trung tâm' },
  { id: 'B06', name: 'B06', seats: 4, status: 'available', zone: 'Trung tâm' },
  { id: 'B07', name: 'B07', seats: 8, status: 'occupied', zone: 'Trung tâm' },
  // Cửa sổ
  { id: 'W01', name: 'W01', seats: 4, status: 'available', zone: 'Cửa sổ' },
  { id: 'W02', name: 'W02', seats: 4, status: 'occupied', zone: 'Cửa sổ' },
  { id: 'W03', name: 'W03', seats: 4, status: 'cleaning', zone: 'Cửa sổ' },
];

export default function BookingDiagramPage() {
  const router = useRouter();
  const { bookingInfo, setBookingInfo } = useCart();

  // Khởi tạo bàn đã chọn (ưu tiên thông tin đã lưu, hoặc mặc định B05)
  const [selectedTableId, setSelectedTableId] = useState<string>(
    bookingInfo?.tableNumber || 'B05'
  );

  const selectedTable =
    TABLES_DATA.find((t) => t.id === selectedTableId) || TABLES_DATA[7]; // fallback B05

  const handleSelectTable = (table: TableItem) => {
    if (table.status !== 'available') return;
    setSelectedTableId(table.id);
  };

  const handleContinue = () => {
    // Lưu thông tin bàn vào context & localStorage
    setBookingInfo((prev) => ({
      name: prev?.name || 'Khách hàng SmaRes',
      phone: prev?.phone || '09xx xxx xxx',
      email: prev?.email || '',
      date: prev?.date || '2026-10-25',
      time: prev?.time || '19:00',
      guests: prev?.guests || `${selectedTable.seats} người`,
      note: prev?.note || '',
      tableNumber: selectedTable.id,
      tableType: `Khu ${selectedTable.zone}`,
      tableCapacity: selectedTable.seats,
    }));

    // Chuyển sang Bước 3: Chọn món ăn vào Giỏ hàng
    router.push('/booking/menu');
  };

  return (
    <main className="flex-1 bg-gray-100 flex flex-col min-h-screen pb-16">
      {/* Header tối màu */}
      <div className="bg-zinc-900 py-12 text-center px-4">
        <span className="text-xs uppercase tracking-widest text-green-400 font-semibold mb-2 inline-block">Sơ đồ vị trí</span>
        <h1 className="text-2xl md:text-4xl font-sans font-bold text-white mb-2">
          2. Chọn Vị Trí Bàn Trên Sơ Đồ
        </h1>
        <p className="text-gray-400 text-sm max-w-xl mx-auto">
          Xem trực quan trạng thái bàn theo thời gian thực và chọn vị trí lý tưởng nhất cho bữa tiệc của bạn
        </p>
      </div>

      {/* Workflow Stepper: Bước 2 */}
      <BookingStepper currentStep={2} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Cột Trái: Sơ đồ bàn ăn (Chiếm 2 phần) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
          {/* Chú thích trạng thái */}
          <div className="flex flex-wrap items-center justify-between border-b pb-6 mb-8 gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Không gian nhà hàng SmaRes</h2>
              <p className="text-xs text-gray-500 mt-1">Nhấp vào bàn màu xanh để chọn vị trí ưng ý</p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-semibold">
              <div className="flex items-center">
                <span className="w-3.5 h-3.5 bg-green-500 rounded-sm mr-2 shadow-sm"></span>
                <span>Trống (Có thể chọn)</span>
              </div>
              <div className="flex items-center">
                <span className="w-3.5 h-3.5 bg-red-500 rounded-sm mr-2 shadow-sm"></span>
                <span>Đã có khách</span>
              </div>
              <div className="flex items-center">
                <span className="w-3.5 h-3.5 bg-yellow-400 rounded-sm mr-2 shadow-sm"></span>
                <span>Đang dọn (~10p)</span>
              </div>
            </div>
          </div>

          {/* Khu vực VIP */}
          <div className="mb-10 bg-amber-50/40 p-5 rounded-xl border border-amber-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>👑</span> Khu vực Phòng VIP (Không gian riêng tư)
              </h3>
              <span className="text-xs text-amber-700">6 - 10 chỗ</span>
            </div>
            <div className="flex flex-wrap gap-5">
              {TABLES_DATA.filter((t) => t.zone === 'VIP').map((table) => {
                const isSelected = selectedTableId === table.id;
                const isAvailable = table.status === 'available';

                return (
                  <button
                    key={table.id}
                    onClick={() => handleSelectTable(table)}
                    disabled={!isAvailable}
                    className={`w-24 h-24 rounded-full flex flex-col items-center justify-center font-bold shadow-md transition-all relative ${
                      table.status === 'occupied'
                        ? 'bg-red-500 text-white opacity-60 cursor-not-allowed'
                        : table.status === 'cleaning'
                        ? 'bg-yellow-400 text-white cursor-not-allowed'
                        : isSelected
                        ? 'bg-green-700 text-white ring-4 ring-green-300 scale-105 shadow-xl'
                        : 'bg-green-500 text-white hover:scale-105 hover:bg-green-600 cursor-pointer'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 rounded-full w-5 h-5 flex items-center justify-center text-xs shadow">
                        ✓
                      </span>
                    )}
                    <span className="text-base">{table.name}</span>
                    <span className="text-xs font-normal opacity-90">{table.seats} chỗ</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Khu Trung tâm */}
          <div className="mb-10 bg-gray-50/60 p-5 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                <span>🍽️</span> Khu Trung tâm (Không gian ấm cúng, thoáng đãng)
              </h3>
              <span className="text-xs text-gray-500">2 - 8 chỗ</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {TABLES_DATA.filter((t) => t.zone === 'Trung tâm').map((table) => {
                const isSelected = selectedTableId === table.id;
                const isAvailable = table.status === 'available';

                return (
                  <button
                    key={table.id}
                    onClick={() => handleSelectTable(table)}
                    disabled={!isAvailable}
                    className={`h-20 rounded-xl flex flex-col items-center justify-center font-bold shadow-sm transition-all relative ${
                      table.id === 'B07' ? 'col-span-2' : ''
                    } ${
                      table.status === 'occupied'
                        ? 'bg-red-500 text-white opacity-60 cursor-not-allowed'
                        : table.status === 'cleaning'
                        ? 'bg-yellow-400 text-white cursor-not-allowed'
                        : isSelected
                        ? 'bg-green-700 text-white ring-4 ring-green-300 scale-105 shadow-md'
                        : 'bg-green-500 text-white hover:scale-102 hover:bg-green-600 cursor-pointer'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 rounded-full w-5 h-5 flex items-center justify-center text-xs shadow">
                        ✓
                      </span>
                    )}
                    <span className="text-base">{table.name}</span>
                    <span className="text-xs font-normal opacity-90">{table.seats} chỗ</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cạnh cửa sổ */}
          <div className="bg-sky-50/40 p-5 rounded-xl border border-sky-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>🪟</span> Cạnh cửa sổ (View ngắm thành phố lung linh)
              </h3>
              <span className="text-xs text-sky-700">4 chỗ</span>
            </div>
            <div className="flex flex-wrap gap-4">
              {TABLES_DATA.filter((t) => t.zone === 'Cửa sổ').map((table) => {
                const isSelected = selectedTableId === table.id;
                const isAvailable = table.status === 'available';

                return (
                  <button
                    key={table.id}
                    onClick={() => handleSelectTable(table)}
                    disabled={!isAvailable}
                    className={`w-28 h-18 py-3 rounded-xl flex flex-col items-center justify-center font-bold shadow-sm transition-all relative ${
                      table.status === 'occupied'
                        ? 'bg-red-500 text-white opacity-60 cursor-not-allowed'
                        : table.status === 'cleaning'
                        ? 'bg-yellow-400 text-white cursor-not-allowed'
                        : isSelected
                        ? 'bg-green-700 text-white ring-4 ring-green-300 scale-105 shadow-md'
                        : 'bg-green-500 text-white hover:scale-105 hover:bg-green-600 cursor-pointer'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 rounded-full w-5 h-5 flex items-center justify-center text-xs shadow">
                        ✓
                      </span>
                    )}
                    <span className="text-base">{table.name}</span>
                    <span className="text-xs font-normal opacity-90">{table.seats} chỗ</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cột Phải: Form xác nhận bàn đã chọn */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-fit sticky top-24">
          <div className="border-b pb-4 mb-4">
            <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Bàn đang chọn</span>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">
              Bàn {selectedTable.name} — {selectedTable.seats} người
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Khu vực: {selectedTable.zone}</p>
          </div>
          
          <div className="space-y-4 text-sm mb-6">
            <div>
              <label className="block text-gray-500 text-xs font-medium mb-1">Khách hàng</label>
              <div className="font-semibold text-gray-900 border rounded-lg px-3 py-2 bg-gray-50">
                {bookingInfo?.name || 'Nguyễn Văn A'} ({bookingInfo?.phone || '09xx xxx xxx'})
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 text-xs font-medium mb-1">Ngày đặt</label>
                <div className="font-semibold text-gray-900 border rounded-lg px-3 py-2 bg-gray-50 text-xs">
                  {bookingInfo?.date || '2026-10-25'}
                </div>
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-medium mb-1">Giờ đến</label>
                <div className="font-semibold text-green-700 border border-green-200 rounded-lg px-3 py-2 bg-green-50 text-xs">
                  {bookingInfo?.time || '19:00'}
                </div>
              </div>
            </div>
            {bookingInfo?.note && (
              <div>
                <label className="block text-gray-500 text-xs font-medium mb-1">Ghi chú đặc biệt</label>
                <div className="text-gray-700 border rounded-lg px-3 py-2 bg-gray-50 text-xs italic">
                  &ldquo;{bookingInfo.note}&rdquo;
                </div>
              </div>
            )}
          </div>

          <div className="bg-green-50/70 p-4 rounded-xl mb-6 border border-green-200">
            <p className="text-xs text-green-800 font-bold uppercase mb-1">Bước tiếp theo: Bước 3</p>
            <p className="text-xs text-green-900 leading-relaxed">
              Bạn sẽ chuyển sang chọn thực đơn món ăn vào giỏ hàng. Bạn có thể chọn đặt món trước hoặc chọn bỏ qua để tới bước xác nhận!
            </p>
          </div>

          <button
            onClick={handleContinue}
            className="interactive-btn w-full flex items-center justify-center gap-2 bg-green-800 text-white font-bold py-3.5 rounded-xl hover:bg-green-900 shadow-md transition-all text-sm mb-2"
          >
            <span>Tiếp tục: Chọn món ăn vào Giỏ hàng</span>
            <span>→</span>
          </button>

          <Link
            href="/booking"
            className="interactive-btn block w-full text-center text-gray-600 font-semibold py-2.5 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-sm transition-colors"
          >
            ← Quay lại sửa thông tin bàn
          </Link>
        </div>

      </div>
    </main>
  );
}