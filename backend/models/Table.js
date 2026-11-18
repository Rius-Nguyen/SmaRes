const mongoose = require('mongoose');

const TableStatus = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  SEATED: 'SEATED',
  CLEANING: 'CLEANING',
};

const tableSchema = new mongoose.Schema(
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

tableSchema.pre('save', function (next) {
  if (this.table_number && !this.tableNumber) {
    this.tableNumber = this.table_number;
  } else if (this.tableNumber && !this.table_number) {
    this.table_number = this.tableNumber;
  }
  next();
});

const Table =
  (mongoose.models && mongoose.models.Table) ||
  mongoose.model('Table', tableSchema);

Table.TableStatus = TableStatus;

module.exports = Table;
