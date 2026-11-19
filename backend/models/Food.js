const mongoose = require('mongoose');

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
      default: ''
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    embedding: {
      type: [Number],
      default: []
    }
  },
  {
    collection: 'menu_items',
    timestamps: true
  }
);

module.exports =
  (mongoose.models && mongoose.models.Food) ||
  mongoose.model('Food', FoodSchema);