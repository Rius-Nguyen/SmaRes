"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Dữ liệu giả lập
const initialCart = [
    { id: 4, name: "Phở Bò Wagyu Cao Cấp", price: 245000, quantity: 2, image: "/foods/pho_bo2.jpg" },
    { id: 1, name: "Gỏi Cuốn Tôm Thịt", price: 85000, quantity: 1, image: "/foods/goi_cuon.jpg" },
];

export default function CartPage() {
    const [cartItems, setCartItems] = useState(initialCart);
    const [isMounted, setIsMounted] = useState(false);

    // MÔ PHỎNG ĐIỀU KIỆN NGHIỆP VỤ (Đổi thành true để test giao diện giỏ hàng)
    const [isLoggedIn, setIsLoggedIn] = useState(false); 
    const [hasBookedTable, setHasBookedTable] = useState(false); 

    useEffect(() => {
        setIsMounted(true);
        // Sau này code check Session/Token và trạng thái đặt bàn sẽ nằm ở đây
    }, []);

    // Tính tiền
    const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const shippingFee = 15000;
    const total = subtotal + shippingFee;

    const updateQuantity = (id: number, delta: number) => {
        setCartItems(cartItems.map(item => {
            if (item.id === id) return { ...item, quantity: Math.max(1, item.quantity + delta) };
            return item;
        }));
    };

    const removeItem = (id: number) => {
        setCartItems(cartItems.filter(item => item.id !== id));
    };

    if (!isMounted) return null;

    // KIỂM TRA ĐIỀU KIỆN: Nếu chưa đăng nhập hoặc chưa đặt bàn -> Chặn truy cập
    if (!isLoggedIn || !hasBookedTable) {
        return (
            <main className="bg-gray-50 min-h-screen flex items-center justify-center py-12 px-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full">
                    <div className="text-red-500 text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold font-sans text-gray-900 mb-2">Quyền truy cập bị hạn chế</h2>
                    <p className="text-gray-500 mb-8 text-sm">
                        Giỏ hàng chỉ khả dụng khi bạn đã <strong className="text-gray-700">đăng nhập</strong> và có <strong className="text-gray-700">lịch đặt bàn</strong> tại SmaRes.
                    </p>
                    
                    <div className="flex flex-col space-y-3">
                        {!isLoggedIn ? (
                            <Link href="/login" className="bg-green-800 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors">
                                Đăng nhập ngay
                            </Link>
                        ) : (
                            <Link href="/booking" className="bg-green-800 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors">
                                Đặt bàn ngay
                            </Link>
                        )}
                        <Link href="/menu" className="text-gray-500 font-medium hover:text-green-700 transition-colors pt-2">
                            ← Quay lại thực đơn
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // NẾU THỎA MÃN ĐIỀU KIỆN -> HIỂN THỊ GIỎ HÀNG BÌNH THƯỜNG
    return (
        <main className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold font-sans text-gray-900 mb-8">Giỏ hàng của bạn</h1>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* CỘT TRÁI */}
                    <div className="lg:w-2/3">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            {cartItems.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 mb-4">Giỏ hàng đang trống.</p>
                                    <Link href="/menu" className="text-green-700 font-bold hover:underline">← Quay lại thực đơn</Link>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-200">
                                    {cartItems.map((item) => (
                                        <li key={item.id} className="py-6 flex items-center">
                                            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                                                <img src={item.image} alt={item.name} className="h-full w-full object-cover object-center" />
                                            </div>

                                            <div className="ml-4 flex flex-1 flex-col justify-between h-24">
                                                <div className="flex justify-between">
                                                    <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                                                    <p className="font-bold text-green-700 text-lg">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</p>
                                                </div>
                                                
                                                <div className="flex items-center justify-between mt-auto">
                                                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                                        <button onClick={() => updateQuantity(item.id, -1)} className="px-3 py-1 text-gray-600 hover:bg-gray-100">-</button>
                                                        <span className="px-4 py-1 font-semibold border-x border-gray-300 bg-gray-50">{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.id, 1)} className="px-3 py-1 text-gray-600 hover:bg-gray-100">+</button>
                                                    </div>

                                                    <button onClick={() => removeItem(item.id)} className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors">
                                                        Xóa
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* CỘT PHẢI */}
                    <div className="lg:w-1/3">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
                            <h2 className="text-lg font-bold text-gray-900 mb-6">Tóm tắt đơn hàng</h2>
                            
                            <div className="space-y-4 text-sm text-gray-600 mb-6 border-b border-gray-200 pb-6">
                                <div className="flex justify-between">
                                    <p>Tạm tính</p>
                                    <p className="font-medium text-gray-900">{subtotal.toLocaleString('vi-VN')}đ</p>
                                </div>
                                <div className="flex justify-between">
                                    <p>Phí giao hàng</p>
                                    <p className="font-medium text-gray-900">{shippingFee.toLocaleString('vi-VN')}đ</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-8">
                                <p className="text-lg font-bold text-gray-900">Tổng cộng</p>
                                <p className="text-2xl font-bold text-green-700">{total.toLocaleString('vi-VN')}đ</p>
                            </div>

                            <button className="w-full bg-green-800 text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-colors shadow-md">
                                Xác nhận thanh toán
                            </button>
                            
                            <div className="mt-4 text-center">
                                <Link href="/menu" className="text-sm text-gray-500 hover:text-green-700 font-medium transition-colors">
                                    ← Tiếp tục chọn món
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}