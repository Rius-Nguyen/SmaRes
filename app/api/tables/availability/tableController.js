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

app.get('/api/tables/availability', async (req, res) => {
    const { date, time, guests = 1, duration = 120 } = req.query;

    if (!date || !time) {
        return res.status(400).json({
            success: false,
            message: "Vui lòng cung cấp tham số 'date' (YYYY-MM-DD) và 'time' (HH:mm)."
        });
    }

    try {
        const checkStart = new Date(`${date}T${time}:00`);
        const checkEnd = new Date(checkStart.getTime() + parseInt(duration) * 60 * 1000);

        if (isNaN(checkStart.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Định dạng ngày hoặc giờ không hợp lệ."
            });
        }

        const query = `
            SELECT 
                t.id,
                t.name,
                t.capacity,
                CASE 
                    WHEN COUNT(r.id) > 0 THEN false 
                    ELSE true 
                END AS "isAvailable"
            FROM tables t
            LEFT JOIN reservations r ON t.id = r.table_id
                AND r.status IN ('CONFIRMED', 'PENDING')
                AND r.start_time < $1 
                AND r.end_time > $2
            WHERE t.capacity >= $3
            GROUP BY t.id, t.name, t.capacity
            ORDER BY t.id ASC;
        `;

        const result = await db.query(query, [
            checkEnd, 
            checkStart, 
            parseInt(guests)
        ]);

        return res.status(200).json({
            success: true,
            query: {
                date,
                time,
                guests: parseInt(guests)
            },
            data: result.rows
        });

    } catch (error) {
        console.error("Lỗi kiểm tra bàn trống:", error);
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