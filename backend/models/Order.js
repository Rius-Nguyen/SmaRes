const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  // THÊM DÒNG NÀY: Để liên kết Đơn hàng với Bàn (Bước 2 trong workflow)
  tableId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Table', 
    required: false 
  },
  items: [
    {
      foodId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Food',
        required: true 
      },
      quantity: { 
        type: Number, 
        required: true, 
        min: 1 
      }
    }
  ],
  totalPrice: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Cooking', 'Completed'], 
    default: 'Pending' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Order', OrderSchema);