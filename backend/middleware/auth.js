const jwt = require('jsonwebtoken');

// 1. Kiểm tra JWT Token
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token || (req.header('Authorization') && req.header('Authorization').split(' ')[1]);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập!' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    req.user = verified;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
};

// 2. Kiểm tra quyền Admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Truy cập bị từ chối. Chỉ Admin mới có quyền thực hiện!' });
  }
};

verifyToken.verifyToken = verifyToken;
verifyToken.isAdmin = isAdmin;

module.exports = verifyToken;