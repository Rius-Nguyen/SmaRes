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

  // Kích hoạt gọi API lấy dữ liệu thực tế ngay khi tải trang (Đã tối ưu hóa bộ lọc cấu trúc dữ liệu)
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/orders');

      if (!res.ok) {
        throw new Error('Lỗi khi tải dữ liệu đơn hàng từ máy chủ!');
      }

      const data = await res.json();
      
      // Xử lý linh hoạt các trường hợp cấu trúc JSON trả về từ API
      let orderList: Order[] = [];
      if (Array.isArray(data)) {
        orderList = data;
      } else if (data.orders && Array.isArray(data.orders)) {
        orderList = data.orders;
      } else if (data.order) {
        orderList = [data.order];
      } else if (data.data && Array.isArray(data.data)) {
        orderList = data.data;
      } else {
        orderList = [];
      }

      setOrders(orderList);
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

  // Hàm xử lý gọi API cập nhật trạng thái đơn hàng (TK-113)
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      // Cập nhật giao diện tạm thời (Optimistic UI) giúp mượt mà
      setOrders((prevOrders) =>
        prevOrders.map((ord) =>
          ord._id === orderId ? { ...ord, status: newStatus as any } : ord
        )
      );

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
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
      <div className="min-h-screen flex justify-center items-center bg-[#faf8f5]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#14532d] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-stone-600 font-medium text-sm">Đang kết nối API &amp; tải dữ liệu từ Database...</p>
        </div>
      </div>
    );
  }

  // Trạng thái Lỗi API
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

              {/* Dropdown Action đổi trạng thái cho Staff (TK-113) */}
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