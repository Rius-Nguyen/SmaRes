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
      
      const response = await fetch('http://localhost:5000/api/orders/staff', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Đảm bảo gửi kèm cookie JWT token
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOrders(data.data || []);
      } else {
        setError(data.message || 'Không thể lấy danh sách đơn hàng');
      }
    } catch (err) {
      console.error('Lỗi kết nối API:', err);
      setError('Lỗi kết nối đến máy chủ Backend!');
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
        return <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-yellow-300">Chờ xử lý</span>;
      case 'Preparing':
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-blue-300">Đang chế biến</span>;
      case 'Confirmed':
        return <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-indigo-300">Đã xác nhận</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-gray-300">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Tiêu đề trang & Nút tải lại */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản Lý Đơn Hàng (Staff)</h1>
          <p className="text-sm text-gray-500">Danh sách các đơn hàng chưa hoàn thành, ưu tiên đơn cũ nhất</p>
        </div>
        <button
          onClick={fetchStaffOrders}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-200 text-sm font-medium"
        >
          🔄 Tải lại dữ liệu
        </button>
      </div>

      {/* Báo lỗi nếu có */}
      {error && (
        <div className="mb-4 p-4 text-sm text-red-800 bg-red-100 rounded-lg border border-red-200" role="alert">
          {error}
        </div>
      )}

      {/* Trạng thái Loading */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 font-medium">Đang tải danh sách đơn hàng...</span>
        </div>
      ) : (
        /* UI Table Bảng dữ liệu */
        <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
              <tr>
                <th scope="col" className="px-6 py-4">Mã đơn</th>
                <th scope="col" className="px-6 py-4">Giờ đặt</th>
                <th scope="col" className="px-6 py-4">Danh sách món</th>
                <th scope="col" className="px-6 py-4">Tổng tiền</th>
                <th scope="col" className="px-6 py-4">Trạng thái hiện tại</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500 italic">
                    Hiện tại không có đơn hàng nào cần xử lý.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="bg-white border-b hover:bg-gray-50 transition">
                    {/* Cột 1: Mã đơn */}
                    <td className="px-6 py-4 font-mono font-medium text-gray-900">
                      #{order._id.slice(-6).toUpperCase()}
                    </td>

                    {/* Cột 2: Giờ đặt */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDateTime(order.createdAt)}
                    </td>

                    {/* Cột 3: Danh sách món */}
                    <td className="px-6 py-4">
                      <ul className="list-disc list-inside space-y-1">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="text-gray-800">
                            <span className="font-medium">
                              {item.foodId ? item.foodId.name : 'Món không xác định'}
                            </span>{' '}
                            <span className="text-blue-600 font-bold">x{item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </td>

                    {/* Cột 4: Tổng tiền */}
                    <td className="px-6 py-4 font-bold text-green-600 whitespace-nowrap">
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