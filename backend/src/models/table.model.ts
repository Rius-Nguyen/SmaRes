import mongoose, { Schema, Document, Model } from 'mongoose';

// ==========================================
// 1. Enums & Interface cho Bàn ăn (TK-142)
// ==========================================
export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SEATED = 'SEATED',
  CLEANING = 'CLEANING',
}

export interface ITable extends Document {
  table_number: string;
  tableNumber?: string;
  capacity: number;
  zone_name: string;
  status: TableStatus;
  qr_token?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// 2. Mongoose Schema
// ==========================================
export const tableSchema = new Schema<ITable>(
  {
    table_number: {
      type: String,
      required: [true, 'Vui lòng cung cấp số bàn'],
      trim: true,
      uppercase: true,
      index: true,
    },
    tableNumber: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Vui lòng nhập sức chứa'],
      min: [1, 'Sức chứa tối thiểu 1 người'],
      default: 4,
    },
    zone_name: {
      type: String,
      default: 'Khu vực chính',
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(TableStatus),
      default: TableStatus.AVAILABLE,
      index: true,
    },
    qr_token: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'tables',
  }
);

// Đồng bộ tự động tableNumber và table_number trước khi lưu
tableSchema.pre('save', function () {
  if (this.table_number && !this.tableNumber) {
    this.tableNumber = this.table_number;
  } else if (this.tableNumber && !this.table_number) {
    this.table_number = this.tableNumber;
  }
});

const Table: Model<ITable> =
  (mongoose.models && mongoose.models.Table) ||
  mongoose.model<ITable>('Table', tableSchema);

export default Table;
