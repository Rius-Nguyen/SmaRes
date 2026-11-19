import { Schema, model, models, Model, Types } from 'mongoose';

export const WaiterCallStatus = {
  PENDING: 'PENDING',
  ATTENDED: 'ATTENDED',
  COMPLETED: 'COMPLETED',
} as const;

export type WaiterCallStatus = (typeof WaiterCallStatus)[keyof typeof WaiterCallStatus];

export interface IWaiterCall {
  _id?: string;
  tableNumber: string;
  reason: string;
  notes?: string;
  status: WaiterCallStatus;
  handledBy?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const WaiterCallSchema = new Schema<IWaiterCall>(
  {
    tableNumber: {
      type: String,
      required: [true, 'Vui lòng cung cấp số bàn'],
      uppercase: true,
      trim: true,
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'Vui lòng chọn lý do hỗ trợ'],
      default: 'Hỗ trợ khác',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(WaiterCallStatus),
      default: WaiterCallStatus.PENDING,
      index: true,
    },
    handledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'waiter_calls',
  }
);

const WaiterCall: Model<IWaiterCall> =
  models.WaiterCall || model<IWaiterCall>('WaiterCall', WaiterCallSchema);

export default WaiterCall;
