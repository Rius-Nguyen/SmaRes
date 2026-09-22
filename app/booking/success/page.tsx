import Link from 'next/link';

export default function BookingSuccessPage() {
    return (
        <main className="flex-1 flex items-center justify-center bg-gray-100 py-16 px-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center border border-gray-100">

                {/* Icon Dấu tích xanh */}
                <div className="w-16 h-16 bg-green-700 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>

                <h1 className="text-3xl font-bold font-sans text-green-800 mb-2">Đặt bàn thành công!</h1>
                <p className="text-gray-500 mb-8">Cảm ơn bạn đã đặt bàn tại SmaRes</p>

                {/* Khối thông tin chi tiết & QR Code */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-left mb-8 flex justify-between items-center">
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">MÃ ĐẶT CHỖ</p>
                        <p className="text-xl font-bold text-gray-900 mb-3 tracking-wider">SR-2024-0847</p>

                        <ul className="text-sm space-y-1.5 text-gray-600">
                            <li><span className="font-semibold text-gray-800">Vị trí:</span> Bàn B05 - 4 người</li>
                            <li><span className="font-semibold text-gray-800">Thời gian:</span> 19:00, 25/10/2024</li>
                            <li><span className="font-semibold text-gray-800">Nhà hàng:</span> SmaRes - Quận 1, TP.HCM</li>
                        </ul>
                    </div>

                    {/* QR Code*/}
                    <div className="hidden sm:flex flex-col items-center justify-center w-24 h-24 bg-white border border-gray-200 p-1 rounded-lg">
                        <img src="/foods/QR.jpg" alt="Mã QR Đặt bàn" className="w-full h-full object-contain" />
                    </div>
                </div>

                {/* Các nút hành động */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <button className="py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                        Tải mã QR
                    </button>
                    <button className="py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                        Chia sẻ
                    </button>
                </div>

                <Link href="/history" className="block w-full bg-green-800 text-white font-bold py-3.5 rounded-lg hover:bg-green-900 transition-colors shadow-md mt-2">
                    Xem lịch đặt bàn
                </Link>

            </div>
        </main>
    );
}