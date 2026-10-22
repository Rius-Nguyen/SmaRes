"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

// 1. TẠO MẢNG DỮ LIỆU MÓN ĂN (Thay vì viết cứng HTML)
const menuData = [
    // Khai vị
    { id: 1, name: "Gỏi Cuốn Tôm Thịt", price: "85.000đ", desc: "Tôm đất luộc tươi ngọt ngọt cuộn cùng thịt heo rọi mềm thơm, rau thơm Tây Ninh thanh mát và bún tươi dai mềm.", image: "/foods/goi_cuon.jpg", category: "Khai vị" },
    { id: 2, name: "Chả Giò Cua Hoàng Đế", price: "185.000đ", desc: "Bánh tráng phơi sương giòn rụm bọc nhân cua hoàng đế hảo hạng và măng tây thanh ngọt tự nhiên.", image: "/foods/cha_gio.jpg", category: "Khai vị" },
    { id: 3, name: "Nộm Hoa Chuối Tai Heo", price: "95.000đ", desc: "Hoa chuối bào giòn rụm trộn tai heo sần sật bóp chua cay ngọt vị, thêm lạc rang thơm bùi Tây Bắc.", image: "/foods/nom_hoa_chuoi.jpg", category: "Khai vị" },
    // Món chính
    { id: 4, name: "Phở Bò Wagyu Cao Cấp", price: "245.000đ", desc: "Nước dùng truyền thống thanh ngọt từ xương ninh liên tục 24 giờ cùng thịt bò Wagyu A5 mềm mọng hảo hạng.", image: "/foods/pho_bo2.jpg", category: "Món chính" },
    { id: 5, name: "Vịt Quay Sốt Mật Ong Rừng", price: "320.000đ", desc: "Thịt vịt tươi mềm bóng bẩy tẩm ướp mật ong rừng nguyên bản Tây Bắc cùng các loại thảo mộc cung đình.", image: "/foods/vit_quay2.jpg", category: "Món chính" },
    { id: 6, name: "Cá Chẽm Hấp Tàu Xì", price: "290.000đ", desc: "Cá chẽm tươi nguyên con ngọt thịt hấp cùng nước sốt tương tàu xì hảo hạng, gừng tươi và hành hoa thơm dịu.", image: "/foods/ca_chem_hap.jpg", category: "Món chính" },
    // Tráng miệng
    { id: 7, name: "Chè Sen Hạt Long Nhãn", price: "65.000đ", desc: "Hạt sen Huế ninh mềm dẻo lồng ghép tinh tế vào từng trái nhãn lồng Hưng Yên ngọt lịm nước đường phèn.", image: "/foods/che_sen.jpg", category: "Tráng miệng" },
    { id: 8, name: "Bánh Caramen Sốt Cà Phê", price: "55.000đ", desc: "Bánh flan caramen mịn màng béo ngậy vị sữa thơm kết hợp tinh tế cùng sốt cà phê Phin đậm đặc đặc trưng.", image: "/foods/banh.jpg", category: "Tráng miệng" },
    { id: 9, name: "Sữa Chua Nếp Cẩm Sơn La", price: "50.000đ", desc: "Nếp cẩm Sơn La dẻo thơm lên men chuẩn vị ngọt bùi hòa quyện cùng sữa chua nhà làm béo ngậy mát lành.", image: "/foods/sua_chua.jpg", category: "Tráng miệng" },
];

export default function MenuPage() {
    const [activeCategory, setActiveCategory] = useState("Khai vị");
    // State mới: Lưu từ khóa tìm kiếm
    const [searchQuery, setSearchQuery] = useState("");
    
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // 2. LOGIC TÌM KIẾM & LỌC
    const filteredMenu = menuData.filter(item => {
        // Nếu người dùng đang gõ tìm kiếm -> Tìm trên toàn bộ danh sách
        if (searchQuery.trim() !== "") {
            return item.name.toLowerCase().includes(searchQuery.toLowerCase());
        }
        // Nếu ô tìm kiếm trống -> Chỉ hiển thị món của tab đang chọn
        return item.category === activeCategory;
    });

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

            {/* Thanh danh mục & Ô tìm kiếm */}
            <div className="relative flex flex-col md:flex-row items-center justify-center py-6 border-b px-4 max-w-7xl mx-auto min-h-[80px]">
                
                {/* Các nút danh mục (Vẫn nằm giữa) */}
                <div className="flex space-x-4 md:space-x-8 overflow-x-auto">
                    {["Khai vị", "Món chính", "Tráng miệng", "Đồ uống"].map((cat) => (
                        <button 
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-6 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeCategory === cat ? "bg-green-800 text-white" : "text-gray-500 hover:text-green-800 hover:bg-gray-50"}`}
                        >
                            {cat === "Đồ uống" ? "Đồ uống & Rượu" : cat}
                        </button>
                    ))}
                </div>

                {/* Ô Search (Đặt đúng vị trí sao đỏ góc phải) */}
                <div className="md:absolute right-4 mt-4 md:mt-0 w-full md:w-64">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm món ăn..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent transition-all"
                        />
                        {/* Icon kính lúp đơn giản */}
                        <svg className="w-5 h-5 absolute right-3 top-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
            </div>

            {/* Danh sách món ăn được Render tự động */}
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 min-h-[50vh]">
                
                {/* Chỉ hiện bảng chờ đồ uống khi đang ở tab Đồ uống VÀ không gõ tìm kiếm */}
                {activeCategory === "Đồ uống" && searchQuery.trim() === "" ? (
                    <div className="mb-12 text-center py-20 animate-fade-in">
                        <div className="text-6xl mb-4">🍷</div>
                        <h3 className="text-xl font-bold text-gray-700 mb-2">Đang cập nhật đồ uống</h3>
                        <p className="text-gray-500">Danh sách các loại rượu vang và đồ uống đang được bếp trưởng chuẩn bị.</p>
                    </div>
                ) : (
                    <div className="mb-12 animate-fade-in">
                        {/* Đổi tiêu đề động dựa trên việc có đang tìm kiếm hay không */}
                        <h2 className="text-2xl font-bold font-sans text-gray-800 mb-6 border-b pb-2">
                            {searchQuery.trim() !== "" 
                                ? `Kết quả tìm kiếm cho: "${searchQuery}"` 
                                : `${activeCategory} ${activeCategory === "Khai vị" ? "/ Appetizers" : activeCategory === "Món chính" ? "/ Main Courses" : "/ Desserts"}`
                            }
                        </h2>
                        
                        {/* Nếu tìm không thấy món nào thì báo lỗi, nếu thấy thì in ra */}
                        {filteredMenu.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">
                                <p>Không tìm thấy món ăn nào phù hợp với từ khóa "{searchQuery}".</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {filteredMenu.map((item) => (
                                    <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                                        <div className="h-56 bg-gray-200 relative">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="p-6 flex flex-col justify-between min-h-[200px]">
                                            <div>
                                                <div className="flex justify-between items-start mb-3">
                                                    <h3 className="font-bold text-lg text-gray-900 leading-tight">{item.name}</h3>
                                                    <span className="text-green-700 font-bold whitespace-nowrap ml-4">{item.price}</span>
                                                </div>
                                                <p className="text-gray-500 text-sm mb-6 line-clamp-2">{item.desc}</p>
                                            </div>
                                            
                                            {isMounted && isLoggedIn && (
                                                <button className="text-sm font-bold text-gray-900 hover:text-green-700 flex items-center transition-colors mt-auto w-fit">
                                                    Thêm vào giỏ hàng <span className="ml-2 text-lg">→</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}