require('dotenv').config(); // 1. Đọc chuỗi URI từ file .env
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// 2. Lấy chuỗi kết nối
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
    console.error('❌ Chưa cấu hình MONGODB_URI trong file .env!');
    process.exit(1);
}

// 3. Thực hiện kết nối
mongoose.connect(mongoURI)
    .then(() => {
        console.log('✅ Kết nối MongoDB Atlas thành công!');
    })
    .catch((err) => {
        console.error('❌ Lỗi kết nối MongoDB:', err.message);
    });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});