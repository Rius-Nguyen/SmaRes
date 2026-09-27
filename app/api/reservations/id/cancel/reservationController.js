const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const db = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'restaurant_db',
    password: process.env.DB_PASSWORD || 'your_password',
    port: process.env.DB_PORT || 5432,
});

app.patch('/api/reservations/:id/cancel', async (req, res) => {
    const reservationId = req.params.id; 
    const now = new Date(); 

    try {
        const queryFind = 'SELECT * FROM reservations WHERE id = $1';
        const resultFind = await db.query(queryFind, [reservationId]);

        if (resultFind.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Không tìm thấy đơn đặt bàn có ID: ${reservationId}`
            });
        }

        const reservation = resultFind.rows[0];

        if (reservation.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: "Đơn đặt bàn này đã bị hủy trước đó."
            });
        }

        const reservationTime = new Date(reservation.start_time);
        const diffInMinutes = (reservationTime.getTime() - now.getTime()) / (1000 * 60);

        if (diffInMinutes <= 60) {
            return res.status(400).json({
                success: false,
                message: "Chỉ được phép hủy đơn nếu thời gian hiện tại cách giờ hẹn hơn 60 phút."
            });
        }

        const queryUpdate = `
            UPDATE reservations 
            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 
            RETURNING id, booking_code AS "bookingCode", status, updated_at AS "updatedAt"
        `;
        const resultUpdate = await db.query(queryUpdate, [reservationId]);

        return res.status(200).json({
            success: true,
            message: "Hủy đơn đặt bàn thành công!",
            data: resultUpdate.rows[0]
        });

    } catch (error) {
        console.error("Lỗi khi hủy đơn đặt bàn:", error);
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