import { Schema, model, models, Model } from 'mongoose';

export interface ITable {
  _id?: string;
  tableNumber: string;
  table_number?: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
  zone_name?: string;
  qr_token?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const TableSchema = new Schema<ITable>(
  {
    tableNumber: {
      type: String,
      required: [true, 'Vui lòng nhập số bàn'],
      unique: true,
      trim: true,
    },
    table_number: {
      type: String,
      trim: true,
      uppercase: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Vui lòng nhập sức chứa của bàn'],
      min: 1,
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved'],
      default: 'available',
    },
    zone_name: {
      type: String,
      default: 'Khu vực chính',
      trim: true,
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

const Table: Model<ITable> = models.Table || model<ITable>('Table', TableSchema);

export default Table;