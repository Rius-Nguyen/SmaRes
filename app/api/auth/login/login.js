const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key_here';

const db = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'restaurant_db',
    password: process.env.DB_PASSWORD || 'your_password',
    port: process.env.DB_PORT || 5432,
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Vui lòng nhập đầy đủ email và password."
        });
    }

    try {
        const normalizedEmail = email.toLowerCase().trim();

        
        const userQuery = 'SELECT id, name, email, password, role FROM users WHERE email = $1';
        const userResult = await db.query(userQuery, [normalizedEmail]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                message: "Email hoặc mật khẩu không chính xác."
            });
        }

        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                message: "Email hoặc mật khẩu không chính xác."
            });
        }

        const userId = user.id;
        const role = user.role || 'user';

        const token = jwt.sign(
            { userId, role },
            SECRET_KEY,
            { expiresIn: '1d' }
        );

        return res.status(200).json({
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: role
            }
        });

    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        return res.status(500).json({
            message: "Lỗi hệ thống server."
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});