import mongoose, { Schema, Document, Model } from 'mongoose';

// ==========================================
// Types & Interface cho Menu Item (TK-163)
// ==========================================
export type MenuCategory = 'Khai vị' | 'Món chính' | 'Đồ uống' | 'Tráng miệng';

export interface IMenuItemModel extends Document {
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: MenuCategory;
  is_available: boolean;
  isAvailable?: boolean;
  isPreOrderOnly?: boolean;
  preparationNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const menuItemSchema = new Schema<IMenuItemModel>(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên món ăn'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Vui lòng nhập giá món ăn'],
      min: [0, 'Giá món ăn không thể nhỏ hơn 0'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Vui lòng chọn danh mục'],
      enum: ['Khai vị', 'Món chính', 'Đồ uống', 'Tráng miệng'],
      trim: true,
    },
    // TK-163: Cờ bật/tắt hết món nhanh
    is_available: {
      type: Boolean,
      default: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isPreOrderOnly: {
      type: Boolean,
      default: false,
    },
    preparationNote: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

// Đồng bộ 2 trường is_available và isAvailable
menuItemSchema.pre('save', function () {
  if (this.is_available !== undefined && this.isAvailable === undefined) {
    this.isAvailable = this.is_available;
  } else if (this.isAvailable !== undefined && this.is_available === undefined) {
    this.is_available = this.isAvailable;
  }
});

const MenuItem: Model<IMenuItemModel> =
  mongoose.models.MenuItem || mongoose.model<IMenuItemModel>('MenuItem', menuItemSchema);

export default MenuItem;
