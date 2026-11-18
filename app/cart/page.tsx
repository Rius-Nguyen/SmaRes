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
            <main className="bg-[#faf8f5] text-[#1c1917] min-h-screen flex items-center justify-center py-16 px-4">
                <div className="bg-white p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_-4px_rgba(28,25,23,0.08)] border border-[#ebe7df] text-center max-w-md w-full">
                    <div className="w-16 h-16 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center mx-auto mb-4 border border-[#fde68a]">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-[#1c1917] mb-2">Quyền truy cập bị hạn chế</h2>
                    <p className="text-stone-500 mb-8 text-sm leading-relaxed">
                        Giỏ hàng chỉ khả dụng khi bạn đã <strong className="text-stone-800">đăng nhập</strong> và có <strong className="text-stone-800">lịch đặt bàn</strong> tại SmaRes.
                    </p>
                    
                    <div className="flex flex-col space-y-3">
                        {!isLoggedIn ? (
                            <Link href="/login" className="bg-[#14532d] hover:bg-[#15803d] text-white px-5 py-3.5 rounded-xl font-semibold transition-all shadow-[0_8px_20px_-4px_rgba(20,83,45,0.4)] text-sm">
                                Đăng nhập ngay
                            </Link>
                        ) : (
                            <Link href="/booking" className="bg-[#14532d] hover:bg-[#15803d] text-white px-5 py-3.5 rounded-xl font-semibold transition-all shadow-[0_8px_20px_-4px_rgba(20,83,45,0.4)] text-sm">
                                Đặt bàn ngay
                            </Link>
                        )}
                        <Link href="/menu" className="text-stone-500 font-medium hover:text-[#14532d] transition-colors pt-2 text-sm inline-flex items-center justify-center gap-1">
                            ← Quay lại thực đơn
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // NẾU THỎA MÃN ĐIỀU KIỆN -> HIỂN THỊ GIỎ HÀNG BÌNH THƯỜNG
    return (
        <main className="bg-[#faf8f5] text-[#1c1917] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#15803d] bg-[#f0fdf4] px-3.5 py-1.5 rounded-full border border-[#bbf7d0] inline-block mb-2">
                        Đơn đặt trước
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1c1917]">Giỏ Hàng Của Bạn</h1>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* CỘT TRÁI */}
                    <div className="lg:w-2/3">
                        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df] p-6 sm:p-8">
                            {cartItems.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3 text-stone-400">
                                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                                            <path d="M3 6h18"></path>
                                            <path d="M16 10a4 4 0 0 1-8 0"></path>
                                        </svg>
                                    </div>
                                    <p className="font-serif font-bold text-lg text-stone-800 mb-1">Giỏ hàng đang trống</p>
                                    <p className="text-xs text-stone-500 mb-4">Bạn chưa chọn món ăn nào cho bữa tiệc của mình.</p>
                                    <Link href="/menu" className="inline-flex items-center gap-1 text-sm font-semibold text-[#14532d] hover:underline">
                                        ← Quay lại khám phá thực đơn
                                    </Link>
                                </div>
                            ) : (
                                <ul className="divide-y divide-[#ebe7df]">
                                    {cartItems.map((item) => (
                                        <li key={item.id} className="py-6 flex items-center gap-4">
                                            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-[#ebe7df] bg-stone-100">
                                                <img src={item.image} alt={item.name} className="h-full w-full object-cover object-center" />
                                            </div>

                                            <div className="flex flex-1 flex-col justify-between h-24">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className="font-serif font-bold text-base sm:text-lg text-stone-900 leading-snug">{item.name}</h3>
                                                    <p className="font-serif font-bold text-[#d97706] text-base sm:text-lg whitespace-nowrap">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</p>
                                                </div>
                                                
                                                <div className="flex items-center justify-between mt-auto">
                                                    <div className="flex items-center border border-[#d6d0c4] rounded-lg overflow-hidden bg-white">
                                                        <button onClick={() => updateQuantity(item.id, -1)} className="px-3 py-1 text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer text-sm font-semibold">-</button>
                                                        <span className="px-3.5 py-1 text-xs font-semibold border-x border-[#d6d0c4] bg-[#faf8f5] text-stone-900">{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.id, 1)} className="px-3 py-1 text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer text-sm font-semibold">+</button>
                                                    </div>

                                                    <button onClick={() => removeItem(item.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors flex items-center gap-1 cursor-pointer">
                                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M3 6h18"></path>
                                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                                        </svg>
                                                        <span>Xóa</span>
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
                        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df] p-6 sm:p-7 sticky top-24">
                            <h2 className="font-serif font-bold text-xl text-stone-900 mb-6">Tóm tắt đơn hàng</h2>
                            
                            <div className="space-y-4 text-xs sm:text-sm text-stone-600 mb-6 border-b border-[#ebe7df] pb-6">
                                <div className="flex justify-between">
                                    <p>Tạm tính</p>
                                    <p className="font-semibold text-stone-900">{subtotal.toLocaleString('vi-VN')}đ</p>
                                </div>
                                <div className="flex justify-between">
                                    <p>Phí phục vụ &amp; giữ bàn</p>
                                    <p className="font-semibold text-stone-900">{shippingFee.toLocaleString('vi-VN')}đ</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-baseline mb-8">
                                <p className="font-serif font-bold text-lg text-stone-900">Tổng cộng</p>
                                <p className="font-serif font-bold text-2xl text-[#d97706]">{total.toLocaleString('vi-VN')}đ</p>
                            </div>

                            <button className="w-full bg-[#14532d] hover:bg-[#15803d] text-white px-6 py-4 rounded-xl font-semibold text-base transition-all shadow-[0_8px_24px_-4px_rgba(20,83,45,0.45)] hover:shadow-[0_12px_28px_-4px_rgba(20,83,45,0.6)] cursor-pointer">
                                Xác nhận thanh toán
                            </button>
                            
                            <div className="mt-4 text-center">
                                <Link href="/menu" className="text-xs sm:text-sm text-stone-500 hover:text-[#14532d] font-semibold transition-colors">
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