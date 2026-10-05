import { Schema, model, models, Model } from 'mongoose';

export interface IMenuItem {
  _id?: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: 'Món chính' | 'Đồ uống' | 'Tráng miệng';
  isAvailable: boolean;
  isPreOrderOnly?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên món ăn'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Vui lòng nhập giá món ăn'],
      min: [0, 'Giá món ăn không được nhỏ hơn 0'],
    },
    description: {
      type: String,
      required: [true, 'Vui lòng nhập mô tả món ăn'],
      trim: true,
    },
    imageUrl: {
      type: String,
      required: [true, 'Vui lòng cung cấp link hình ảnh món ăn'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Vui lòng chọn danh mục món ăn'],
      enum: {
        values: ['Món chính', 'Đồ uống', 'Tráng miệng'],
        message: '{VALUE} không phải là danh mục hợp lệ (Món chính, Đồ uống, Tráng miệng)',
      },
      trim: true,
    },
    isAvailable: {
      type: Boolean,
      required: [true, 'Vui lòng thiết lập trạng thái món ăn'],
      default: true,
    },
    isPreOrderOnly: {
      type: Boolean,
      default: false, // Mặc định false (món phổ thông), true nếu là món hiếm bắt buộc đặt trước
    },
  },
  {
    timestamps: true,
    collection: 'menu_items',
  }
);

const MenuItem: Model<IMenuItem> =
  models.MenuItem || model<IMenuItem>('MenuItem', MenuItemSchema);

export default MenuItem;
