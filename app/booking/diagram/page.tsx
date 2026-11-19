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

  // Khởi tạo danh sách bàn động từ TABLES_DATA
  const [liveTables, setLiveTables] = useState<TableItem[]>(TABLES_DATA);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState<boolean>(true);

  // Khởi tạo bàn đã chọn (ưu tiên thông tin đã lưu, hoặc mặc định V02 hoặc B05)
  const [selectedTableId, setSelectedTableId] = useState<string>(
    bookingInfo?.tableNumber || 'V02'
  );

  const [previewImageModal, setPreviewImageModal] = useState<boolean>(false);

  // Đồng bộ trạng thái bàn đã đặt theo ngày giờ thực tế từ API /api/tables/availability (TK-125)
  useEffect(() => {
    let isMounted = true;
    const fetchAvailability = async () => {
      setIsLoadingAvailability(true);
      const date = bookingInfo?.date || '2026-10-25';
      const time = bookingInfo?.time || '19:00';

      try {
        const res = await fetch(
          `/api/tables/availability?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`,
          { cache: 'no-store' }
        );
        const json = await res.json();

        if (json.success && isMounted) {
          const bookedSet = new Set<string>(
            (json.bookedTableNumbers || []).map((n: string) => String(n).trim().toUpperCase())
          );

          if (Array.isArray(json.tables)) {
            json.tables.forEach((t: any) => {
              if (t.isAvailable === false && t.tableNumber) {
                bookedSet.add(String(t.tableNumber).trim().toUpperCase());
              }
            });
          }

          setLiveTables((prev) => {
            const updated = prev.map((item) => {
              const isOccupied =
                bookedSet.has(item.id.toUpperCase()) || bookedSet.has(item.name.toUpperCase());
              return {
                ...item,
                status: isOccupied ? ('occupied' as const) : item.status,
              };
            });

            // Nếu bàn hiện tại đang được chọn mà bị trùng (đã đặt), tự động chọn bàn trống đầu tiên
            const currentSelected = updated.find((t) => t.id === selectedTableId);
            if (currentSelected && currentSelected.status !== 'available') {
              const firstAvail = updated.find((t) => t.status === 'available');
              if (firstAvail) {
                setSelectedTableId(firstAvail.id);
              }
            }

            return updated;
          });
        }
      } catch (err) {
        console.error('Lỗi khi tải tình trạng bàn trống:', err);
      } finally {
        if (isMounted) setIsLoadingAvailability(false);
      }
    };

    fetchAvailability();

    return () => {
      isMounted = false;
    };
  }, [bookingInfo?.date, bookingInfo?.time]);

  const selectedTable =
    liveTables.find((t) => t.id === selectedTableId) || liveTables[1] || TABLES_DATA[1];

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
    <main className="flex-1 bg-[#faf8f5] text-[#1c1917] flex flex-col min-h-screen pb-20">
      {/* Header */}
      <div className="bg-[#0a1f14] py-14 text-center px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#fbbf24]/5 rounded-full blur-3xl"></div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#14532d]/70 border border-[#fbbf24]/40 text-[#fde68a] text-xs font-semibold uppercase tracking-widest mb-3 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]"></span>
            Sơ đồ vị trí trực quan
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white mb-3 tracking-tight">
            2. Chọn Vị Trí Bàn Trên Sơ Đồ
          </h1>
          <p className="text-stone-300 text-sm md:text-base max-w-xl mx-auto font-light leading-relaxed">
            Xem hình ảnh thực tế, tầm nhìn không gian và chọn vị trí lý tưởng nhất cho bữa tiệc của bạn.
          </p>
        </div>
      </div>

      {/* Workflow Stepper: Bước 2 */}
      <BookingStepper currentStep={2} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Cột Trái: Sơ đồ bàn ăn (7/12 cột) */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df] p-6 md:p-8">
          {/* Chú thích trạng thái */}
          <div className="flex flex-wrap items-center justify-between border-b border-[#ebe7df] pb-6 mb-8 gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#14532d]">Không gian nhà hàng SmaRes</h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Tình trạng bàn ngày <strong className="text-stone-800">{bookingInfo?.date || '2026-10-25'}</strong> lúc <strong className="text-stone-800">{bookingInfo?.time || '19:00'}</strong> (Nhấp vào bàn xanh để chọn)
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs sm:text-sm font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-[#dcfce7] border border-[#86efac] rounded-md shadow-xs"></span>
                <span className="text-stone-700">Trống (Có thể chọn)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-[#fee2e2] border border-[#fca5a5] rounded-md shadow-xs"></span>
                <span className="text-stone-700">Đã có khách</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-[#fef3c7] border border-[#fde68a] rounded-md shadow-xs"></span>
                <span className="text-stone-700">Đang dọn (~10p)</span>
              </div>
            </div>
          </div>

          {/* Khu vực VIP */}
          <div className="mb-8 bg-[#fffbeb] p-5 rounded-2xl border border-[#fde68a]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs sm:text-sm font-bold text-[#92400e] uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
                </svg>
                <span>Khu vực Phòng VIP (Không gian riêng tư cao cấp)</span>
              </h3>
              <span className="text-xs font-semibold text-[#92400e] bg-[#fef3c7] px-3 py-1 rounded-full border border-[#fcd34d]">
                6 - 10 chỗ
              </span>
            </div>
            <div className="flex flex-wrap gap-5">
              {liveTables.filter((t) => t.zone === 'VIP').map((table) => {
                const isSelected = selectedTableId === table.id;
                const isAvailable = table.status === 'available';

                return (
                  <button
                    key={table.id}
                    onClick={() => handleSelectTable(table)}
                    disabled={!isAvailable}
                    className={`w-24 h-24 rounded-full flex flex-col items-center justify-center font-bold transition-all relative border ${
                      table.status === 'occupied'
                        ? 'bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5] opacity-70 cursor-not-allowed'
                        : table.status === 'cleaning'
                        ? 'bg-[#fef3c7] text-[#b45309] border-[#fde68a] cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#14532d] text-white border-[#22c55e] ring-4 ring-[#bbf7d0] scale-105 shadow-lg'
                        : 'bg-[#dcfce7] text-[#15803d] border-[#86efac] hover:bg-[#bbf7d0] hover:scale-105 cursor-pointer shadow-xs'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 bg-[#fbbf24] text-[#1c1917] rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow-sm">
                        ✓
                      </span>
                    )}
                    <span className="text-lg font-serif font-bold">{table.name}</span>
                    <span className="text-xs font-medium opacity-90">{table.seats} chỗ</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Khu Trung tâm */}
          <div className="mb-8 bg-[#faf8f5] p-5 rounded-2xl border border-[#ebe7df]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs sm:text-sm font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path>
                  <path d="M7 2v20"></path>
                  <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>
                </svg>
                <span>Khu Trung tâm (Không gian ấm cúng, thoáng đãng)</span>
              </h3>
              <span className="text-xs font-semibold text-stone-700 bg-stone-200 px-3 py-1 rounded-full">
                2 - 8 chỗ
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {liveTables.filter((t) => t.zone === 'Trung tâm').map((table) => {
                const isSelected = selectedTableId === table.id;
                const isAvailable = table.status === 'available';

                return (
                  <button
                    key={table.id}
                    onClick={() => handleSelectTable(table)}
                    disabled={!isAvailable}
                    className={`h-20 rounded-xl flex flex-col items-center justify-center font-bold transition-all relative border ${
                      table.id === 'B07' ? 'col-span-2' : ''
                    } ${
                      table.status === 'occupied'
                        ? 'bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5] opacity-70 cursor-not-allowed'
                        : table.status === 'cleaning'
                        ? 'bg-[#fef3c7] text-[#b45309] border-[#fde68a] cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#14532d] text-white border-[#22c55e] ring-4 ring-[#bbf7d0] scale-105 shadow-md'
                        : 'bg-[#dcfce7] text-[#15803d] border-[#86efac] hover:bg-[#bbf7d0] hover:scale-102 cursor-pointer shadow-xs'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 bg-[#fbbf24] text-[#1c1917] rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow-sm">
                        ✓
                      </span>
                    )}
                    <span className="text-lg font-serif font-bold">{table.name}</span>
                    <span className="text-xs font-medium opacity-90">{table.seats} chỗ</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cạnh cửa sổ */}
          <div className="bg-[#f0f9ff] p-5 rounded-2xl border border-[#bae6fd]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs sm:text-sm font-bold text-[#0369a1] uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-[#0284c7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                  <path d="M3 12h18"></path>
                  <path d="M12 3v18"></path>
                </svg>
                <span>Cạnh cửa sổ (View kính ngắm phố lung linh)</span>
              </h3>
              <span className="text-xs font-semibold text-[#0369a1] bg-[#e0f2fe] px-3 py-1 rounded-full border border-[#7dd3fc]">
                4 chỗ
              </span>
            </div>
            <div className="flex flex-wrap gap-4">
              {liveTables.filter((t) => t.zone === 'Cửa sổ').map((table) => {
                const isSelected = selectedTableId === table.id;
                const isAvailable = table.status === 'available';

                return (
                  <button
                    key={table.id}
                    onClick={() => handleSelectTable(table)}
                    disabled={!isAvailable}
                    className={`w-28 h-20 rounded-xl flex flex-col items-center justify-center font-bold transition-all relative border ${
                      table.status === 'occupied'
                        ? 'bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5] opacity-70 cursor-not-allowed'
                        : table.status === 'cleaning'
                        ? 'bg-[#fef3c7] text-[#b45309] border-[#fde68a] cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#14532d] text-white border-[#22c55e] ring-4 ring-[#bbf7d0] scale-105 shadow-md'
                        : 'bg-[#dcfce7] text-[#15803d] border-[#86efac] hover:bg-[#bbf7d0] hover:scale-105 cursor-pointer shadow-xs'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 bg-[#fbbf24] text-[#1c1917] rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow-sm">
                        ✓
                      </span>
                    )}
                    <span className="text-lg font-serif font-bold">{table.name}</span>
                    <span className="text-xs font-medium opacity-90">{table.seats} chỗ</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cột Phải: Hình ảnh thực tế của bàn, view và form xác nhận (5/12 cột) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card Hình ảnh thực tế và View của bàn ăn */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df] overflow-hidden">
            <div className="relative h-60 bg-stone-900 group cursor-pointer" onClick={() => setPreviewImageModal(true)}>
              <img
                src={selectedTable.image}
                alt={`Hình ảnh thực tế bàn ${selectedTable.name}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              
              <div className="absolute top-3 left-3 bg-white/95 text-[#14532d] text-xs font-bold px-3 py-1 rounded-full shadow-md backdrop-blur-xs flex items-center gap-1.5 border border-[#ebe7df]">
                <svg className="w-3.5 h-3.5 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                  <circle cx="12" cy="13" r="3"></circle>
                </svg>
                <span>Ảnh thực tế bàn ăn</span>
              </div>

              <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-xs flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <span>Phóng to</span>
              </div>

              <div className="absolute bottom-3 left-4 right-4 text-white">
                <span className="text-xs font-bold uppercase tracking-wider text-[#fbbf24]">
                  {selectedTable.zone} • {selectedTable.seats} chỗ ngồi
                </span>
                <h3 className="text-2xl font-serif font-bold leading-tight mt-1">
                  Bàn {selectedTable.name} — Không gian thực tế
                </h3>
              </div>
            </div>

            {/* Chi tiết View & Đặc điểm */}
            <div className="p-6 space-y-5">
              <div>
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
                  </svg>
                  <span>Tầm nhìn &amp; Cảm quan (View)</span>
                </h4>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-normal bg-[#faf8f5] p-4 rounded-xl border border-[#ebe7df]">
                  {selectedTable.viewDescription}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  <span>Tiện ích &amp; Điểm nổi bật</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTable.features.map((feat, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-[#f0fdf4] text-[#15803d] font-semibold px-3 py-1.5 rounded-lg border border-[#bbf7d0] flex items-center gap-1"
                    >
                      <svg className="w-3 h-3 text-[#15803d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>{feat}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Box Xác nhận bàn và chuyển tiếp sang Bước 3 */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df] p-6 sm:p-7">
            <div className="border-b border-[#ebe7df] pb-4 mb-4">
              <span className="text-xs font-bold text-[#14532d] uppercase tracking-wider">Thông tin đặt bàn</span>
              <h2 className="text-2xl font-serif font-bold text-stone-900 mt-1">
                Bàn {selectedTable.name} — {selectedTable.seats} người
              </h2>
            </div>
            
            <div className="space-y-3.5 text-xs sm:text-sm mb-6">
              <div className="flex justify-between items-center py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Khách hàng:</span>
                <span className="font-semibold text-stone-900">
                  {bookingInfo?.name || 'Nguyễn Văn A'} ({bookingInfo?.phone || '09xx xxx xxx'})
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Ngày dùng bữa:</span>
                <span className="font-semibold text-stone-900">{bookingInfo?.date || '2026-10-25'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Giờ đến:</span>
                <span className="font-bold text-[#14532d] bg-[#f0fdf4] px-2.5 py-1 rounded-md border border-[#bbf7d0]">
                  {bookingInfo?.time || '19:00'}
                </span>
              </div>
            </div>

            <div className="bg-[#f0fdf4] p-4 rounded-xl mb-6 border border-[#bbf7d0] text-xs sm:text-sm text-[#14532d]">
              <p className="font-bold mb-1 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#15803d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path>
                  <path d="M7 2v20"></path>
                  <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>
                </svg>
                <span>Bước tiếp theo: Chọn món ăn (Tùy chọn)</span>
              </p>
              <p className="text-stone-600 leading-relaxed text-xs">
                Bạn có thể chọn đặt trước các món đặc quyền hoặc chọn bỏ qua để tới bước xác nhận.
              </p>
            </div>

            <button
              onClick={handleContinue}
              className="w-full flex items-center justify-center gap-2 bg-[#14532d] hover:bg-[#15803d] text-white font-semibold py-4 rounded-xl shadow-[0_8px_24px_-4px_rgba(20,83,45,0.45)] hover:shadow-[0_12px_28px_-4px_rgba(20,83,45,0.6)] transition-all text-sm sm:text-base mb-3 cursor-pointer"
            >
              <span>Tiếp tục: Chọn món ăn vào Giỏ hàng</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </button>

            <Link
              href="/booking"
              className="block w-full text-center text-stone-500 font-semibold py-2.5 hover:text-[#14532d] hover:bg-stone-100 rounded-lg text-xs sm:text-sm transition-colors"
            >
              ← Quay lại sửa thông tin bàn
            </Link>
          </div>

        </div>

      </div>

      {/* Modal phóng to ảnh thực tế bàn ăn */}
      {previewImageModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImageModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-96 bg-stone-950">
              <img
                src={selectedTable.image}
                alt={selectedTable.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setPreviewImageModal(false)}
                className="absolute top-4 right-4 bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center text-sm hover:bg-black transition-colors cursor-pointer"
              >
                ✕
              </button>
              <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-xs p-4 rounded-2xl text-white">
                <span className="text-xs font-bold text-[#fbbf24] uppercase">
                  {selectedTable.zone} • Bàn {selectedTable.name} ({selectedTable.seats} chỗ)
                </span>
                <p className="text-xs text-stone-200 mt-1">{selectedTable.viewDescription}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}