import mongoose, { Schema, Document, Model } from 'mongoose';

// ==========================================
// 1. Types & Enums cho Tùy biến món (TK-160)
// ==========================================
export type SpicyLevel = 'NONE' | 'MILD' | 'MEDIUM' | 'HOT';
export type IceLevel = '0%' | '50%' | '100%';
export type SweetnessLevel = '0%' | '50%' | '100%';
export type OrderStatus = 'Pending' | 'Cooking' | 'Completed' | 'Cancelled';

export interface IOrderItemCustomization {
  spicy_level: SpicyLevel;
  ice_level?: IceLevel;
  sweetness_level?: SweetnessLevel;
  allergy_notes?: string;
}

export interface IOrderItem {
  foodId: mongoose.Types.ObjectId;
  quantity: number;
  price?: number;
  customizations?: IOrderItemCustomization;
}

export interface IOrder extends Document {
  userId?: mongoose.Types.ObjectId;
  tableNumber?: string;
  tableId?: mongoose.Types.ObjectId;
  items: IOrderItem[];
  totalPrice: number;
  status: OrderStatus;
  notes?: string;
  createdAt: Date;
}

// ==========================================
// 2. Mongoose Schemas
// ==========================================
export const orderItemCustomizationSchema = new Schema<IOrderItemCustomization>(
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

export const orderItemSchema = new Schema<IOrderItem>(
  {
    foodId: {
      type: Schema.Types.ObjectId,
      ref: 'Food',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Số lượng tối thiểu là 1'],
      default: 1,
    },
    price: {
      type: Number,
      required: false,
    },
    customizations: {
      type: orderItemCustomizationSchema,
      default: () => ({ spicy_level: 'NONE', allergy_notes: '' }),
    },
  },
  { _id: false }
);

export const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    tableNumber: {
      type: String,
      required: false,
      trim: true,
    },
    tableId: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      required: false,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v: IOrderItem[]) => Array.isArray(v) && v.length > 0,
        message: 'Đơn hàng phải chứa ít nhất 1 món ăn',
      },
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Pending', 'Cooking', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema);

export default Order;
