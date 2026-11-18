'use client';

import React, { useEffect, useState } from 'react';

// Định nghĩa kiểu dữ liệu cho Đơn hàng
interface FoodItem {
  _id: string;
  name: string;
  price: number;
}

interface OrderItem {
  foodId: FoodItem | null;
  quantity: number;
}

interface User {
  _id: string;
  name: string;
  phone: string;
}

interface Order {
  _id: string;
  userId: User | null;
  items: OrderItem[];
  totalPrice: number;
  status: string;
  createdAt: string;
}

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Hàm gọi API lấy danh sách đơn hàng cho Staff
  const fetchStaffOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      let data: any = null;

      // 1. Thử gọi máy chủ Backend Express (cổng 5000)
      try {
        const response = await fetch('http://localhost:5000/api/orders/staff', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Đảm bảo gửi kèm cookie JWT token
        });
        if (response.ok) {
          data = await response.json();
        }
      } catch (backendErr) {
        console.warn('Backend cổng 5000 chưa kích hoạt, tự động chuyển tiếp sang API Next.js /api/orders...', backendErr);
      }

      // 2. Dự phòng: Nếu backend 5000 chưa bật, dùng API nội bộ Next.js /api/orders
      if (!data) {
        const nextApiResponse = await fetch('/api/orders');
        if (nextApiResponse.ok) {
          data = await nextApiResponse.json();
        }
      }

      if (data && (data.success || Array.isArray(data))) {
        const rawOrders = data.data || data.orders || (Array.isArray(data) ? data : []);
        // Chuẩn hóa dữ liệu nếu từ nguồn Next.js memoryOrders
        const normalizedOrders = rawOrders.map((ord: any) => ({
          _id: ord._id || 'ORD' + Math.random().toString().slice(2, 8),
          userId: ord.userId || null,
          items: ord.items?.map((it: any) => ({
            foodId: it.foodId || { _id: 'f1', name: it.name || 'Món ăn', price: it.price || 0 },
            quantity: it.quantity || 1,
          })) || [],
          totalPrice: ord.totalPrice || ord.totalAmount || 0,
          status: ord.status || 'Pending',
          createdAt: ord.createdAt || new Date().toISOString(),
        }));
        setOrders(normalizedOrders);
      } else {
        setError(data?.message || 'Không thể lấy danh sách đơn hàng');
      }
    } catch (err: any) {
      console.error('Lỗi kết nối API:', err);
      setError('Lỗi kết nối đến máy chủ lấy dữ liệu đơn hàng!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffOrders();
  }, []);

  // Hàm định dạng hiển thị tiền VNĐ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Hàm định dạng thời gian đặt bàn
  const formatDateTime = (isoString: string) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + 
           ' ' + date.toLocaleDateString('vi-VN');
  };

  // Hàm trả về màu sắc Badge theo trạng thái đơn
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <span className="bg-[#fffbeb] text-[#92400e] text-xs font-semibold px-3 py-1 rounded-full border border-[#fde68a]">Chờ xử lý</span>;
      case 'Preparing':
        return <span className="bg-[#eff6ff] text-[#1e40af] text-xs font-semibold px-3 py-1 rounded-full border border-[#bfdbfe]">Đang chế biến</span>;
      case 'Confirmed':
        return <span className="bg-[#f0fdf4] text-[#15803d] text-xs font-semibold px-3 py-1 rounded-full border border-[#bbf7d0]">Đã xác nhận</span>;
      default:
        return <span className="bg-stone-100 text-stone-700 text-xs font-semibold px-3 py-1 rounded-full border border-[#ebe7df]">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-[#faf8f5] text-[#1c1917]">
      {/* Tiêu đề trang & Nút tải lại */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#15803d] bg-[#f0fdf4] px-3.5 py-1 rounded-full border border-[#bbf7d0] inline-block mb-1.5">
            Phục vụ &amp; Điều phối
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#14532d]">Quản Lý Đơn Hàng (Staff)</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">Danh sách các đơn hàng chưa hoàn thành, ưu tiên đơn cũ nhất</p>
        </div>
        <button
          onClick={fetchStaffOrders}
          className="min-h-[44px] px-5 py-2.5 bg-[#14532d] hover:bg-[#15803d] text-white rounded-xl shadow-[0_4px_14px_-2px_rgba(20,83,45,0.4)] transition-all text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4 text-emerald-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M21 3v5h-5"></path>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            <path d="M3 21v-5h5"></path>
          </svg>
          <span>Tải lại dữ liệu</span>
        </button>
      </div>

      {/* Báo lỗi nếu có */}
      {error && (
        <div className="mb-4 p-4 text-xs sm:text-sm text-rose-800 bg-rose-50 rounded-2xl border border-rose-200 flex items-center gap-2" role="alert">
          <svg className="w-4 h-4 text-rose-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Trạng thái Loading */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#14532d]"></div>
          <span className="ml-3 text-stone-600 font-medium text-sm">Đang tải danh sách đơn hàng...</span>
        </div>
      ) : (
        /* UI Table Bảng dữ liệu */
        <div className="overflow-x-auto bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df]">
          <table className="w-full text-xs sm:text-sm text-left text-stone-600">
            <thead className="text-[11px] text-stone-500 uppercase tracking-wider bg-[#faf8f5] border-b border-[#ebe7df]">
              <tr>
                <th scope="col" className="px-6 py-4">Mã đơn</th>
                <th scope="col" className="px-6 py-4">Giờ đặt</th>
                <th scope="col" className="px-6 py-4">Danh sách món</th>
                <th scope="col" className="px-6 py-4">Tổng tiền</th>
                <th scope="col" className="px-6 py-4">Trạng thái hiện tại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe7df]">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-stone-500 italic">
                    Hiện tại không có đơn hàng nào cần xử lý.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="bg-white hover:bg-[#faf8f5] transition-colors">
                    {/* Cột 1: Mã đơn */}
                    <td className="px-6 py-4 font-mono font-bold text-[#14532d]">
                      #{order._id.slice(-6).toUpperCase()}
                    </td>

                    {/* Cột 2: Giờ đặt */}
                    <td className="px-6 py-4 whitespace-nowrap text-stone-800">
                      {formatDateTime(order.createdAt)}
                    </td>

                    {/* Cột 3: Danh sách món */}
                    <td className="px-6 py-4">
                      <ul className="list-disc list-inside space-y-1">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="text-stone-800">
                            <span className="font-medium">
                              {item.foodId ? item.foodId.name : 'Món không xác định'}
                            </span>{' '}
                            <span className="text-[#d97706] font-bold">x{item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </td>

                    {/* Cột 4: Tổng tiền */}
                    <td className="px-6 py-4 font-serif font-bold text-[#d97706] whitespace-nowrap text-base">
                      {formatCurrency(order.totalPrice)}
                    </td>

                    {/* Cột 5: Trạng thái hiện tại */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}