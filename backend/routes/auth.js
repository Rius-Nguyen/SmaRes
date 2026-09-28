const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const verifyToken = require('../middleware/auth');

// 1. API Tạo sẵn các Role ban đầu
router.get('/init-roles', async (req, res) => {
  try {
    await Role.insertMany([{ role_name: 'ADMIN' }, { role_name: 'STAFF' }, { role_name: 'CUSTOMER' }]);
    res.json({ message: 'Đã tạo xong các Role mặc định!' });
  } catch (error) {
    res.status(400).json({ message: 'Role đã tồn tại hoặc có lỗi.' });
  }
});

// 2. API ĐĂNG KÝ (Đã được sửa lại để đồng bộ với User.js)
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, phone } = req.body; // Bắt đúng biến password
    
    // Kiểm tra trùng lặp
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email này đã được đăng ký!' });

    const role = await Role.findOne({ role_name: 'CUSTOMER' });
    if (!role) return res.status(400).json({ message: 'Chưa khởi tạo Role!' });

    // Tạo User: Bỏ việc tự băm mật khẩu, đẩy thẳng password vào để User.js tự động băm
    const newUser = new User({ full_name, email, password, phone, role_id: role._id });
    await newUser.save();

    res.status(201).json({ message: 'Đăng ký tài khoản thành công!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. API ĐĂNG NHẬP (Đã được sửa lại tên biến cho đồng bộ)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email }).populate('role_id');
    
    // So sánh mật khẩu nhập vào (password) với mật khẩu đã băm trong database (user.password)
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không chính xác!' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role_id.role_name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Ở môi trường test local (http) thì để false
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ message: 'Đăng nhập thành công!', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. API Đăng xuất
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Đã đăng xuất thành công!' });
});

// 5. API Lấy thông tin User
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('role_id');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;