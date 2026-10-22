"use client";

import { useState } from 'react';
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
  image: string;
  viewDescription: string;
  features: string[];
}

const TABLES_DATA: TableItem[] = [
  // VIP
  {
    id: 'V01',
    name: 'V01',
    seats: 6,
    status: 'occupied',
    zone: 'VIP',
    image: '/foods/table_vip.jpg',
    viewDescription: 'Phòng VIP Hoàng Gia riêng tư với vách gỗ trạm trổ và đèn chùm vàng quyền quý. Cách âm tuyệt đối.',
    features: ['Riêng tư 100%', 'Đèn chùm pha lê', 'Ghế nhung bọc nệm', 'Phục vụ riêng'],
  },
  {
    id: 'V02',
    name: 'V02',
    seats: 6,
    status: 'available',
    zone: 'VIP',
    image: '/foods/table_vip.jpg',
    viewDescription: 'Phòng VIP Thượng Uyển riêng tư cách âm, view tiểu cảnh sân vườn bonsai và tranh sơn dầu cổ điển. Thích hợp tiếp đãi đối tác quan trọng.',
    features: ['Không gian riêng tư', 'Bàn tròn nhung cao cấp', 'Đèn chùm ấm áp', 'Menu phục vụ riêng'],
  },
  {
    id: 'V03',
    name: 'V03',
    seats: 10,
    status: 'cleaning',
    zone: 'VIP',
    image: '/foods/table_vip.jpg',
    viewDescription: 'Phòng tiệc VIP lớn dành cho đại gia đình 10 khách, không gian ấm cúng sang trọng bậc nhất SmaRes.',
    features: ['Sức chứa 10 người', 'Bàn tròn mâm xoay', 'Phòng tiệc cao cấp'],
  },

  // Trung tâm
  {
    id: 'B01',
    name: 'B01',
    seats: 2,
    status: 'occupied',
    zone: 'Trung tâm',
    image: '/foods/table_center.jpg',
    viewDescription: 'Bàn đôi khu sảnh chính lãng mạn, đèn lồng mây tre ấm áp.',
    features: ['Ấm cúng', 'Bàn gỗ mộc tự nhiên'],
  },
  {
    id: 'B02',
    name: 'B02',
    seats: 4,
    status: 'available',
    zone: 'Trung tâm',
    image: '/foods/table_center.jpg',
    viewDescription: 'Khu đại sảnh ngập tràn năng lượng ẩm thực Á Đông, bàn gỗ tròn tự nhiên, lồng đèn mây tre thủ công và hoa tươi trang trí tao nhã.',
    features: ['Không gian thoáng đãng', 'Bàn ghế gỗ bọc nệm', 'Gần quầy ẩm thực', 'Âm nhạc êm dịu'],
  },
  {
    id: 'B03',
    name: 'B03',
    seats: 4,
    status: 'occupied',
    zone: 'Trung tâm',
    image: '/foods/table_center.jpg',
    viewDescription: 'Bàn gia đình 4 chỗ khu trung tâm thoáng mát.',
    features: ['Thoáng mát', 'Bàn gỗ sang trọng'],
  },
  {
    id: 'B04',
    name: 'B04',
    seats: 2,
    status: 'cleaning',
    zone: 'Trung tâm',
    image: '/foods/table_center.jpg',
    viewDescription: 'Bàn 2 chỗ cạnh cụm cây xanh trong nhà.',
    features: ['Cây xanh thư thái'],
  },
  {
    id: 'B05',
    name: 'B05',
    seats: 4,
    status: 'available',
    zone: 'Trung tâm',
    image: '/foods/table_center.jpg',
    viewDescription: 'Vị trí đắc địa nhất khu trung tâm: bàn tròn gỗ cao cấp, tầm nhìn bao quát toàn bộ không gian nhà hàng lung linh và quầy bar cocktail hiện đại.',
    features: ['Vị trí trung tâm đẹp nhất', 'Bàn tròn tiện trò chuyện', 'Ánh sáng nghệ thuật', 'Ghế nệm êm ái'],
  },
  {
    id: 'B06',
    name: 'B06',
    seats: 4,
    status: 'available',
    zone: 'Trung tâm',
    image: '/foods/table_center.jpg',
    viewDescription: 'Bàn 4 chỗ không gian mở thoáng đạt, phù hợp bạn bè tụ họp thưởng thức ẩm thực Việt Nam tinh tế.',
    features: ['Không gian mở', 'Thân thiện gia đình', 'Bàn gỗ tự nhiên'],
  },
  {
    id: 'B07',
    name: 'B07',
    seats: 8,
    status: 'occupied',
    zone: 'Trung tâm',
    image: '/foods/table_center.jpg',
    viewDescription: 'Bàn tiệc dài 8 chỗ dành cho nhóm bạn đông người.',
    features: ['Nhóm 8 người', 'Bàn tiệc dài'],
  },

  // Cửa sổ
  {
    id: 'W01',
    name: 'W01',
    seats: 4,
    status: 'available',
    zone: 'Cửa sổ',
    image: '/foods/table_window.jpg',
    viewDescription: 'Bàn cạnh vách kính tràn viền tầng cao ôm trọn cảnh sắc thành phố lung linh về đêm, ánh nến lung linh và góc check-in tuyệt đẹp cho bữa tối lãng mạn.',
    features: ['View triệu đô phố đêm', 'Cạnh kính tràn viền', 'Ánh nến lãng mạn', 'Góc sống ảo đẹp nhất'],
  },
  {
    id: 'W02',
    name: 'W02',
    seats: 4,
    status: 'occupied',
    zone: 'Cửa sổ',
    image: '/foods/table_window.jpg',
    viewDescription: 'Bàn view cửa sổ nhìn xuống đại lộ sầm uất.',
    features: ['View đại lộ phố hoa', 'Cạnh cửa sổ'],
  },
  {
    id: 'W03',
    name: 'W03',
    seats: 4,
    status: 'cleaning',
    zone: 'Cửa sổ',
    image: '/foods/table_window.jpg',
    viewDescription: 'Bàn góc cửa sổ yên tĩnh ngắm hoàng hôn.',
    features: ['View hoàng hôn', 'Góc yên tĩnh'],
  },
];

export default function BookingDiagramPage() {
  const router = useRouter();
  const { bookingInfo, setBookingInfo } = useCart();

  // Khởi tạo bàn đã chọn (ưu tiên thông tin đã lưu, hoặc mặc định V02 hoặc B05)
  const [selectedTableId, setSelectedTableId] = useState<string>(
    bookingInfo?.tableNumber || 'V02'
  );

  const [previewImageModal, setPreviewImageModal] = useState<boolean>(false);

  const selectedTable =
    TABLES_DATA.find((t) => t.id === selectedTableId) || TABLES_DATA[1]; // fallback V02

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
        <span className="text-sm uppercase tracking-widest text-green-400 font-bold mb-2 inline-block">
          Sơ đồ vị trí trực quan
        </span>
        <h1 className="text-3xl md:text-5xl font-sans font-bold text-white mb-2">
          2. Chọn Vị Trí Bàn Trên Sơ Đồ
        </h1>
        <p className="text-gray-300 text-base md:text-lg max-w-2xl mx-auto">
          Xem hình ảnh thực tế, tầm nhìn (view) không gian và chọn vị trí lý tưởng nhất cho bữa tiệc của bạn
        </p>
      </div>

      {/* Workflow Stepper: Bước 2 */}
      <BookingStepper currentStep={2} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Cột Trái: Sơ đồ bàn ăn (7/12 cột) */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
          {/* Chú thích trạng thái */}
          <div className="flex flex-wrap items-center justify-between border-b pb-6 mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Không gian nhà hàng SmaRes</h2>
              <p className="text-sm text-gray-600 mt-1">Nhấp vào bàn màu xanh để xem ảnh thực tế & view bàn</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm font-semibold">
              <div className="flex items-center">
                <span className="w-4 h-4 bg-green-500 rounded-sm mr-2 shadow-sm"></span>
                <span className="text-gray-700">Trống (Có thể chọn)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 bg-red-500 rounded-sm mr-2 shadow-sm"></span>
                <span className="text-gray-700">Đã có khách</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 bg-yellow-400 rounded-sm mr-2 shadow-sm"></span>
                <span className="text-gray-700">Đang dọn (~10p)</span>
              </div>
            </div>
          </div>

          {/* Khu vực VIP */}
          <div className="mb-8 bg-amber-50/50 p-5 rounded-2xl border border-amber-200/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                <span>👑</span> Khu vực Phòng VIP (Không gian riêng tư cao cấp)
              </h3>
              <span className="text-xs sm:text-sm font-semibold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                6 - 10 chỗ
              </span>
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
                      <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow">
                        ✓
                      </span>
                    )}
                    <span className="text-lg font-bold">{table.name}</span>
                    <span className="text-xs sm:text-sm font-medium opacity-90">{table.seats} chỗ</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Khu Trung tâm */}
          <div className="mb-8 bg-gray-50/80 p-5 rounded-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <span>🍽️</span> Khu Trung tâm (Không gian ấm cúng, thoáng đãng)
              </h3>
              <span className="text-xs sm:text-sm font-semibold text-gray-700 bg-gray-200 px-3 py-1 rounded-full">
                2 - 8 chỗ
              </span>
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
                      <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow">
                        ✓
                      </span>
                    )}
                    <span className="text-lg font-bold">{table.name}</span>
                    <span className="text-xs sm:text-sm font-medium opacity-90">{table.seats} chỗ</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cạnh cửa sổ */}
          <div className="bg-sky-50/60 p-5 rounded-2xl border border-sky-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-sky-900 uppercase tracking-wider flex items-center gap-2">
                <span>🪟</span> Cạnh cửa sổ (View kính ngắm thành phố lung linh)
              </h3>
              <span className="text-xs sm:text-sm font-semibold text-sky-800 bg-sky-100 px-3 py-1 rounded-full">
                4 chỗ
              </span>
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
                    className={`w-28 h-20 rounded-xl flex flex-col items-center justify-center font-bold shadow-sm transition-all relative ${
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
                      <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow">
                        ✓
                      </span>
                    )}
                    <span className="text-lg font-bold">{table.name}</span>
                    <span className="text-xs sm:text-sm font-medium opacity-90">{table.seats} chỗ</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cột Phải: Hình ảnh thực tế của bàn, view và form xác nhận (5/12 cột) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card Hình ảnh thực tế và View của bàn ăn */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="relative h-60 bg-gray-900 group cursor-pointer" onClick={() => setPreviewImageModal(true)}>
              <img
                src={selectedTable.image}
                alt={`Hình ảnh thực tế bàn ${selectedTable.name}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              
              <div className="absolute top-3 left-3 bg-white/95 text-green-900 text-sm font-bold px-3.5 py-1.5 rounded-full shadow-md backdrop-blur-sm flex items-center gap-1.5">
                <span>📸</span>
                <span>Hình ảnh thực tế bàn ăn</span>
              </div>

              <div className="absolute top-3 right-3 bg-black/60 text-white text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1">
                <span>🔍</span> Phóng to
              </div>

              <div className="absolute bottom-3 left-4 right-4 text-white">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-green-400">
                  {selectedTable.zone} • {selectedTable.seats} chỗ ngồi
                </span>
                <h3 className="text-2xl font-bold leading-tight mt-1">
                  Bàn {selectedTable.name} — Không gian thực tế
                </h3>
              </div>
            </div>

            {/* Chi tiết View & Đặc điểm */}
            <div className="p-6 space-y-5">
              <div>
                <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>✨</span> Tầm nhìn & Cảm quan (View)
                </h4>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-normal bg-gray-50 p-4 rounded-xl border border-gray-200">
                  {selectedTable.viewDescription}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <span>💎</span> Tiện ích & Điểm nổi bật
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTable.features.map((feat, idx) => (
                    <span
                      key={idx}
                      className="text-xs sm:text-sm bg-green-50 text-green-800 font-semibold px-3 py-1.5 rounded-lg border border-green-200"
                    >
                      ✓ {feat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Box Xác nhận bàn và chuyển tiếp sang Bước 3 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-7">
            <div className="border-b pb-4 mb-4">
              <span className="text-xs sm:text-sm font-bold text-green-700 uppercase tracking-wider">Thông tin đặt bàn</span>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">
                Bàn {selectedTable.name} — {selectedTable.seats} người
              </h2>
            </div>
            
            <div className="space-y-3.5 text-sm sm:text-base mb-6">
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Khách hàng:</span>
                <span className="font-bold text-gray-900">
                  {bookingInfo?.name || 'Nguyễn Văn A'} ({bookingInfo?.phone || '09xx xxx xxx'})
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Ngày dùng bữa:</span>
                <span className="font-bold text-gray-900">{bookingInfo?.date || '2026-10-25'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Giờ đến:</span>
                <span className="font-bold text-green-800 bg-green-50 px-2.5 py-1 rounded border border-green-200">
                  {bookingInfo?.time || '19:00'}
                </span>
              </div>
            </div>

            <div className="bg-emerald-50/80 p-4 rounded-xl mb-6 border border-emerald-200 text-sm text-emerald-950">
              <p className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                <span>🍽️</span> Bước tiếp theo: Chọn món ăn (Tùy chọn)
              </p>
              <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed">
                Bạn có thể chọn đặt trước các món đặc biệt hoặc chọn bỏ qua để tới bước xác nhận.
              </p>
            </div>

            <button
              onClick={handleContinue}
              className="interactive-btn w-full flex items-center justify-center gap-2 bg-green-800 text-white font-bold py-4 rounded-xl hover:bg-green-900 shadow-md transition-all text-base sm:text-lg mb-3"
            >
              <span>Tiếp tục: Chọn món ăn vào Giỏ hàng</span>
              <span>→</span>
            </button>

            <Link
              href="/booking"
              className="interactive-btn block w-full text-center text-gray-600 font-semibold py-2.5 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-sm sm:text-base transition-colors"
            >
              ← Quay lại sửa thông tin bàn
            </Link>
          </div>

        </div>

      </div>

      {/* Modal phóng to ảnh thực tế bàn ăn */}
      {previewImageModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImageModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-96 bg-gray-950">
              <img
                src={selectedTable.image}
                alt={selectedTable.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setPreviewImageModal(false)}
                className="absolute top-4 right-4 bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center text-lg hover:bg-black transition-colors"
              >
                ✕
              </button>
              <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm p-4 rounded-2xl text-white">
                <span className="text-xs font-bold text-green-400 uppercase">
                  {selectedTable.zone} • Bàn {selectedTable.name} ({selectedTable.seats} chỗ)
                </span>
                <p className="text-xs text-gray-200 mt-1">{selectedTable.viewDescription}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}