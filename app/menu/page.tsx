"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';

interface DishItem {
  _id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: 'Khai vị' | 'Món chính' | 'Tráng miệng' | 'Đồ uống';
  isPreOrderOnly?: boolean;
}

const MENU_LIST: DishItem[] = [
  // Khai vị
  {
    _id: 'menu-01',
    name: 'Gỏi Cuốn Tôm Thịt Thanh Mát',
    price: 85000,
    description: 'Tôm đất luộc tươi ngọt cuộn cùng thịt ba rọi mềm thơm, rau thơm Tây Ninh thanh mát và bún tươi dai mềm chấm sốt tương bơ đậu phộng.',
    imageUrl: '/foods/goi_cuon.jpg',
    category: 'Khai vị',
    isPreOrderOnly: false,
  },
  {
    _id: 'menu-02',
    name: 'Chả Giò Cua Hoàng Đế & Trứng Cá Tầm Caviar',
    price: 295000,
    description: 'Thịt cua hoàng đế tươi ngọt gói trọn trong lớp bánh tráng mỏng giòn, phủ lớp trứng cá tầm Caviar sang trọng. Chỉ nhận phục vụ khi đặt trước.',
    imageUrl: '/foods/cha_gio.jpg',
    category: 'Khai vị',
    isPreOrderOnly: true,
  },
  {
    _id: 'menu-03',
    name: 'Nộm Hoa Chuối Tai Heo Giòn Chua Ngọt',
    price: 95000,
    description: 'Hoa chuối bào giòn rụm trộn tai heo sần sật bóp chua cay ngọt vị, thêm lạc rang thơm bùi Tây Bắc.',
    imageUrl: '/foods/nom_hoa_chuoi.jpg',
    category: 'Khai vị',
    isPreOrderOnly: false,
  },

  // Món chính
  {
    _id: 'menu-04',
    name: 'Phở Bò Wagyu A5 Thượng Hạng Dát Vàng',
    price: 380000,
    description: 'Nước dùng truyền thống thanh ngọt từ xương hầm 24 giờ cùng thịt bò Wagyu A5 mềm mọng hảo hạng dát vàng lá thực phẩm sang trọng.',
    imageUrl: '/foods/pho_bo2.jpg',
    category: 'Món chính',
    isPreOrderOnly: true,
  },
  {
    _id: 'menu-05',
    name: 'Vịt Quay Bắc Kinh Sốt Mật Ong Rừng Tây Bắc',
    price: 450000,
    description: 'Thịt vịt tươi mềm bóng bẩy tẩm ướp mật ong rừng nguyên bản Tây Bắc cùng thảo mộc cung đình, nướng lu đất giòn da bóng bẩy.',
    imageUrl: '/foods/vit_quay2.jpg',
    category: 'Món chính',
    isPreOrderOnly: true,
  },
  {
    _id: 'menu-06',
    name: 'Cá Chẽm Hấp Tàu Xì Cổ Truyền',
    price: 290000,
    description: 'Cá chẽm tươi nguyên con ngọt thịt hấp cùng nước sốt tương tàu xì hảo hạng, gừng tươi và hành hoa thơm dịu.',
    imageUrl: '/foods/ca_chem_hap.jpg',
    category: 'Món chính',
    isPreOrderOnly: false,
  },

  // Tráng miệng
  {
    _id: 'menu-07',
    name: 'Chè Sen Hạt Long Nhãn Cung Đình',
    price: 65000,
    description: 'Hạt sen Huế ninh mềm dẻo lồng ghép tinh tế vào từng trái nhãn lồng Hưng Yên ngọt lịm nước đường phèn.',
    imageUrl: '/foods/che_sen.jpg',
    category: 'Tráng miệng',
    isPreOrderOnly: false,
  },
  {
    _id: 'menu-08',
    name: 'Bánh Caramen Sốt Cà Phê Ban Mê',
    price: 55000,
    description: 'Bánh flan caramen mịn màng béo ngậy vị sữa thơm kết hợp tinh tế cùng sốt cà phê Phin đậm đặc đặc trưng.',
    imageUrl: '/foods/banh.jpg',
    category: 'Tráng miệng',
    isPreOrderOnly: false,
  },
  {
    _id: 'menu-09',
    name: 'Sữa Chua Nếp Cẩm Mộc Châu Nhà Làm',
    price: 50000,
    description: 'Nếp cẩm Sơn La dẻo thơm lên men chuẩn vị ngọt bùi hòa quyện cùng sữa chua nhà làm béo ngậy mát lành.',
    imageUrl: '/foods/sua_chua.jpg',
    category: 'Tráng miệng',
    isPreOrderOnly: false,
  },

  // Đồ uống
  {
    _id: 'menu-10',
    name: 'Trà Sen Vàng Tây Hồ Thượng Hạng',
    price: 55000,
    description: 'Trà sen thủ công ướp bông hoa sen Bách Diệp ven hồ Tây, thanh khiết trang nhã.',
    imageUrl: '/foods/hero-bg2.jpg',
    category: 'Đồ uống',
    isPreOrderOnly: false,
  },
  {
    _id: 'menu-11',
    name: 'Vang Đỏ Bordeaux Cao Cấp (Pháp)',
    price: 180000,
    description: 'Rượu vang đỏ đậm đà, vị chát mượt mà lưu hương thảo mộc và gỗ sồi.',
    imageUrl: '/foods/hero-bg1.jpg',
    category: 'Đồ uống',
    isPreOrderOnly: false,
  },
];

export default function MenuPage() {
  const router = useRouter();
  const { cart, addToCart, totalItems, totalPrice, hasActiveBooking, bookingInfo } = useCart();

  // Biến lưu trạng thái tab đang được chọn
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');

  // Modal thông báo khi người dùng chưa đặt bàn nhưng bấm vào món đặc biệt
  const [specialDishModal, setSpecialDishModal] = useState<DishItem | null>(null);

  const formatMoney = (val: number) => {
    return val.toLocaleString('vi-VN') + 'đ';
  };

  const handleAddToCart = (dish: DishItem) => {
    // Nếu là món đặc biệt (isPreOrderOnly) mà khách CHƯA đặt bàn xong:
    if (dish.isPreOrderOnly && !hasActiveBooking) {
      setSpecialDishModal(dish);
      return;
    }

    addToCart({
      _id: dish._id,
      name: dish.name,
      price: dish.price,
      imageUrl: dish.imageUrl,
      category: dish.category,
      isPreOrderOnly: dish.isPreOrderOnly,
    });
  };

  const filteredDishes = MENU_LIST.filter((dish) => {
    if (activeCategory === 'Tất cả') return true;
    if (activeCategory === 'Món đặc biệt') return dish.isPreOrderOnly;
    return dish.category === activeCategory;
  });

  return (
    <main className="flex-1 bg-white relative pb-16">
      {/* Banner phụ */}
      <div className="relative h-[32vh] bg-cover bg-center flex items-center justify-center" style={{ backgroundImage: "url('/foods/hero-bg2.jpg')" }}>
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-3xl md:text-5xl font-bold font-sans mb-3">Thực Đơn SmaRes</h1>
          <p className="text-sm md:text-base text-gray-200 font-light max-w-2xl mx-auto">
            Sự giao thoa hoàn hảo giữa ẩm thực truyền thống Việt Nam & phong cách ẩm thực thượng hạng hiện đại
          </p>
        </div>
      </div>

      {/* Thông báo trạng thái đặt bàn nếu có */}
      {hasActiveBooking ? (
        <div className="bg-green-50 border-b border-green-200 py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-green-900">
              <span>⭐</span>
              <span>
                Bạn đang có đơn giữ chỗ: <strong>Bàn {bookingInfo?.tableNumber}</strong> ({bookingInfo?.time}, {bookingInfo?.date}) • Tất cả món đặc quyền đã được mở khóa!
              </span>
            </div>
            <Link
              href="/booking/menu"
              className="font-bold text-green-800 underline hover:text-green-900 whitespace-nowrap ml-2"
            >
              Vào giỏ đặt món theo bàn →
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50/70 border-b border-amber-200/80 py-2.5 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <span>👑</span>
              <span>
                Các món đặc biệt (Phở Wagyu A5 dát vàng, Vịt quay lu đất,...) chỉ mở khi đặt bàn trước.
              </span>
            </div>
            <Link
              href="/booking"
              className="font-bold text-amber-800 underline hover:text-amber-950 whitespace-nowrap ml-2"
            >
              Đặt bàn ngay để mở khóa →
            </Link>
          </div>
        </div>
      )}

      {/* Thanh danh mục */}
      <div className="flex justify-center space-x-2 md:space-x-4 py-6 border-b overflow-x-auto px-4 sticky top-16 bg-white/95 backdrop-blur-md z-20">
        {[
          { id: 'Tất cả', label: 'Tất cả' },
          { id: 'Món đặc biệt', label: '👑 Món Đặc Biệt (Đặt trước)' },
          { id: 'Khai vị', label: 'Khai vị' },
          { id: 'Món chính', label: 'Món chính' },
          { id: 'Tráng miệng', label: 'Tráng miệng' },
          { id: 'Đồ uống', label: 'Đồ uống & Rượu' },
        ].map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`interactive-btn px-5 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? tab.id === 'Món đặc biệt'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-green-800 text-white shadow-sm'
                  : tab.id === 'Món đặc biệt'
                  ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                  : 'text-gray-600 hover:text-green-800 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Danh sách món ăn */}
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 min-h-[50vh]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDishes.map((dish) => {
            const inCart = cart.find((i) => i._id === dish._id);

            return (
              <div
                key={dish._id}
                className={`interactive-card bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:shadow-lg ${
                  dish.isPreOrderOnly
                    ? 'border-amber-300 ring-1 ring-amber-100 bg-gradient-to-b from-amber-50/20 to-white'
                    : 'border-gray-200'
                }`}
              >
                <div className="h-56 bg-gray-100 relative overflow-hidden">
                  <img
                    src={dish.imageUrl}
                    alt={dish.name}
                    className="w-full h-full object-cover card-zoom-img"
                  />
                  {dish.isPreOrderOnly && (
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 backdrop-blur-sm">
                      <span>👑</span>
                      <span>Món Đặc Quyền Đặt Trước</span>
                    </div>
                  )}
                  {inCart && (
                    <div className="absolute top-3 right-3 bg-green-700 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                      Đã chọn: {inCart.quantity}
                    </div>
                  )}
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2 gap-3">
                      <h3 className="font-bold text-lg text-gray-900 leading-tight group-hover:text-green-800 transition-colors">
                        {dish.name}
                      </h3>
                      <span className="text-green-700 font-bold whitespace-nowrap text-base">
                        {formatMoney(dish.price)}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2 leading-relaxed">
                      {dish.description}
                    </p>
                  </div>

                  <div className="pt-2">
                    {dish.isPreOrderOnly && !hasActiveBooking ? (
                      <button
                        onClick={() => handleAddToCart(dish)}
                        className="interactive-btn w-full py-2.5 px-4 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span>👑</span>
                        <span>Món đặc biệt — Cần đặt bàn trước</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(dish)}
                        className={`interactive-btn w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          dish.isPreOrderOnly
                            ? 'bg-amber-600 hover:bg-amber-700 text-white shadow'
                            : 'bg-green-800 hover:bg-green-900 text-white shadow-sm'
                        }`}
                      >
                        <span>+ Thêm vào giỏ hàng</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Cart Widget nếu có món trong giỏ */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <Link
            href={hasActiveBooking ? '/booking/menu' : '/booking'}
            className="flex items-center gap-3 bg-green-800 hover:bg-green-900 text-white px-5 py-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 ring-4 ring-green-100"
          >
            <span className="text-xl">🛒</span>
            <div className="text-left">
              <p className="text-xs text-gray-200 leading-none">Giỏ hàng thực đơn</p>
              <p className="text-sm font-bold leading-tight mt-0.5">
                {totalItems} món • {formatMoney(totalPrice)}
              </p>
            </div>
            <span className="text-sm font-bold pl-1">→</span>
          </Link>
        </div>
      )}

      {/* MODAL THÔNG BÁO MÓN ĐẶC BIỆT CHỈ CÓ KHI ĐẶT TRƯỚC */}
      {specialDishModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-gray-100 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 text-3xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
              👑
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 inline-block mb-2">
              Món Ăn Đặc Quyền
            </span>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {specialDishModal.name}
            </h3>

            <p className="text-xs text-gray-600 leading-relaxed mb-6">
              Món ăn này được bếp trưởng chế biến kỳ công với nguyên liệu tuyển chọn tươi sống.
              <strong> Chỉ phục vụ khi quý khách đã hoàn tất đặt bàn trước.</strong>
            </p>

            <div className="space-y-2">
              <Link
                href="/booking"
                className="interactive-btn block w-full bg-green-800 hover:bg-green-900 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all"
              >
                Đặt bàn ngay để mở khóa món này →
              </Link>

              <button
                onClick={() => setSpecialDishModal(null)}
                className="block w-full text-xs text-gray-500 hover:text-gray-800 font-semibold py-2 transition-colors"
              >
                Xem các món khác
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}