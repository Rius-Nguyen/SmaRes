'use client';
import { useState, useEffect } from 'react';

interface OrderItem {
  name: string;
  quantity: number;
}

interface Order {
  _id: string;
  createdAt: string;
  totalPrice: number;
  status: string;
  items: OrderItem[];
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Hàm gọi API lấy danh sách đơn hàng từ Backend
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders'); // Đường dẫn API lấy đơn hàng của khách
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách đơn hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  // Sử dụng useEffect để tự động fetch dữ liệu và polling mỗi 3 giây
  useEffect(() => {
    fetchOrders(); // Gọi lần đầu khi vào trang

    const interval = setInterval(() => {
      fetchOrders(); // Cập nhật ngầm để đồng bộ trạng thái với Staff
    }, 3000);

    return () => clearInterval(interval); // Dọn dẹp interval khi rời trang
  }, []);

  // Hàm hiển thị Badge trạng thái đơn hàng
  const renderStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    
    if (normalizedStatus === 'đang nấu') {
      return (
        <span className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300 flex items-center gap-1.5 w-fit">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
          Đang nấu
        </span>
      );
    } 
    
    if (normalizedStatus === 'hoàn thành') {
      return (
        <span className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-300 flex items-center gap-1.5 w-fit">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Hoàn thành
        </span>
      );
    }

    return (
      <span className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-300 w-fit">
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Theo Dõi Đơn Hàng / Lịch Sử</h1>
      
      {loading ? (
        <p className="text-gray-500">Đang tải danh sách đơn hàng...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">Bạn chưa có đơn hàng nào.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900">Mã đơn: #{order._id}</span>
                  {renderStatusBadge(order.status)}
                </div>
                <p className="text-sm text-gray-500">
                  Thời gian đặt: {new Date(order.createdAt).toLocaleString('vi-VN')}
                </p>
                <div className="text-sm text-gray-700 mt-2">
                  <span className="font-medium">Món ăn: </span>
                  {order.items?.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm text-gray-500 block">Tổng tiền</span>
                <span className="text-lg font-bold text-orange-600">
                  {order.totalPrice?.toLocaleString('vi-VN')} đ
                </span>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}