const mongoose = require('mongoose');

// Schema tùy biến cho từng món trong đơn (TK-160)
const OrderItemCustomizationSchema = new mongoose.Schema(
  {
    spicy_level: {
      type: String,
      enum: ['NONE', 'MILD', 'MEDIUM', 'HOT'],
      default: 'NONE',
    },
    ice_level: {
      type: String,
      enum: ['0%', '50%', '100%'],
      required: false,
    },
    sweetness_level: {
      type: String,
      enum: ['0%', '50%', '100%'],
      required: false,
    },
    allergy_notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const OrderItemSchema = new mongoose.Schema(
  {
    foodId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Food', 
      required: true 
    },
    quantity: { 
      type: Number, 
      required: true, 
      min: 1,
      default: 1
    },
    price: {
      type: Number,
      required: false
    },
    customizations: {
      type: OrderItemCustomizationSchema,
      default: () => ({ spicy_level: 'NONE', allergy_notes: '' })
    }
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  tableNumber: {
    type: String,
    required: false
  },
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: false
  },
  items: [OrderItemSchema],
  totalPrice: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Cooking', 'Completed', 'Cancelled'], 
    default: 'Pending' 
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
