const express = require('express');
const { Pool } = require('pg');
const authenticateToken = require('./authMiddleware'); // Import Middleware

const app = express();
app.use(express.json());

const db = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'restaurant_db',
    password: process.env.DB_PASSWORD || 'your_password',
    port: process.env.DB_PORT || 5432,
});

app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const query = 'SELECT id, name, email, role, created_at FROM users WHERE id = $1';
        const userResult = await db.query(query, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy thông tin người dùng." });
        }

        return res.status(200).json({
            success: true,
            data: userResult.rows[0]
        });

    } catch (error) {
        console.error("Lỗi lấy thông tin người dùng:", error);
        return res.status(500).json({ message: "Lỗi hệ thống server." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});