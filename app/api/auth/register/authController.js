const express = require('express');
const bcrypt = require('bcrypt');
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

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Vui lòng nhập đầy đủ thông tin: name, email, password."
        });
    }

    try {
        const normalizedEmail = email.toLowerCase().trim();

        const checkEmailQuery = 'SELECT id FROM users WHERE email = $1';
        const existingUser = await db.query(checkEmailQuery, [normalizedEmail]);

        if (existingUser.rows.length > 0) {
            // Response: Trùng email trả về 409 Conflict
            return res.status(409).json({
                success: false,
                message: "Email đã tồn tại trong hệ thống."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Logic: Tạo bản ghi mới vào CSDL
        const insertUserQuery = `
            INSERT INTO users (name, email, password)
            VALUES ($1, $2, $3)
            RETURNING id, name, email, created_at
        `;
        const newUserResult = await db.query(insertUserQuery, [
            name.trim(),
            normalizedEmail,
            hashedPassword
        ]);

        const newUser = newUserResult.rows[0];

        return res.status(201).json({
            success: true,
            message: "Đăng ký tài khoản thành công!",
            data: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                createdAt: newUser.created_at
            }
        });

    } catch (error) {
        console.error("Lỗi khi đăng ký:", error);
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