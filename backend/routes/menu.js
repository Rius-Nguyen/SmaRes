const express = require('express');
const router = express.Router();
const Food = require('../models/Food');
const { verifyToken, isAdmin } = require('../middleware/auth');

// @route   POST /api/menu
// @desc    Thêm món ăn mới vào thực đơn (Chỉ Admin)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, price, description, category, image, isAvailable } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ các trường bắt buộc: name, price, category!'
      });
    }

    const newFood = new Food({
      name,
      price,
      description: description || '',
      category,
      image: image || '',
      isAvailable: isAvailable !== undefined ? isAvailable : true
    });

    const savedFood = await newFood.save();

    return res.status(201).json({
      success: true,
      message: 'Thêm món ăn thành công!',
      food: savedFood
    });
  } catch (error) {
    console.error('Lỗi POST /api/menu:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi thêm món ăn mới'
    });
  }
});

// @route   PUT /api/menu/:id
// @desc    Sửa thông tin món ăn theo ID (Chỉ Admin)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const foodId = req.params.id;
    const updateData = req.body;

    const updatedFood = await Food.findByIdAndUpdate(
      foodId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedFood) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy món ăn với ID: ${foodId}`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật món ăn thành công!',
      food: updatedFood
    });
  } catch (error) {
    console.error('Lỗi PUT /api/menu/:id:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật món ăn'
    });
  }
});

module.exports = router;