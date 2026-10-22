const mongoose = require('mongoose');

// Định nghĩa Schema chi tiết cho Món ăn (Food)
const FoodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên món ăn là bắt buộc'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Giá món ăn là bắt buộc'],
      min: [0, 'Giá tiền không thể là số âm']
    },
    description: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      required: [true, 'Danh mục món ăn là bắt buộc'],
      trim: true
    },
    image: {
      type: String,
      default: '' // Link hình ảnh món ăn nếu có
    },
    isAvailable: {
      type: Boolean,
      default: true // Trạng thái còn món hay hết món
    }
  },
  {
    timestamps: true // Tự động tạo trường createdAt và updatedAt
  }
);

// Xuất khẩu Model Food theo chuẩn CommonJS để khớp 100% với dự án
module.exports = mongoose.model('Food', FoodSchema);