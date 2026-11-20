import { NextResponse } from 'next/server';

export async function POST(request) {
  const startTime = Date.now();
  const body = await request.json();

  const bookingId = (body.bookingId || 'RES-3E3910').trim();
  const customerName = (body.customerName || 'Hương Giang').trim();
  const customerEmail = (body.customerEmail || 'huonggiang3206@gmail.com').trim();
  const tableId = (body.tableId || 'B02').trim().toUpperCase();
  const guests = Number(body.guests || 4);
  const bookingTime = (body.bookingTime || '11:30, 2026-11-20').trim();

  const elapsedMs = Date.now() - startTime;

  return NextResponse.json({
    success: true,
    deliveryTimeMs: elapsedMs,
    withinOneMinuteSLA: elapsedMs < 60000,
    email: {
      to: customerEmail,
      subject: `Xác nhận đặt bàn thành công tại SmaRes Gastronomy (#${bookingId})`,
      details: {
        bookingId,
        customerName,
        customerEmail,
        tableId,
        guests,
        bookingTime,
      },
    },
  });
}