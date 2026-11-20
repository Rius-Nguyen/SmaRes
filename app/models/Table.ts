import { Schema, model, models, Model } from 'mongoose';

export const TableStatus = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  SEATED: 'SEATED',
  CLEANING: 'CLEANING',
} as const;

export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

export const TableCleaningType = {
  EARLY_BONUS: 'EARLY_BONUS',
  URGENT_15M: 'URGENT_15M',
  RELAXED_30M: 'RELAXED_30M',
} as const;

export type TableCleaningType =
  (typeof TableCleaningType)[keyof typeof TableCleaningType];

export interface ITable {
  _id?: string;
  tableNumber: string;
  capacity: number;
  zoneName: string;
  status: TableStatus;
  qrToken?: string | null;
  cleaningStartedAt?: Date | null;
  cleaningDeadlineAt?: Date | null;
  cleaningType?: TableCleaningType | null;
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
      uppercase: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Vui lòng nhập sức chứa của bàn'],
      min: [1, 'Sức chứa tối thiểu 1 người'],
      default: 4,
    },
    zoneName: {
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
    qrToken: {
      type: String,
      trim: true,
      default: null,
    },
    cleaningStartedAt: {
      type: Date,
      default: null,
    },
    cleaningDeadlineAt: {
      type: Date,
      default: null,
    },
    cleaningType: {
      type: String,
      enum: [...Object.values(TableCleaningType), null],
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
