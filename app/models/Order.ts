import { Schema, model, models, Model, Types } from 'mongoose';

export const OrderStatus = {
  PENDING: 'PENDING',
  COOKING: 'COOKING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const SpicyLevel = {
  NONE: 'NONE',
  MILD: 'MILD',
  MEDIUM: 'MEDIUM',
  HOT: 'HOT',
} as const;

export type SpicyLevel = (typeof SpicyLevel)[keyof typeof SpicyLevel];

export const DrinkLevel = {
  ZERO: '0%',
  HALF: '50%',
  FULL: '100%',
} as const;

export type DrinkLevel = (typeof DrinkLevel)[keyof typeof DrinkLevel];

export interface IOrderItemCustomization {
  spicyLevel?: SpicyLevel;
  iceLevel?: DrinkLevel;
  sweetnessLevel?: DrinkLevel;
  allergyNotes?: string;
}

export interface IOrderItem {
  menuItemId: Types.ObjectId | string;
  name: string;
  price: number;
  quantity: number;
  customizations?: IOrderItemCustomization;
}

export interface IOrder {
  _id?: string;
  orderCode: string;
  userId?: Types.ObjectId | string | null;
  tableId?: Types.ObjectId | string | null;
  tableNumber: string;
  phone: string;
  items: IOrderItem[];
  totalAmount: number;
  status: OrderStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const OrderItemCustomizationSchema = new Schema<IOrderItemCustomization>(
  {
    spicyLevel: {
      type: String,
      enum: Object.values(SpicyLevel),
      default: SpicyLevel.NONE,
    },
    iceLevel: {
      type: String,
      enum: Object.values(DrinkLevel),
      required: false,
    },
    sweetnessLevel: {
      type: String,
      enum: Object.values(DrinkLevel),
      required: false,
    },
    allergyNotes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const OrderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: [true, 'Vui lòng cung cấp ID món ăn'],
    },
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên món ăn'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Vui lòng nhập đơn giá món ăn'],
      min: [0, 'Giá món ăn không được nhỏ hơn 0'],
    },
    quantity: {
      type: Number,
      required: [true, 'Vui lòng nhập số lượng'],
      min: [1, 'Số lượng tối thiểu là 1'],
      default: 1,
    },
    customizations: {
      type: OrderItemCustomizationSchema,
      default: () => ({ spicyLevel: SpicyLevel.NONE, allergyNotes: '' }),
    },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderCode: {
      type: String,
      required: [true, 'Vui lòng tạo mã đơn hàng'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    tableId: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      default: null,
    },
    tableNumber: {
      type: String,
      uppercase: true,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    items: {
      type: [OrderItemSchema],
      required: [true, 'Đơn hàng phải chứa ít nhất 1 món ăn'],
      validate: {
        validator: (items: IOrderItem[]) => Array.isArray(items) && items.length > 0,
        message: 'Đơn hàng phải chứa ít nhất 1 món ăn',
      },
    },
    totalAmount: {
      type: Number,
      required: [true, 'Vui lòng cung cấp tổng tiền đơn hàng'],
      min: [0, 'Tổng tiền không được nhỏ hơn 0'],
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'orders',
  }
);

const Order: Model<IOrder> = models.Order || model<IOrder>('Order', OrderSchema);

export default Order;
