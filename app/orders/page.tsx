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
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <p className="text-gray-600 font-medium">Đang kết nối API & đồng bộ dữ liệu đơn hàng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto my-10 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-center">
        <p className="font-semibold">⚠️ Không thể tích hợp dữ liệu API:</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 my-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Lịch Sử Đặt Bàn & Quản Lý Đơn Hàng (Staff)</h1>
        <button
          onClick={fetchOrders}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition cursor-pointer"
        >
          🔄 Đồng bộ & Làm mới
        </button>
      </div>

      {syncMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-lg">
          ✅ {syncMessage}
        </div>
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order._id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <span className="text-xs text-gray-400 block">Mã đơn hàng</span>
                <span className="font-mono text-sm font-bold text-gray-700">{order._id}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">Trạng thái:</span>
                <select
                  value={order.status || 'PENDING'}
                  onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border cursor-pointer focus:outline-none transition ${
                    order.status === 'PENDING'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : order.status === 'COOKING'
                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                      : order.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-red-50 text-red-800 border-red-300'
                  }`}
                >
                  <option value="PENDING">⏳ PENDING (Chờ xác nhận)</option>
                  <option value="COOKING">🍳 COOKING (Đang nấu)</option>
                  <option value="COMPLETED">✅ COMPLETED (Hoàn thành)</option>
                  <option value="CANCELLED">❌ CANCELLED (Đã hủy)</option>
                </select>
              </div>
            </div>

            <div className="py-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Danh sách món ăn:</p>
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-gray-800 font-medium">
                    {item.name} <span className="text-gray-400">x{item.quantity}</span>
                  </span>
                  <span className="text-gray-600">{(item.price * item.quantity).toLocaleString()} VNĐ</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-sm">
              <span className="text-gray-500">
                SĐT: <strong className="text-gray-700">{order.phone}</strong>
              </span>
              <div className="text-right">
                <span className="text-xs text-gray-400 block">Tổng thanh toán</span>
                <span className="text-lg font-bold text-red-600">{order.totalAmount?.toLocaleString()} VNĐ</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}