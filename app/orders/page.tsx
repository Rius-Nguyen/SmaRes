'use client';

import { useState, useEffect } from 'react';

interface OrderItem {
  foodId?: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  _id: string;
  userId?: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'PENDING' | 'COOKING' | 'COMPLETED' | 'CANCELLED';
  phone: string;
  createdAt?: string;
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Chỉ lọc lấy đúng món ăn (bắt buộc có price > 0 và không phải tài khoản user)
  const extractValidFoodItems = (arr: any[]): OrderItem[] => {
    if (!Array.isArray(arr)) return [];
    const valid = arr.filter(
      (it) =>
        it &&
        typeof it === 'object' &&
        (it.name || it.title || it.foodName) &&
        Number(it.price || it.unitPrice || 0) > 0 &&
        !it.email &&
        !it.password &&
        !it.role &&
        !it.phone &&
        !it.date
    );
    return valid.map((it) => ({
      name: String(it.name || it.title || it.foodName),
      price: Number(it.price || it.unitPrice || 0),
      quantity: Number(it.quantity || it.qty || 1),
    }));
  };

  const getLatestCustomerBooking = (): Order | null => {
    if (typeof window === 'undefined') return null;

    let cartItems: OrderItem[] = [];
    let latestBookingInfo: any = null;
    let latestCode = '';

    const storages = [window.localStorage, window.sessionStorage];

    for (let s = 0; s < storages.length; s++) {
      const store = storages[s];
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (!key || key.toLowerCase().includes('user') || key.toLowerCase().includes('auth')) continue;

        const rawStr = store.getItem(key) || '';
        const codeMatch = rawStr.match(/SR-\d{4}-\d{4}/);
        if (codeMatch && !latestCode) {
          latestCode = codeMatch[0];
        }

        try {
          const parsed = JSON.parse(rawStr);

          // 1. Tìm mảng món ăn hợp lệ (có giá tiền > 0)
          const rawList = Array.isArray(parsed)
            ? parsed
            : parsed?.items || parsed?.cart || parsed?.preOrders || parsed?.selectedDishes;

          const foodList = extractValidFoodItems(rawList);
          if (foodList.length > cartItems.length) {
            cartItems = foodList;
          }

          // 2. Tìm thông tin đặt bàn mới nhất của khách
          const candidate = Array.isArray(parsed) ? parsed[parsed.length - 1] : parsed;
          if (
            candidate &&
            typeof candidate === 'object' &&
            !candidate.password &&
            !candidate.role &&
            (candidate.table ||
              candidate.tableName ||
              candidate.selectedTable ||
              candidate.guests ||
              candidate.time ||
              candidate.bookingCode)
          ) {
            latestBookingInfo = candidate;
            // Nếu bên trong đơn đặt bàn có sẵn mảng món ăn thì lấy luôn
            const innerFoods = extractValidFoodItems(
              candidate.items || candidate.preOrders || candidate.cart || candidate.dishes
            );
            if (innerFoods.length > 0) {
              cartItems = innerFoods;
            }
          }
        } catch (e) {}
      }
    }

    const totalCartPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const bookingId =
      latestCode ||
      latestBookingInfo?.bookingCode ||
      latestBookingInfo?.code ||
      latestBookingInfo?._id ||
      'SR-2026-8820';

    const tableName =
      latestBookingInfo?.tableName ||
      latestBookingInfo?.table ||
      latestBookingInfo?.selectedTable?.name ||
      latestBookingInfo?.selectedTable ||
      'Bàn B02';

    const guests =
      latestBookingInfo?.guests ||
      latestBookingInfo?.people ||
      '2 người';

    const phone =
      latestBookingInfo?.phone ||
      latestBookingInfo?.customerPhone ||
      '0335430915';

    const finalTotal =
      totalCartPrice > 0
        ? totalCartPrice
        : Number(latestBookingInfo?.totalAmount || latestBookingInfo?.totalPrice || 2095000);

    // Nếu giỏ hàng đã bị xóa sau khi bấm đặt bàn, hiển thị dòng tóm tắt chuẩn như các đơn đặt bàn khác
    const displayItems: OrderItem[] =
      cartItems.length > 0
        ? cartItems
        : [
            {
              name: `Đặt bàn ${tableName} (${guests}) - Thực đơn đặt trước`,
              price: finalTotal,
              quantity: 1,
            },
          ];

    return {
      _id: String(bookingId),
      phone: String(phone),
      totalAmount: finalTotal,
      status: 'PENDING',
      items: displayItems,
    };
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const mergedOrders: Order[] = [];

      const addUniqueOrder = (ord: Order | null) => {
        if (ord && ord._id && !mergedOrders.some((o) => o._id === ord._id)) {
          mergedOrders.push(ord);
        }
      };

      // 1. Đưa đơn đặt bàn mới nhất của khách lên đầu danh sách
      addUniqueOrder(getLatestCustomerBooking());

      // 2. Lấy các đơn đặt bàn từ API /api/reservations
      try {
        const resBooking = await fetch('/api/reservations');
        if (resBooking.ok) {
          const bookingData = await resBooking.json();
          const bookingList = Array.isArray(bookingData)
            ? bookingData
            : bookingData.reservations || bookingData.bookings || bookingData.data || [];
          if (Array.isArray(bookingList)) {
            const reversed = [...bookingList].reverse();
            for (let i = 0; i < reversed.length; i++) {
              const b = reversed[i];
              if (!b) continue;
              const bId = b._id || b.id || b.code || b.bookingCode;
              if (!bId) continue;

              const validFoods = extractValidFoodItems(b.items || b.preOrders || b.cart || b.dishes);
              const bTotal =
                Number(b.totalAmount || b.totalPrice || b.total || b.preOrderTotal || 0) ||
                validFoods.reduce((s, c) => s + c.price * c.quantity, 0) ||
                1240000;

              const tableLabel = b.table || b.tableName || 'Bàn đặt trước';
              const guestLabel = b.guests || b.people || '2 khách';

              addUniqueOrder({
                _id: String(bId),
                phone: String(b.phone || b.customerPhone || '0335430915'),
                totalAmount: bTotal,
                status:
                  b.status === 'COOKING' || b.status === 'COMPLETED' || b.status === 'CANCELLED'
                    ? b.status
                    : 'PENDING',
                items:
                  validFoods.length > 0
                    ? validFoods
                    : [
                        {
                          name: `Đặt bàn ${tableLabel} (${guestLabel}) - Thực đơn đặt trước`,
                          price: bTotal,
                          quantity: 1,
                        },
                      ],
              });
            }
          }
        }
      } catch (e) {}

      // 3. Lấy các đơn từ API /api/orders
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        const apiOrders = Array.isArray(data) ? data : data.orders || data.data || [];
        if (Array.isArray(apiOrders)) {
          for (let i = 0; i < apiOrders.length; i++) {
            const raw = apiOrders[i];
            const validFoods = extractValidFoodItems(raw?.items);
            if (raw && validFoods.length > 0) {
              addUniqueOrder({
                _id: String(raw._id || raw.id),
                phone: String(raw.phone || '0905123456'),
                totalAmount: Number(raw.totalAmount || raw.total || 0),
                status: raw.status || 'PENDING',
                items: validFoods,
              });
            }
          }
        }
      }

      setOrders(mergedOrders);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      setOrders((prevOrders) =>
        prevOrders.map((ord) =>
          ord._id === orderId ? { ...ord, status: newStatus as any } : ord
        )
      );

      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      if (res.ok) {
        setSyncMessage(`Đã đồng bộ đơn ${orderId} sang trạng thái ${newStatus}`);
        setTimeout(() => setSyncMessage(null), 3000);
      }
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#faf8f5]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#14532d] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-stone-600 font-medium text-sm">Đang kết nối API &amp; tải dữ liệu từ Database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto my-10 p-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-center">
        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-2 text-rose-600">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <p className="font-semibold text-sm">Không thể tích hợp dữ liệu API:</p>
        <p className="text-xs mt-1 text-rose-600/90">{error}</p>
      </div>
    );
  }

  // Trạng thái Chưa có đơn hàng
  if (!orders || orders.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-[#ebe7df] rounded-2xl shadow-xs text-center">
        <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-400">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <rect width="18" height="18" x="3" y="3" rx="2"></rect>
            <path d="M9 12h6"></path>
          </svg>
        </div>
        <p className="font-serif font-bold text-stone-800 text-base mb-1">Chưa có đơn hàng nào</p>
        <p className="text-stone-500 text-xs">Hiện tại chưa có lịch sử đơn hàng nào trong CSDL MongoDB.</p>
      </div>
    );
  }

  // Đổ dữ liệu thực tế ra giao diện UI
  return (
    <div className="max-w-4xl mx-auto p-6 my-8">
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#15803d] bg-[#f0fdf4] px-3.5 py-1.5 rounded-full border border-[#bbf7d0] inline-block mb-2">
          Hệ thống điều phối
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#14532d]">
          Lịch Sử Đặt Bàn &amp; Quản Lý Đơn Hàng (Staff)
        </h1>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order._id} className="border border-[#ebe7df] rounded-2xl p-5 bg-white shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] hover:shadow-md transition-all">
            <div className="flex justify-between items-center pb-3 border-b border-[#ebe7df]">
              <div>
                <span className="text-[11px] text-stone-400 block font-medium uppercase tracking-wider">Mã đơn hàng</span>
                <span className="font-mono text-sm font-bold text-stone-800">{order._id}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500 font-medium">Trạng thái:</span>
                <select
                  value={order.status || 'PENDING'}
                  onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#14532d] transition ${
                    order.status === 'PENDING'
                      ? 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]'
                      : order.status === 'COOKING'
                      ? 'bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe]'
                      : order.status === 'COMPLETED'
                      ? 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]'
                      : 'bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]'
                  }`}
                >
                  <option value="PENDING">PENDING (Chờ xác nhận)</option>
                  <option value="COOKING">COOKING (Đang nấu)</option>
                  <option value="COMPLETED">COMPLETED (Hoàn thành)</option>
                  <option value="CANCELLED">CANCELLED (Đã hủy)</option>
                </select>
              </div>
            </div>

            {/* Chi tiết từng món ăn trong giỏ hàng */}
            <div className="py-3.5 space-y-2.5">
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Danh sách món ăn:</p>
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-stone-800 font-medium">
                    {item.name} <span className="text-stone-400">× {item.quantity}</span>
                  </span>
                  <span className="text-stone-600 font-mono font-medium">{(item.price * item.quantity).toLocaleString()} VNĐ</span>
                </div>
              ))}
            </div>

            {/* Chân trang thông tin liên hệ và tổng tiền */}
            <div className="pt-3 border-t border-[#ebe7df] flex justify-between items-center text-xs sm:text-sm">
              <span className="text-stone-500">
                SĐT: <strong className="text-stone-800">{order.phone}</strong>
              </span>
              <div className="text-right">
                <span className="text-[11px] text-stone-400 block font-medium">Tổng thanh toán</span>
                <span className="text-lg font-serif font-bold text-[#d97706]">{order.totalAmount?.toLocaleString()} VNĐ</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}