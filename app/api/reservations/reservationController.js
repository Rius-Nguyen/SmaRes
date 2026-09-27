const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const db = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'restaurant_db',
    password: process.env.DB_PASSWORD || 'your_password',
    port: process.env.DB_PORT || 5432,
});

function generateBookingCode() {
    return 'BK-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

app.post('/api/reservations', async (req, res) => {
    const { tableId, date, time, guests, phone, note } = req.body;
    if (!tableId || !date || !time || !guests || !phone) {
        return res.status(400).json({
            success: false,
            message: "Vui lòng nhập đầy đủ thông tin: tableId, date, time, guests, phone."
        });
    }

    try {
        const reservationStart = new Date(`${date}T${time}:00`);
        const reservationEnd = new Date(reservationStart.getTime() + 120 * 60 * 1000);
        const checkConflictQuery = `
            SELECT id FROM reservations 
            WHERE table_id = $1 
              AND status IN ('confirmed', 'pending')
              AND start_time < $2 
              AND end_time > $3
        `;
        const conflictResult = await db.query(checkConflictQuery, [
            tableId,
            reservationEnd,
            reservationStart
        ]);

        if (conflictResult.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Bàn đã bị đặt trong khoảng thời gian này, vui lòng chọn bàn hoặc thời gian khác."
            });
        }

        const bookingCode = generateBookingCode();
        const status = 'confirmed';

        const insertQuery = `
            INSERT INTO reservations (table_id, booking_code, reservation_date, reservation_time, start_time, end_time, guests, phone, note, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, table_id AS "tableId", booking_code AS "bookingCode", reservation_date AS "date", reservation_time AS "time", guests, phone, note, status, created_at AS "createdAt"
        `;

        const newReservation = await db.query(insertQuery, [
            tableId,
            bookingCode,
            date,
            time,
            reservationStart,
            reservationEnd,
            guests,
            phone,
            note || '',
            status
        ]);

        return res.status(201).json({
            success: true,
            message: "Tạo đơn đặt bàn thành công!",
            data: newReservation.rows[0]
        });

    } catch (error) {
        console.error("Lỗi khi tạo đơn đặt bàn:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi hệ thống server."
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});