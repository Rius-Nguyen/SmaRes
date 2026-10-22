const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Food = require('../models/Food');
const { verifyToken } = require('../middleware/auth'); // Import middleware bảo mật

// ==========================================
// 1. API: Khởi tạo và lưu đơn hàng mới (Dành cho Khách hàng)
// @route   POST /api/orders
// ==========================================
router.post('/', async (req, res) => {
  try {
    // 1. Lấy thông tin người dùng, thông tin bàn và danh sách món từ req.body
    const { userId, tableId, items } = req.body; 

    // Kiểm tra tính hợp lệ của giỏ hàng
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Giỏ hàng trống hoặc sai định dạng!' 
      });
    }

    let calculatedTotalPrice = 0;
    const orderItems = [];

    // 2. Duyệt giỏ hàng và tra cứu giá gốc trong MongoDB để chống sửa giá từ Client
    for (let item of items) {
      const food = await Food.findById(item.foodId);
      if (!food) {
        return res.status(404).json({ 
          success: false, 
          message: `Không tìm thấy món ăn với ID: ${item.foodId}` 
        });
      }

      calculatedTotalPrice += food.price * item.quantity;
      
      orderItems.push({
        foodId: item.foodId,
        quantity: item.quantity
      });
    }

    // 3. Khởi tạo đối tượng Đơn hàng mới
    const newOrder = new Order({
      userId: userId || null,
      tableId: tableId || null,
      items: orderItems,
      totalPrice: calculatedTotalPrice,
      status: 'Pending'
    });

    // 4. Lưu trực tiếp vào cơ sở dữ liệu MongoDB
    const savedOrder = await newOrder.save();

    // 5. Phản hồi kết quả thành công chứa mã đơn hàng (orderId)
    return res.status(201).json({
      success: true,
      message: 'Tạo đơn hàng thành công',
      orderId: savedOrder._id,
      totalPrice: savedOrder.totalPrice
    });

  } catch (error) {
    console.error('Lỗi API POST /api/orders:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi khởi tạo đơn hàng' 
    });
  }
});


// ==========================================
// 2. API: Lấy danh sách đơn chưa hoàn thành (Dành cho Staff - Task TK-110)
// @route   GET /api/orders/staff
// ==========================================
router.get('/staff', verifyToken, async (req, res) => {
  try {
    // Tìm các đơn chưa hoàn thành và chưa bị hủy
    const activeOrders = await Order.find({
      status: { $nin: ['Completed', 'Cancelled'] }
    })
      .populate('userId', 'name phone email') // Lấy thông tin khách hàng từ userId
      .populate('items.foodId')              // Lấy thông tin chi tiết món ăn từ foodId
      .sort({ createdAt: 1 });               // Sắp xếp đơn cũ nhất lên đầu (1: tăng dần)

    return res.status(200).json({
      success: true,
      count: activeOrders.length,
      data: activeOrders
    });
  } catch (error) {
    console.error('Lỗi API GET /api/orders/staff:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách đơn hàng cho Staff'
    });
  }
});

module.exports = router;