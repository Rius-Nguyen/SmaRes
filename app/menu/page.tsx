"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function MenuPage() {
    // Biến lưu trạng thái tab đang được chọn
    const [activeCategory, setActiveCategory] = useState("Khai vị");

    return (
        <main className="flex-1 bg-white">
            {/* Banner phụ */}
            <div className="relative h-[30vh] bg-cover bg-center flex items-center justify-center" style={{ backgroundImage: "url('/foods/hero-bg2.jpg')" }}>
                <div className="absolute inset-0 bg-black/60"></div>
                <div className="relative z-10 text-center text-white px-4">
                    <h1 className="text-4xl font-bold font-sans mb-4">Thực Đơn SmaRes</h1>
                    <p className="text-sm md:text-base text-gray-200 font-light">Sự giao thoa hoàn hảo giữa ẩm thực truyền thống Việt Nam & phong cách hiện đại tinh tế</p>
                </div>
            </div>

            {/* Thanh danh mục */}
            <div className="flex justify-center space-x-4 md:space-x-8 py-6 border-b overflow-x-auto">
                <button 
                    onClick={() => setActiveCategory("Khai vị")}
                    className={`px-6 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeCategory === "Khai vị" ? "bg-green-800 text-white" : "text-gray-500 hover:text-green-800 hover:bg-gray-50"}`}
                >
                    Khai vị
                </button>
                <button 
                    onClick={() => setActiveCategory("Món chính")}
                    className={`px-6 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeCategory === "Món chính" ? "bg-green-800 text-white" : "text-gray-500 hover:text-green-800 hover:bg-gray-50"}`}
                >
                    Món chính
                </button>
                <button 
                    onClick={() => setActiveCategory("Tráng miệng")}
                    className={`px-6 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeCategory === "Tráng miệng" ? "bg-green-800 text-white" : "text-gray-500 hover:text-green-800 hover:bg-gray-50"}`}
                >
                    Tráng miệng
                </button>
                <button 
                    onClick={() => setActiveCategory("Đồ uống")}
                    className={`px-6 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeCategory === "Đồ uống" ? "bg-green-800 text-white" : "text-gray-500 hover:text-green-800 hover:bg-gray-50"}`}
                >
                    Đồ uống & Rượu
                </button>
            </div>

            {/* Danh sách món ăn */}
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 min-h-[50vh]">

                {/* Nhóm Khai Vị */}
                {activeCategory === "Khai vị" && (
                    <div className="mb-12 animate-fade-in">
                        <h2 className="text-2xl font-bold font-sans text-gray-800 mb-6 border-b pb-2">Món Khai Vị / Appetizers</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                            {/* Card Món ăn 1 */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                                <div className="h-56 bg-gray-200 relative">
                                    <img src="/foods/goi_cuon.jpg" alt="Gỏi Cuốn" className="w-full h-full object-cover" />
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-gray-900 leading-tight">Gỏi Cuốn Tôm Thịt</h3>
                                        <span className="text-green-700 font-bold whitespace-nowrap ml-4">85.000đ</span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-6 line-clamp-2">Tôm đất luộc tươi ngọt ngọt cuộn cùng thịt heo rọi mềm thơm, rau thơm Tây Ninh thanh mát và bún tươi dai mềm.</p>
                                    <button className="text-sm font-bold text-gray-900 hover:text-green-700 flex items-center transition-colors">
                                        Thêm vào giỏ hàng <span className="ml-2 text-lg">→</span>
                                    </button>
                                </div>
                            </div>

                            {/* Card Món ăn 2 */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                                <div className="h-56 bg-gray-200 relative">
                                    <img src="/foods/cha_gio.jpg" alt="Chả Giò" className="w-full h-full object-cover" />
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-gray-900 leading-tight">Chả Giò Cua Hoàng Đế</h3>
                                        <span className="text-green-700 font-bold whitespace-nowrap ml-4">185.000đ</span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-6 line-clamp-2">Bánh tráng phơi sương giòn rụm bọc nhân cua hoàng đế hảo hạng và măng tây thanh ngọt tự nhiên.</p>
                                    <button className="text-sm font-bold text-gray-900 hover:text-green-700 flex items-center transition-colors">
                                        Thêm vào giỏ hàng <span className="ml-2 text-lg">→</span>
                                    </button>
                                </div>
                            </div>

                            {/* Card Món ăn 3 */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                                <div className="h-56 bg-gray-200 relative">
                                    <img src="/foods/nom_hoa_chuoi.jpg" alt="Nộm Hoa Chuối Tai Heo" className="w-full h-full object-cover" />
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-gray-900 leading-tight">Nộm Hoa Chuối Tai Heo</h3>
                                        <span className="text-green-700 font-bold whitespace-nowrap ml-4">95.000đ</span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-6 line-clamp-2">Hoa chuối bào giòn rụm trộn tai heo sần sật bóp chua cay ngọt vị, thêm lạc rang thơm bùi Tây Bắc.</p>
                                    <button className="text-sm font-bold text-gray-900 hover:text-green-700 flex items-center transition-colors">
                                        Thêm vào giỏ hàng <span className="ml-2 text-lg">→</span>
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* Nhóm Món Chính */}
                {activeCategory === "Món chính" && (
                    <div className="mb-12 animate-fade-in">
                        <h2 className="text-2xl font-bold font-sans text-gray-800 mb-6 border-b pb-2">Món Chính / Main Courses</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Card Phở Bò */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                                <div className="h-56 bg-gray-200"><img src="/foods/pho_bo2.jpg" alt="Phở Bò" className="w-full h-full object-cover" /></div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-gray-900 leading-tight">Phở Bò Wagyu Cao Cấp</h3>
                                        <span className="text-green-700 font-bold whitespace-nowrap ml-4">245.000đ</span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-6">Nước dùng truyền thống thanh ngọt từ xương ninh liên tục 24 giờ cùng thịt bò Wagyu A5 mềm mọng hảo hạng.</p>
                                    <button className="text-sm font-bold text-gray-900 hover:text-green-700 flex items-center">Thêm vào giỏ hàng <span className="ml-2">→</span></button>
                                </div>
                            </div>

                            {/* Card Vịt Quay */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                                <div className="h-56 bg-gray-200"><img src="/foods/vit_quay2.jpg" alt="Vịt Quay" className="w-full h-full object-cover" /></div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-gray-900 leading-tight">Vịt Quay Sốt Mật Ong Rừng</h3>
                                        <span className="text-green-700 font-bold whitespace-nowrap ml-4">320.000đ</span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-6">Thịt vịt tươi mềm bóng bẩy tẩm ướp mật ong rừng nguyên bản Tây Bắc cùng các loại thảo mộc cung đình.</p>
                                    <button className="text-sm font-bold text-gray-900 hover:text-green-700 flex items-center">Thêm vào giỏ hàng <span className="ml-2">→</span></button>
                                </div>
                            </div>

                            {/* Card Cá Chẽm */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                                <div className="h-56 bg-gray-200"><img src="/foods/ca_chem_hap.jpg" alt="Cá Chẽm" className="w-full h-full object-cover" /></div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-gray-900 leading-tight">Cá Chẽm Hấp Tàu Xì</h3>
                                        <span className="text-green-700 font-bold whitespace-nowrap ml-4">290.000đ</span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-6">Cá chẽm tươi nguyên con ngọt thịt hấp cùng nước sốt tương tàu xì hảo hạng, gừng tươi và hành hoa thơm dịu.</p>
                                    <button className="text-sm font-bold text-gray-900 hover:text-green-700 flex items-center">Thêm vào giỏ hàng <span className="ml-2">→</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Nhóm Tráng Miệng */}
                {activeCategory === "Tráng miệng" && (
                    <div className="mb-12 animate-fade-in">
                        <h2 className="text-2xl font-bold font-sans text-gray-800 mb-6 border-b pb-2">Món Tráng Miệng / Desserts</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Chè Sen */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                                <div className="h-56 bg-gray-200"><img src="/foods/che_sen.jpg" alt="Chè Sen" className="w-full h-full object-cover" /></div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-gray-900 leading-tight">Chè Sen Hạt Long Nhãn</h3>
                                        <span className="text-green-700 font-bold whitespace-nowrap ml-4">65.000đ</span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-6">Hạt sen Huế ninh mềm dẻo lồng ghép tinh tế vào từng trái nhãn lồng Hưng Yên ngọt lịm nước đường phèn.</p>
                                    <button className="text-sm font-bold text-gray-900 hover:text-green-700 flex items-center mt-4">Thêm vào giỏ hàng <span className="ml-2">→</span></button>
                                </div>
                            </div>

                            {/* Bánh Flan / Caramen */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                                <div className="h-56 bg-gray-200"><img src="/foods/banh.jpg" alt="Bánh Caramen" className="w-full h-full object-cover" /></div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-gray-900 leading-tight">Bánh Caramen Sốt Cà Phê</h3>
                                        <span className="text-green-700 font-bold whitespace-nowrap ml-4">55.000đ</span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-6">Bánh flan caramen mịn màng béo ngậy vị sữa thơm kết hợp tinh tế cùng sốt cà phê Phin đậm đặc đặc trưng.</p>
                                    <button className="text-sm font-bold text-gray-900 hover:text-green-700 flex items-center mt-4">Thêm vào giỏ hàng <span className="ml-2">→</span></button>
                                </div>
                            </div>

                            {/* Sữa Chua */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                                <div className="h-56 bg-gray-200"><img src="/foods/sua_chua.jpg" alt="Sữa Chua" className="w-full h-full object-cover" /></div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-gray-900 leading-tight">Sữa Chua Nếp Cẩm Sơn La</h3>
                                        <span className="text-green-700 font-bold whitespace-nowrap ml-4">50.000đ</span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-6">Nếp cẩm Sơn La dẻo thơm lên men men chuẩn vị ngọt bùi hòa quyện cùng sữa chua nhà làm béo ngậy mát lành.</p>
                                    <button className="text-sm font-bold text-gray-900 hover:text-green-700 flex items-center mt-4">Thêm vào giỏ hàng <span className="ml-2">→</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Nhóm Đồ Uống */}
                {activeCategory === "Đồ uống" && (
                    <div className="mb-12 text-center py-20 animate-fade-in">
                        <div className="text-6xl mb-4">🍷</div>
                        <h3 className="text-xl font-bold text-gray-700 mb-2">Đang cập nhật đồ uống</h3>
                        <p className="text-gray-500">Danh sách các loại rượu vang và đồ uống đang được bếp trưởng chuẩn bị.</p>
                    </div>
                )}

            </div>
        </main >
    );
}