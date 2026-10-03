const express = require('express');
const router = express.Router();
const User = require('../models/User');
const verifyToken = require('../middleware/auth');

// GET /api/user/profile - Lấy thông tin người dùng đang đăng nhập
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    // Đã bỏ .populate('role_id') vì Schema đã phẳng hóa dùng field 'role'
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;