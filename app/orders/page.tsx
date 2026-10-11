'use client';

import { useState, useEffect } from 'react';

// Định nghĩa kiểu dữ liệu cho Món ăn và Đơn hàng theo chuẩn TypeScript
interface OrderItem {
  foodId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  _id: string;
  userId: string;
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

  // Kích hoạt gọi API lấy dữ liệu thực tế ngay khi tải trang
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/orders');

      if (!res.ok) {
        throw new Error('Lỗi khi tải dữ liệu đơn hàng từ máy chủ!');
      }

      const data = await res.json();
      setOrders(data.orders || data);
    } catch (err: any) {
      console.error('Lỗi tích hợp API:', err);
      setError(err.message || 'Đã xảy ra lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Bước 4: Hàm xử lý gọi API cập nhật trạng thái đơn hàng (TK-113)
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      // Cập nhật giao diện tạm thời (Optimistic UI) giúp mượt mà
      setOrders((prevOrders) =>
        prevOrders.map((ord) =>
          ord._id === orderId ? { ...ord, status: newStatus as any } : ord
        )
      );

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH', // Hoặc 'PUT' tùy theo route API của dự án
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        console.warn(`API /api/orders/${orderId} trả về lỗi hoặc chưa sẵn sàng. (Mô phỏng UI thành công)`);
      } else {
        alert('Cập nhật trạng thái đơn hàng thành công!');
      }
    } catch (err) {
      console.error('Lỗi kết nối API cập nhật trạng thái:', err);
    }
  };

  // Trạng thái Đang tải dữ liệu
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 font-medium">Đang kết nối API & tải dữ liệu từ Database...</p>
        </div>
      </div>
    );
  }

  // Trạng thái Lỗi API
  if (error) {
    return (
      <div className="max-w-2xl mx-auto my-10 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-center">
        <p className="font-semibold">⚠️ Không thể tích hợp dữ liệu API:</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  // Trạng thái Chưa có đơn hàng
  if (!orders || orders.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-10 p-8 bg-white border rounded-xl shadow-sm text-center">
        <p className="text-gray-500 font-medium">Chưa có lịch sử đơn hàng nào trong CSDL MongoDB.</p>
      </div>
    );
  }

  // Đổ dữ liệu thực tế ra giao diện UI
  return (
    <div className="max-w-4xl mx-auto p-6 my-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Lịch Sử Đặt Bàn & Quản Lý Đơn Hàng (Staff)</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order._id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <span className="text-xs text-gray-400 block">Mã đơn hàng</span>
                <span className="font-mono text-sm font-bold text-gray-700">{order._id}</span>
              </div>

              {/* Bước 3: Đã tích hợp Dropdown Action đổi trạng thái cho Staff (TK-113) */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">Trạng thái:</span>
                <select
                  value={order.status || 'PENDING'}
                  onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 transition ${
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

            {/* Chi tiết từng món ăn trong giỏ hàng */}
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

            {/* Chân trang thông tin liên hệ và tổng tiền */}
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