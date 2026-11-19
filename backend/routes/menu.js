const express = require('express');
const router = express.Router();
const Food = require('../models/Food');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { getQueryEmbedding } = require('../utils/embedding'); // Thêm helper tạo vector

// ==========================================
// 1. API: TÌM KIẾM NGỮ NGHĨA KẾT HỢP LỌC DANH MỤC & GIÁ (TK-155)
// ==========================================
// @route   GET /api/menu/search/semantic
// @desc    Tìm kiếm món ăn bằng Vector Search kết hợp tiền lọc category và price
router.get('/search/semantic', async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, limit = 10 } = req.query;

    // 1. Xây dựng điều kiện tiền lọc (Pre-filter) cho MongoDB Atlas Vector Search
    const filterConditions = [];

    if (category && category !== 'all' && category.trim() !== '') {
      filterConditions.push({ category: { $eq: category.trim() } });
    }

    if (minPrice !== undefined && minPrice !== '') {
      filterConditions.push({ price: { $gte: Number(minPrice) } });
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      filterConditions.push({ price: { $lte: Number(maxPrice) } });
    }

    const vectorFilter =
      filterConditions.length > 1
        ? { $and: filterConditions }
        : filterConditions.length === 1
        ? filterConditions[0]
        : undefined;

    // 2. Nếu người dùng KHÔNG nhập từ khóa (q trống) -> Chỉ lọc thuần theo danh mục và giá
    if (!q || q.trim() === '') {
      const normalQuery = {};
      if (category && category !== 'all' && category.trim() !== '') {
        normalQuery.category = category.trim();
      }
      if (minPrice || maxPrice) {
        normalQuery.price = {};
        if (minPrice) normalQuery.price.$gte = Number(minPrice);
        if (maxPrice) normalQuery.price.$lte = Number(maxPrice);
      }

      const foods = await Food.find(normalQuery).select('-embedding').limit(Number(limit));
      return res.status(200).json({
        success: true,
        searchType: 'filter-only',
        count: foods.length,
        data: foods,
      });
    }

    // 3. Chuyển đổi chuỗi tìm kiếm thành Vector thông qua Gemini API
    const queryVector = await getQueryEmbedding(q.trim());

    // 4. Thực thi truy vấn MongoDB Atlas Vector Search ($vectorSearch)
    const vectorSearchStage = {
      index: 'vector_index', // Tên Index đã cấu hình trên MongoDB Atlas
      path: 'embedding',     // Trường chứa mảng vector trong Model Food
      queryVector,
      numCandidates: 100,
      limit: Number(limit),
    };

    if (vectorFilter) {
      vectorSearchStage.filter = vectorFilter;
    }

    const results = await Food.aggregate([
      { $vectorSearch: vectorSearchStage },
      {
        $project: {
          embedding: 0, // Ẩn mảng vector để tối ưu dung lượng trả về
          score: { $meta: 'vectorSearchScore' }, // Trả kèm độ tương đồng ngữ nghĩa
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      searchType: 'semantic',
      query: q.trim(),
      filters: {
        category: category || null,
        minPrice: minPrice ? Number(minPrice) : null,
        maxPrice: maxPrice ? Number(maxPrice) : null,
      },
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error('Lỗi GET /api/menu/search/semantic:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi tìm kiếm món ăn theo ngữ nghĩa',
      error: error.message,
    });
  }
});

// ==========================================
// 2. API: THÊM MÓN ĂN MỚI (Admin)
// ==========================================
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

// ==========================================
// 3. API: SỬA MÓN ĂN THEO ID (Admin)
// ==========================================
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

// ==========================================
// 4. API: BẬT/TẮT TRẠNG THÁI HẾT MÓN NHANH
// ==========================================
router.patch('/:id/toggle-availability', async (req, res) => {
  try {
    const foodId = req.params.id;
    const food = await Food.findById(foodId);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy món ăn với ID: ${foodId}`
      });
    }

    const newStatus = typeof req.body.is_available === 'boolean'
      ? req.body.is_available
      : typeof req.body.isAvailable === 'boolean'
      ? req.body.isAvailable
      : !food.isAvailable;

    food.isAvailable = newStatus;
    if (food.is_available !== undefined) {
      food.is_available = newStatus;
    }
    await food.save();

    return res.status(200).json({
      success: true,
      message: `Đã ${newStatus ? 'BẬT (Còn món)' : 'TẮT (Hết món)'} cho: ${food.name}`,
      food
    });
  } catch (error) {
    console.error('Lỗi PATCH /api/menu/:id/toggle-availability:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi bật/tắt trạng thái món ăn'
    });
  }
});

module.exports = router;