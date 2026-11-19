import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import connectDB from '@/app/lib/db';
import Table, { type ITable } from '@/app/models/Table';

export const dynamic = 'force-dynamic';

function createDynamicToken(tableNumber: string): string {
  const timeCode = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SMARES-${tableNumber}-${timeCode}-${rand}`;
}

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

async function generateAndPersistQrSession(
  rawTableId: string,
  rawTableNumber: string,
  statusCode: 200 | 201,
  successMessage: string
): Promise<NextResponse> {
  const normalizedTableId = rawTableId.trim();
  const normalizedTableNumber = rawTableNumber.trim().toUpperCase();

  if (!normalizedTableId && !normalizedTableNumber) {
    return NextResponse.json(
      { success: false, message: 'Vui lòng cung cấp tableNumber hoặc tableId.' },
      { status: 400 }
    );
  }

  let matchedTableById: { _id: unknown; tableNumber: string } | null = null;
  if (normalizedTableId && mongoose.Types.ObjectId.isValid(normalizedTableId)) {
    matchedTableById = await Table.findById(normalizedTableId)
      .select('_id tableNumber')
      .lean<{ _id: unknown; tableNumber: string } | null>();
  }

  const tableNumber = (
    matchedTableById?.tableNumber ||
    normalizedTableNumber ||
    normalizedTableId
  ).toUpperCase();

  const token = createDynamicToken(tableNumber);
  const baseUrl = getBaseUrl();
  const orderUrl = `${baseUrl}/table-menu?table=${encodeURIComponent(tableNumber)}&token=${encodeURIComponent(token)}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(orderUrl)}`;

  const filter = matchedTableById?._id
    ? { _id: matchedTableById._id }
    : { tableNumber };

  const updatedTable = await Table.findOneAndUpdate(
    filter,
    { $set: { qrToken: token } },
    { new: true }
  ).lean<ITable | null>();

  return NextResponse.json(
    {
      success: true,
      message: successMessage,
      data: {
        tableId: updatedTable?._id ? String(updatedTable._id) : tableNumber,
        tableNumber,
        token,
        orderUrl,
        qrImageUrl,
        status: updatedTable?.status ?? 'ACTIVE',
        persisted: Boolean(updatedTable),
        createdAt: new Date().toISOString(),
      },
    },
    { status: statusCode }
  );
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const rawTableId = searchParams.get('tableId') ?? '';
    const rawTableNumber = searchParams.get('tableNumber') ?? searchParams.get('table') ?? '';

    return await generateAndPersistQrSession(
      rawTableId,
      rawTableNumber,
      200,
      'Khởi tạo mã QR động định danh bàn ăn thành công'
    );
  } catch (error: unknown) {
    console.error('Lỗi API GET /api/qr:', error);
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi khi tạo mã QR động',
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu JSON không hợp lệ.' },
        { status: 400 }
      );
    }

    if (typeof rawBody !== 'object' || rawBody === null) {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu yêu cầu mã QR không hợp lệ.' },
        { status: 400 }
      );
    }

    const body = rawBody as Record<string, unknown>;
    const rawTableId = typeof body.tableId === 'string' ? body.tableId : '';
    const rawTableNumber =
      typeof body.tableNumber === 'string'
        ? body.tableNumber
        : typeof body.table === 'string'
          ? body.table
          : '';

    return await generateAndPersistQrSession(
      rawTableId,
      rawTableNumber,
      201,
      'Làm mới Token và mã QR động thành công'
    );
  } catch (error: unknown) {
    console.error('Lỗi API POST /api/qr:', error);
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi server khi làm mới mã QR',
        error: message,
      },
      { status: 500 }
    );
  }
}
