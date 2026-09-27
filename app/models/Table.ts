import { Schema, model, models, Model } from 'mongoose';

export interface ITable {
  _id?: string;
  tableNumber: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
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
  },
  {
    timestamps: true,
    collection: 'tables',
  }
);

const Table: Model<ITable> = models.Table || model<ITable>('Table', TableSchema);

export default Table;