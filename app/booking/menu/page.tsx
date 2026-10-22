"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BookingStepper from '@/components/BookingStepper';
import { useCart } from '@/app/context/CartContext';
import { INITIAL_MENU_ITEMS, MenuItemData } from '@/app/lib/menuInitialData';

export default function BookingMenuPage() {
  const router = useRouter();
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
    bookingInfo,
    hasActiveBooking,
    isLoaded,
    hasSpecialItems,
    getSpecialItems,
  } = useCart();

  const [activeTab, setActiveTab] = useState<string>('Tất cả');
  const [menuDishes, setMenuDishes] = useState<MenuItemData[]>(INITIAL_MENU_ITEMS);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tải danh sách thực đơn đồng nhất từ MongoDB API (/api/menu)
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch('/api/menu');
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setMenuDishes(json.data);
        }
      } catch (e) {
        console.error('Lỗi khi tải thực đơn từ API, sử dụng dữ liệu mặc định:', e);
      }
    };
    fetchMenu();
  }, []);

  // Định dạng tiền tệ VNĐ
  const formatMoney = (val: number) => {
    return val.toLocaleString('vi-VN') + 'đ';
  };

  // Lọc danh sách món ăn theo tab & từ khóa tìm kiếm
  const filteredDishes = menuDishes.filter((dish) => {
    if (searchQuery.trim() !== '') {
      return dish.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    if (activeTab === 'Món đặc biệt') return dish.isPreOrderOnly;
    if (activeTab === 'Tất cả') return true;
    return dish.category === activeTab;
  });

  // Tìm số lượng món hiện có trong giỏ
  const getItemQuantityInCart = (dishId: string) => {
    const item = cart.find((i) => i._id === dishId);
    return item ? item.quantity : 0;
  };

  // Thêm món vào giỏ
  const handleAddDish = (dish: MenuItemData) => {
    addToCart({
      _id: dish._id,
      name: dish.name,
      price: dish.price,
      imageUrl: dish.imageUrl,
      category: dish.category,
      isPreOrderOnly: dish.isPreOrderOnly,
    });
  };

  // Điều hướng sang Bước 4 (Xác nhận đặt bàn & thực đơn)
  const handleProceedToConfirm = () => {
    router.push('/booking/confirm');
  };

  // Hành động "Bỏ qua chọn món trước" (Không bắt buộc)
  const handleSkipDishes = () => {
    router.push('/booking/confirm');
  };

  // NẾU CHƯA CÓ THÔNG TIN ĐẶT BÀN VÀ CHƯA CHỌN BÀN Ở BƯỚC 1 & 2
  if (isLoaded && !hasActiveBooking) {
    return (
      <main className="flex-1 bg-gray-50 flex flex-col min-h-screen">
        <BookingStepper currentStep={3} />
        <div className="max-w-2xl mx-auto my-auto py-16 px-4 text-center">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-200">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl border border-amber-200">
              🔒
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-sans text-gray-900 mb-3">
              Yêu cầu hoàn tất Bước 1 & 2
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Để bảo đảm món ăn được bếp trưởng chuẩn bị tươi ngon nhất theo đúng giờ đến, bạn cần hoàn thành
              <strong> Bước 1 (Thông tin đặt bàn)</strong> và <strong>Bước 2 (Chọn vị trí bàn trên sơ đồ)</strong> trước khi chọn thực đơn.
            </p>

            <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 text-left mb-8">
              <p className="text-xs font-bold text-amber-900 mb-1">⭐ ĐẶC QUYỀN KHI ĐẶT BÀN TRƯỚC:</p>
              <ul className="text-xs text-amber-800 space-y-1 list-disc pl-4">
                <li>Mở khóa danh mục <strong>Món Ăn Đặc Biệt</strong> (Phở Wagyu A5, Vịt quay lu đất,...)</li>
                <li>Không phải chờ đợi chế biến khi đến nhà hàng</li>
                <li>Bước chọn món là <em>tùy chọn (không bắt buộc)</em> — bạn có thể chọn hoặc bỏ qua bất kỳ lúc nào!</li>
              </ul>
            </div>

            <Link
              href="/booking"
              className="interactive-btn inline-flex items-center gap-2 bg-green-800 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-green-900 shadow-md transition-all text-sm"
            >
              <span>← Bắt đầu đặt bàn & chọn bàn ngay</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-gray-50 flex flex-col min-h-screen pb-28">
      {/* Workflow Stepper: Bước 3 */}
      <BookingStepper currentStep={3} />

      {/* Banner tóm tắt bàn đã chọn */}
      <div className="bg-white border-b border-gray-200 shadow-sm py-4 px-4 sm:px-6 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold uppercase tracking-wider bg-green-100 text-green-800 px-3.5 py-1.5 rounded-lg">
                Đã giữ chỗ: Bàn {bookingInfo?.tableNumber} ({bookingInfo?.tableType})
              </span>
              <span className="text-sm text-gray-700 font-semibold">
                • {bookingInfo?.time}, ngày {bookingInfo?.date}
              </span>
              <span className="text-sm text-gray-700 font-semibold">
                • Khách: {bookingInfo?.name} ({bookingInfo?.guests})
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-sans text-gray-900 mt-2">
              3. Chọn Món Ăn Vào Giỏ Hàng (Tùy chọn)
            </h1>
          </div>

          {/* Nút tiến hành xem xác nhận */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleProceedToConfirm}
              className="interactive-btn w-full sm:w-auto text-sm sm:text-base font-bold bg-green-800 hover:bg-green-900 text-white px-6 py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>Xác nhận thực đơn ({totalItems} món)</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* THÔNG BÁO GHI CHÚ QUAN TRỌNG: CHỮ TO VÀ NỔI BẬT ĐỂ KHÁCH HÀNG BIẾT BƯỚC NÀY LÀ TÙY CHỌN */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-gradient-to-r from-amber-100/90 via-yellow-50 to-emerald-50 rounded-3xl p-6 md:p-8 border-2 border-amber-300 shadow-md">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-3xl shrink-0 shadow-md">
                👑
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-bold text-amber-950 tracking-normal font-sans">
                  Đã mở khóa các Món Ăn Đặc Quyền dành riêng cho khách Đặt bàn trước!
                </h2>
                <p className="text-base md:text-lg text-gray-800 leading-relaxed font-normal">
                  Những món ăn chế biến công phu (Phở Wagyu A5 dát vàng, Vịt quay lu đất, Cá chẽm hoàng gia,...) chỉ có thể gọi khi đặt trước.
                </p>
                {/* DÒNG NHẤN MẠNH BƯỚC ĐẶT MÓN LÀ TÙY CHỌN CHỮ TO NỔI BẬT */}
                <div className="bg-white/95 rounded-2xl p-4 border border-emerald-300 shadow-sm mt-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl sm:text-3xl shrink-0 mt-0.5">💡</span>
                    <div className="text-base md:text-lg text-emerald-950 leading-relaxed font-sans">
                      <span className="font-bold text-emerald-800 uppercase tracking-wide mr-2">
                        Lưu ý quan trọng:
                      </span>
                      <span>
                        Bước đặt món là <strong>TÙY CHỌN (Không bắt buộc)</strong> — Quý khách có thể chọn món ngay hoặc bấm nút <strong>&ldquo;Bỏ qua chọn món&rdquo;</strong> để đến nhà hàng mới gọi món!
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('Món đặc biệt')}
              className="interactive-btn text-base font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 px-6 py-3.5 rounded-xl whitespace-nowrap border border-amber-400 shrink-0 shadow-sm transition-all"
            >
              Xem ngay các món đặc biệt ⭐
            </button>
          </div>
        </div>
      </div>

      {/* Nội dung chính: Danh mục + Danh sách món + Giỏ hàng mini */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Cột trái (8/12 cột): Danh mục tab & Grid thẻ món ăn */}
        <div className="lg:col-span-8">
          {/* Thanh chuyển tab danh mục & Ô tìm kiếm */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 mb-6">
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {[
                { id: 'Tất cả', label: 'Tất cả món' },
                { id: 'Món đặc biệt', label: '👑 Món Đặc Biệt Đặt Trước', badge: 'Mới' },
                { id: 'Khai vị', label: 'Khai vị' },
                { id: 'Món chính', label: 'Món chính' },
                { id: 'Tráng miệng', label: 'Tráng miệng' },
                { id: 'Đồ uống', label: 'Đồ uống & Rượu' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchQuery('');
                    }}
                    className={`interactive-btn px-4 py-2.5 rounded-xl text-sm sm:text-base font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isActive
                        ? tab.id === 'Món đặc biệt'
                          ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-300'
                          : 'bg-green-800 text-white shadow-sm'
                        : tab.id === 'Món đặc biệt'
                        ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                        : 'text-gray-600 hover:text-green-800 hover:bg-gray-100'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.badge && !isActive && (
                      <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Ô tìm kiếm món ăn */}
            <div className="relative w-full sm:w-64 shrink-0">
              <input
                type="text"
                placeholder="Tìm món ăn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-green-700 bg-white"
              />
              <span className="absolute right-3 top-3 text-gray-400 text-sm">🔍</span>
            </div>
          </div>

          {/* Grid danh sách món ăn - CHỮ KHÔNG BỊ CẮT, HIỂN THỊ ĐẦY ĐỦ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDishes.map((dish) => {
              const qtyInCart = getItemQuantityInCart(dish._id);

              return (
                <div
                  key={dish._id}
                  className={`interactive-card bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:shadow-lg ${
                    dish.isPreOrderOnly
                      ? 'border-amber-300 ring-1 ring-amber-200 bg-gradient-to-b from-amber-50/20 to-white'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Phần hình ảnh */}
                  <div className="h-52 bg-gray-100 relative overflow-hidden">
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      className="w-full h-full object-cover card-zoom-img"
                    />

                    {/* Badge món đặc biệt */}
                    {dish.isPreOrderOnly ? (
                      <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 backdrop-blur-sm">
                        <span>👑</span>
                        <span>Món Đặc Quyền Pre-Order</span>
                      </div>
                    ) : (
                      <div className="absolute top-2.5 left-2.5 bg-black/60 text-white text-xs font-medium px-2.5 py-0.5 rounded-md backdrop-blur-sm">
                        {dish.category}
                      </div>
                    )}

                    {/* Giá tiền */}
                    <div className="absolute bottom-2.5 right-2.5 bg-white/95 text-green-800 font-bold text-sm px-3 py-1 rounded-lg shadow-sm border border-gray-100">
                      {formatMoney(dish.price)}
                    </div>
                  </div>

                  {/* Phần thông tin món - HIỆN TOÀN BỘ CHỮ, KHÔNG CẮT BỎ */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Tiêu đề món: hiện trọn vẹn tên món ăn */}
                      <h3
                        className={`font-bold text-lg leading-snug group-hover:text-green-800 transition-colors ${
                          dish.isPreOrderOnly ? 'text-amber-950' : 'text-gray-900'
                        }`}
                      >
                        {dish.name}
                      </h3>

                      {/* Mô tả món ăn: hiển thị đầy đủ, cỡ chữ rõ ràng */}
                      <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                        {dish.description}
                      </p>

                      {/* Ghi chú chuẩn bị món đặc biệt */}
                      {dish.preparationNote && (
                        <div className="mt-3 flex items-start gap-1.5 text-xs sm:text-sm text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-medium">
                          <span className="shrink-0 mt-0.5">⏱️</span>
                          <span className="leading-tight">{dish.preparationNote}</span>
                        </div>
                      )}
                    </div>

                    {/* Nút thêm vào giỏ hoặc bộ điều khiển số lượng */}
                    <div className="mt-5 pt-3 border-t border-gray-100">
                      {qtyInCart === 0 ? (
                        <button
                          onClick={() => handleAddDish(dish)}
                          className={`interactive-btn w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                            dish.isPreOrderOnly
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                              : 'bg-green-800 hover:bg-green-900 text-white shadow-sm'
                          }`}
                        >
                          <span>+ Thêm vào thực đơn</span>
                        </button>
                      ) : (
                        <div className="w-full flex items-center justify-between bg-green-50 rounded-xl p-1.5 border border-green-200">
                          <button
                            onClick={() => updateQuantity(dish._id, qtyInCart - 1)}
                            className="w-9 h-9 rounded-lg bg-white text-green-800 font-bold shadow-sm hover:bg-gray-100 flex items-center justify-center text-base transition-colors"
                          >
                            –
                          </button>
                          <span className="font-bold text-sm text-green-900 px-3">
                            {qtyInCart} phần
                          </span>
                          <button
                            onClick={() => updateQuantity(dish._id, qtyInCart + 1)}
                            className="w-9 h-9 rounded-lg bg-green-800 text-white font-bold shadow-sm hover:bg-green-900 flex items-center justify-center text-base transition-colors"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cột phải (4/12 cột): Tóm tắt Giỏ hàng đặt trước rộng rãi, không bị chật */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-36">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛒</span>
                <h2 className="font-bold text-lg text-gray-900">Thực đơn đã chọn</h2>
              </div>
              <span className="text-xs sm:text-sm font-bold px-2.5 py-1 bg-green-100 text-green-800 rounded-full">
                {totalItems} món
              </span>
            </div>

            {/* Danh sách món trong giỏ */}
            {cart.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-2xl text-gray-400 mb-2">
                  🍽️
                </div>
                <p className="text-sm text-gray-600 font-semibold">Chưa chọn món nào</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                  Quý khách có thể chọn món ngay, hoặc bấm <strong>&ldquo;Bỏ qua chọn món&rdquo;</strong> bên dưới.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between gap-3 text-sm border-b border-gray-100 pb-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {item.isPreOrderOnly && (
                          <span className="text-amber-600 text-xs shrink-0" title="Món đặc biệt">
                            👑
                          </span>
                        )}
                        <p className="font-semibold text-gray-900 leading-snug">{item.name}</p>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {formatMoney(item.price)} × {item.quantity} ={' '}
                        <strong className="text-green-800 font-bold">{formatMoney(item.price * item.quantity)}</strong>
                      </p>
                    </div>

                    {/* Bộ tăng/giảm số lượng */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-sm"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-bold text-gray-900 text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cảnh báo món đặc biệt nếu có */}
            {hasSpecialItems && (
              <div className="my-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs sm:text-sm text-amber-900 flex items-center gap-2">
                <span className="text-base">⭐</span>
                <span>
                  Đã có <strong>{getSpecialItems().length} món đặc quyền</strong> sẽ được chuẩn bị trước.
                </span>
              </div>
            )}

            {/* Tổng tiền */}
            <div className="border-t pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Số lượng món:</span>
                <span className="font-bold text-gray-900">{totalItems} phần</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 pt-1">
                <span>Tạm tính thực đơn:</span>
                <span className="text-green-800 text-lg font-bold">{formatMoney(totalPrice)}</span>
              </div>
            </div>

            {/* Các nút hành động: RỘNG RÃI, THOÁNG ĐÃNG, KHÔNG BỊ CHẬT HOẶC XUỐNG DÒNG LỖI */}
            <div className="mt-6 space-y-3">
              <button
                onClick={handleProceedToConfirm}
                className="interactive-btn w-full bg-green-800 hover:bg-green-900 text-white font-bold py-3.5 px-4 rounded-xl text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>Xác nhận thực đơn & Tiếp tục</span>
                <span className="text-base font-bold">→</span>
              </button>

              <button
                onClick={handleSkipDishes}
                className="interactive-btn w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 border border-gray-200"
              >
                <span>Bỏ qua chọn món (Gọi tại bàn)</span>
                <span className="text-xs">⏩</span>
              </button>

              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="w-full text-center text-xs text-red-500 hover:text-red-700 font-medium pt-1"
                >
                  Xóa toàn bộ món đã chọn
                </button>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 text-center">
              <Link
                href="/booking/diagram"
                className="text-sm font-medium text-gray-500 hover:text-green-800 flex items-center justify-center gap-1"
              >
                <span>←</span>
                <span>Đổi vị trí bàn khác</span>
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* Thanh Bottom Sticky Bar trên màn hình điện thoại / di động */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-lg z-40 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] text-gray-500">Đã chọn: {totalItems} món</p>
          <p className="text-sm font-bold text-green-800">{formatMoney(totalPrice)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSkipDishes}
            className="text-xs font-semibold px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Bỏ qua
          </button>
          <button
            onClick={handleProceedToConfirm}
            className="text-xs font-bold px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 shadow"
          >
            Tiếp tục →
          </button>
        </div>
      </div>
    </main>
  );
}
