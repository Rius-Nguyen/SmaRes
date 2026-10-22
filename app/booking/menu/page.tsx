"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BookingStepper from '@/components/BookingStepper';
import { useCart, CartItem } from '@/app/context/CartContext';

interface DishData {
  _id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: 'Khai vị' | 'Món chính' | 'Tráng miệng' | 'Đồ uống';
  isPreOrderOnly?: boolean;
  preparationNote?: string;
}

const MENU_DISHES: DishData[] = [
  // MÓN ĐẶC BIỆT CHỈ CÓ KHI ĐẶT TRƯỚC (isPreOrderOnly: true)
  {
    _id: 'spec-01',
    name: 'Phở Bò Wagyu A5 Thượng Hạng Dát Vàng',
    price: 380000,
    description: 'Nước dùng ninh tủy xương 24 giờ cùng thịt bò Wagyu A5 vân mỡ cẩm thạch tuyệt hảo, phủ vàng lá ẩm thực cao cấp.',
    imageUrl: '/foods/pho_bo2.jpg',
    category: 'Món chính',
    isPreOrderOnly: true,
    preparationNote: 'Cần 3 giờ chuẩn bị nước hầm Wagyu đặc biệt',
  },
  {
    _id: 'spec-02',
    name: 'Vịt Quay Bắc Kinh Sốt Mật Ong Rừng Tây Bắc',
    price: 450000,
    description: 'Vịt tươi thượng hạng tẩm ướp 12 loại thảo mộc quý tộc Tây Bắc, nướng lu đất giòn da bóng bẩy, kèm bánh tráng phơi sương.',
    imageUrl: '/foods/vit_quay2.jpg',
    category: 'Món chính',
    isPreOrderOnly: true,
    preparationNote: 'Chế biến lu nung thủ công 2.5 giờ trước giờ đến',
  },
  {
    _id: 'spec-03',
    name: 'Chả Giò Cua Hoàng Đế & Trứng Cá Tầm Caviar',
    price: 295000,
    description: 'Thịt cua hoàng đế tươi ngọt gói trọn trong lớp bánh tráng mỏng giòn, phủ lớp trứng cá tầm Caviar sang trọng.',
    imageUrl: '/foods/cha_gio.jpg',
    category: 'Khai vị',
    isPreOrderOnly: true,
    preparationNote: 'Nguyên liệu hải sản tuyển chọn tươi sống trong ngày',
  },
  {
    _id: 'spec-04',
    name: 'Cá Chẽm Hoàng Gia Hấp Sốt Tàu Xì Cổ Truyền',
    price: 350000,
    description: 'Cá chẽm nguyên con đánh bắt trong ngày, hấp cách thủy cùng nấm đông cô tươi, rượu hoa tiêu và tương đậu đen ủ men cổ truyền.',
    imageUrl: '/foods/ca_chem_hap.jpg',
    category: 'Món chính',
    isPreOrderOnly: true,
    preparationNote: 'Hấp nhiệt độ chuẩn xác 45 phút trước khi khách ngồi vào bàn',
  },

  // CÁC MÓN PHỔ THÔNG KHAI VỊ
  {
    _id: 'dish-01',
    name: 'Gỏi Cuốn Tôm Thịt Thanh Mát',
    price: 85000,
    description: 'Tôm đất luộc tươi ngọt cuộn cùng thịt ba rọi mềm thơm, rau thơm Tây Ninh thanh mát và bún tươi dai mềm chấm sốt tương bơ đậu phộng.',
    imageUrl: '/foods/goi_cuon.jpg',
    category: 'Khai vị',
    isPreOrderOnly: false,
  },
  {
    _id: 'dish-02',
    name: 'Nộm Hoa Chuối Tai Heo Giòn Chua Ngọt',
    price: 95000,
    description: 'Hoa chuối bào giòn rụm trộn tai heo sần sật bóp chua cay ngọt vị, thêm lạc rang thơm bùi và rau răm thơm ngát.',
    imageUrl: '/foods/nom_hoa_chuoi.jpg',
    category: 'Khai vị',
    isPreOrderOnly: false,
  },

  // CÁC MÓN TRÁNG MIỆNG
  {
    _id: 'dish-03',
    name: 'Chè Sen Hạt Long Nhãn Cung Đình',
    price: 65000,
    description: 'Hạt sen Huế ninh mềm dẻo lồng ghép tinh tế vào từng trái nhãn lồng Hưng Yên ngọt lịm nước đường phèn hoa bưởi thanh khiết.',
    imageUrl: '/foods/che_sen.jpg',
    category: 'Tráng miệng',
    isPreOrderOnly: false,
  },
  {
    _id: 'dish-04',
    name: 'Bánh Caramen Sốt Cà Phê Phin Ban Mê',
    price: 55000,
    description: 'Bánh flan caramen mịn màng béo ngậy vị sữa thơm kết hợp tinh tế cùng sốt cà phê Phin đậm đặc đặc trưng đất Tây Nguyên.',
    imageUrl: '/foods/banh.jpg',
    category: 'Tráng miệng',
    isPreOrderOnly: false,
  },
  {
    _id: 'dish-05',
    name: 'Sữa Chua Nếp Cẩm Mộc Châu Nhà Làm',
    price: 50000,
    description: 'Nếp cẩm men tự nhiên dẻo quánh chuẩn vị ngọt bùi hòa quyện cùng sữa chua nhà làm béo ngậy mát lành xua tan nóng nực.',
    imageUrl: '/foods/sua_chua.jpg',
    category: 'Tráng miệng',
    isPreOrderOnly: false,
  },

  // ĐỒ UỐNG
  {
    _id: 'drink-01',
    name: 'Trà Sen Vàng Thượng Hạng Tây Hồ',
    price: 55000,
    description: 'Trà ướp hoa sen bách diệp hồ Tây thơm dịu quý phái, thanh lọc vị giác hoàn hảo sau bữa ăn đậm đà.',
    imageUrl: '/foods/hero-bg2.jpg',
    category: 'Đồ uống',
    isPreOrderOnly: false,
  },
  {
    _id: 'drink-02',
    name: 'Vang Đỏ Bordeaux Cao Cấp (Ly/Chai)',
    price: 180000,
    description: 'Rượu vang đỏ Pháp đậm vị quả mọng chín, hương gỗ sồi và tannin mượt mà, hòa hợp tuyệt hảo cùng món bò và vịt quay.',
    imageUrl: '/foods/hero-bg1.jpg',
    category: 'Đồ uống',
    isPreOrderOnly: false,
  },
];

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
  const [showCartDrawer, setShowCartDrawer] = useState<boolean>(false);

  // Định dạng tiền tệ VNĐ
  const formatMoney = (val: number) => {
    return val.toLocaleString('vi-VN') + 'đ';
  };

  // Lọc danh sách món ăn theo tab
  const filteredDishes = MENU_DISHES.filter((dish) => {
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
  const handleAddDish = (dish: DishData) => {
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

  // Hành động "Bỏ qua đặt món trước" (Không bắt buộc)
  const handleSkipDishes = () => {
    // Không bắt buộc đặt món, có thể giữ giỏ hàng trống hoặc xóa nếu muốn
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
                <li>Mở khóa danh mục <strong>Món Ăn Đặc Biệt</strong> (Phở Wagyu A5, Vịt quay Bắc Kinh lu đất,...)</li>
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

      {/* Banner tóm tắt bàn đã chọn & Quyền lợi đặt món */}
      <div className="bg-white border-b border-gray-200 shadow-sm py-4 px-4 sm:px-6 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider bg-green-100 text-green-800 px-2.5 py-1 rounded-md">
                Đã giữ chỗ: Bàn {bookingInfo?.tableNumber} ({bookingInfo?.tableType})
              </span>
              <span className="text-xs text-gray-500 font-medium">
                • {bookingInfo?.time}, ngày {bookingInfo?.date}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                • Khách: {bookingInfo?.name} ({bookingInfo?.guests})
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold font-sans text-gray-900 mt-1">
              3. Chọn Món Ăn Vào Giỏ Hàng (Tùy chọn)
            </h1>
          </div>

          {/* Hai nút hành động nhanh ở header */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleSkipDishes}
              className="interactive-btn flex-1 md:flex-initial text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-4 py-2.5 rounded-xl border border-gray-300 transition-colors whitespace-nowrap"
            >
              Bỏ qua chọn món →
            </button>
            <button
              onClick={handleProceedToConfirm}
              className="interactive-btn flex-1 md:flex-initial text-xs sm:text-sm font-bold bg-green-800 hover:bg-green-900 text-white px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>Xác nhận thực đơn ({totalItems})</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Thông báo hướng dẫn: Bước chọn món không bắt buộc & Món đặc biệt */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-green-50 rounded-2xl p-4 md:p-5 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center text-lg shrink-0 shadow-sm">
              👑
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                Đã mở khóa các Món Ăn Đặc Quyền dành riêng cho khách Đặt bàn trước!
              </h3>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                Những món ăn chế biến công phu (Phở Wagyu A5 dát vàng, Vịt quay lu đất, Cá chẽm hoàng gia,...) chỉ có thể gọi khi đặt trước.
                <span className="font-semibold text-green-800 ml-1">
                  Bước đặt món là tùy chọn — bạn có thể bỏ qua và gọi món tại nhà hàng khi đến.
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('Món đặc biệt')}
            className="interactive-btn text-xs font-bold text-amber-800 bg-amber-100/80 hover:bg-amber-200 px-4 py-2 rounded-lg whitespace-nowrap border border-amber-300 shrink-0"
          >
            Xem món đặc biệt ⭐
          </button>
        </div>
      </div>

      {/* Nội dung chính: Danh mục + Danh sách món + Giỏ hàng mini */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Cột trái (3 phần): Danh mục tab & Grid thẻ món ăn */}
        <div className="lg:col-span-3">
          {/* Thanh chuyển tab danh mục */}
          <div className="flex items-center space-x-2 pb-4 overflow-x-auto border-b border-gray-200 scrollbar-none mb-6">
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
                  onClick={() => setActiveTab(tab.id)}
                  className={`interactive-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? tab.id === 'Món đặc biệt'
                        ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-300'
                        : 'bg-green-800 text-white shadow-sm'
                      : tab.id === 'Món đặc biệt'
                      ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                      : 'text-gray-600 hover:text-green-800 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && !isActive && (
                    <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Grid danh sách món ăn */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDishes.map((dish) => {
              const qtyInCart = getItemQuantityInCart(dish._id);

              return (
                <div
                  key={dish._id}
                  className={`interactive-card bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:shadow-md ${
                    dish.isPreOrderOnly
                      ? 'border-amber-300/80 ring-1 ring-amber-200 bg-gradient-to-b from-amber-50/20 to-white'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Phần hình ảnh */}
                  <div className="h-48 bg-gray-100 relative overflow-hidden">
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      className="w-full h-full object-cover card-zoom-img"
                    />

                    {/* Badge món đặc biệt */}
                    {dish.isPreOrderOnly ? (
                      <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 backdrop-blur-sm">
                        <span>👑</span>
                        <span>Món Đặc Quyền Pre-Order</span>
                      </div>
                    ) : (
                      <div className="absolute top-2.5 left-2.5 bg-black/60 text-white text-[11px] font-medium px-2 py-0.5 rounded-md backdrop-blur-sm">
                        {dish.category}
                      </div>
                    )}

                    {/* Giá tiền nổi bật trên góc ảnh */}
                    <div className="absolute bottom-2.5 right-2.5 bg-white/95 text-green-800 font-bold text-xs px-2.5 py-1 rounded-lg shadow-sm border border-gray-100">
                      {formatMoney(dish.price)}
                    </div>
                  </div>

                  {/* Phần thông tin món */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        className={`font-bold text-base leading-snug group-hover:text-green-800 transition-colors line-clamp-1 ${
                          dish.isPreOrderOnly ? 'text-amber-950 font-bold' : 'text-gray-900'
                        }`}
                        title={dish.name}
                      >
                        {dish.name}
                      </h3>
                      <p className="text-gray-500 text-xs mt-2 line-clamp-2 leading-relaxed">
                        {dish.description}
                      </p>

                      {dish.preparationNote && (
                        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-100 font-medium">
                          <span>⏱️</span>
                          <span className="line-clamp-1">{dish.preparationNote}</span>
                        </div>
                      )}
                    </div>

                    {/* Nút thêm vào giỏ hoặc bộ điều khiển số lượng */}
                    <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                      {qtyInCart === 0 ? (
                        <button
                          onClick={() => handleAddDish(dish)}
                          className={`interactive-btn w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                            dish.isPreOrderOnly
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                              : 'bg-green-800 hover:bg-green-900 text-white shadow-sm'
                          }`}
                        >
                          <span>+ Thêm vào thực đơn</span>
                        </button>
                      ) : (
                        <div className="w-full flex items-center justify-between bg-green-50 rounded-xl p-1 border border-green-200">
                          <button
                            onClick={() => updateQuantity(dish._id, qtyInCart - 1)}
                            className="w-8 h-8 rounded-lg bg-white text-green-800 font-bold shadow-sm hover:bg-gray-100 flex items-center justify-center transition-colors"
                          >
                            –
                          </button>
                          <span className="font-bold text-xs text-green-900 px-3">
                            {qtyInCart} phần
                          </span>
                          <button
                            onClick={() => updateQuantity(dish._id, qtyInCart + 1)}
                            className="w-8 h-8 rounded-lg bg-green-800 text-white font-bold shadow-sm hover:bg-green-900 flex items-center justify-center transition-colors"
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

        {/* Cột phải (1 phần): Tóm tắt Giỏ hàng đặt trước (Live Cart Sidebar) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-36">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛒</span>
                <h2 className="font-bold text-base text-gray-900">Thực đơn đã chọn</h2>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                {totalItems} món
              </span>
            </div>

            {/* Danh sách món trong giỏ */}
            {cart.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-xl text-gray-400 mb-2">
                  🍽️
                </div>
                <p className="text-xs text-gray-500 font-medium">Chưa có món nào được chọn</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Bạn có thể chọn món ăn để phục vụ sẵn khi đến, hoặc bấm <strong>&ldquo;Bỏ qua chọn món&rdquo;</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between gap-3 text-xs border-b border-gray-100 pb-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {item.isPreOrderOnly && (
                          <span className="text-amber-600 text-xs" title="Món đặc biệt">
                            👑
                          </span>
                        )}
                        <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                      </div>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        {formatMoney(item.price)} × {item.quantity} ={' '}
                        <strong className="text-green-800">{formatMoney(item.price * item.quantity)}</strong>
                      </p>
                    </div>

                    {/* Bộ tăng/giảm số lượng */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-xs"
                      >
                        -
                      </button>
                      <span className="w-4 text-center font-bold text-gray-800 text-xs">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-xs"
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
              <div className="my-3 p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5">
                <span>⭐</span>
                <span>
                  Thực đơn có <strong>{getSpecialItems().length} món đặc quyền</strong> sẽ được chuẩn bị sẵn sàng.
                </span>
              </div>
            )}

            {/* Tổng tiền */}
            <div className="border-t pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Số lượng món:</span>
                <span className="font-semibold text-gray-800">{totalItems} phần</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-1">
                <span>Tạm tính thực đơn:</span>
                <span className="text-green-800 text-base">{formatMoney(totalPrice)}</span>
              </div>
            </div>

            {/* Các nút hành động */}
            <div className="mt-5 space-y-2">
              <button
                onClick={handleProceedToConfirm}
                className="interactive-btn w-full bg-green-800 hover:bg-green-900 text-white font-bold py-3 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <span>Xác nhận thực đơn & Tiếp tục</span>
                <span>→</span>
              </button>

              <button
                onClick={handleSkipDishes}
                className="interactive-btn w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-xs transition-colors"
              >
                Bỏ qua chọn món (Gọi tại bàn)
              </button>

              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="w-full text-center text-[11px] text-red-500 hover:text-red-700 font-medium pt-1"
                >
                  Xóa toàn bộ món đã chọn
                </button>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 text-center">
              <Link
                href="/booking/diagram"
                className="text-xs text-gray-500 hover:text-green-800 flex items-center justify-center gap-1"
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
