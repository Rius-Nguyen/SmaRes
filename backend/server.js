const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();

// Khởi tạo Middleware
app.use(express.json());
app.use(cookieParser()); // Công cụ bắt buộc để đọc được Cookie bảo mật

// Cấu hình CORS để Frontend gọi được API
app.use(cors({
  origin: 'http://127.0.0.1:5000', // Đổi URL này thành URL chạy Frontend của bạn (VD: localhost:3000)
  credentials: true // Bắt buộc phải là true để trình duyệt gửi Cookie Token đi
}));

// Kết nối Database
connectDB();

// Khai báo đường dẫn API
app.use('/api/auth', require('./routes/auth'));

// Mở cổng máy chủ
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Máy chủ Backend đang chạy tại cổng ${PORT}`));