/**
 * File: backend/scripts/generateFoodEmbeddings.js
 * Chức năng: Script trích xuất mô tả/hương vị món ăn và tạo Vector Embedding lưu vào MongoDB (TK-153)
 * Chạy bằng lệnh: node scripts/generateFoodEmbeddings.js [--force]
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const Food = require('../models/Food');

// Đổi tên hàm import cho khớp với file backend/utils/embedding.js của bạn
const embeddingUtil = require('../utils/embedding');
const generateEmbeddingFn =
  embeddingUtil.getQueryEmbedding ||
  embeddingUtil.getEmbedding ||
  embeddingUtil.generateEmbedding;

const FORCE_UPDATE = process.argv.includes('--force');
const DELAY_MS = 250; // Nghỉ nhẹ giữa các request để hạn chế rate limit

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ghép thông tin món ăn thành văn bản phục vụ tạo vector embedding
 */
function buildFoodEmbeddingText(food) {
  const parts = [];

  if (food.name) parts.push(`Tên món: ${food.name}`);
  if (food.category) parts.push(`Danh mục: ${food.category}`);
  if (food.flavor) parts.push(`Hương vị: ${food.flavor}`);
  if (food.taste) parts.push(`Vị: ${food.taste}`);
  if (food.flavor_profile) parts.push(`Đặc trưng hương vị: ${food.flavor_profile}`);
  if (food.description) parts.push(`Mô tả: ${food.description}`);
  if (Array.isArray(food.ingredients) && food.ingredients.length > 0) {
    parts.push(`Nguyên liệu: ${food.ingredients.join(', ')}`);
  }

  return parts.join('. ').trim();
}

async function run() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('Thiếu MONGODB_URI (hoặc MONGO_URI) trong backend/.env');
    process.exit(1);
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('Thiếu GEMINI_API_KEY trong backend/.env');
    process.exit(1);
  }

  if (typeof generateEmbeddingFn !== 'function') {
    console.error(
      'Không tìm thấy hàm tạo embedding hợp lệ trong backend/utils/embedding.js'
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Đã kết nối MongoDB thành công.');

    const foods = await Food.find({});
    console.log(`Tổng số món ăn tìm thấy: ${foods.length}`);

    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const food of foods) {
      const hasEmbedding =
        Array.isArray(food.embedding) && food.embedding.length > 0;

      if (hasEmbedding && !FORCE_UPDATE) {
        skippedCount++;
        console.log(`Bỏ qua (đã có embedding): ${food.name || food._id}`);
        continue;
      }

      const textToEmbed = buildFoodEmbeddingText(food);
      if (!textToEmbed) {
        failedCount++;
        console.warn(`Món thiếu nội dung mô tả/hương vị: ${food.name || food._id}`);
        continue;
      }

      try {
        const vector = await generateEmbeddingFn(textToEmbed);

        if (!Array.isArray(vector) || vector.length === 0) {
          throw new Error('Kết quả embedding rỗng hoặc không phải mảng');
        }

        food.embedding = vector;
        await food.save();

        updatedCount++;
        console.log(
          `Đã tạo & lưu embedding (${vector.length} chiều) cho: ${food.name || food._id}`
        );

        await sleep(DELAY_MS);
      } catch (err) {
        failedCount++;
        console.error(
          `Lỗi khi tạo embedding cho "${food.name || food._id}":`,
          err.message
        );
      }
    }

    console.log('-----------------------------------------');
    console.log('Hoàn tất chạy script tạo Vector Embedding:');
    console.log(`- Đã cập nhật thành công: ${updatedCount}`);
    console.log(`- Đã bỏ qua: ${skippedCount}`);
    console.log(`- Lỗi: ${failedCount}`);
    console.log('-----------------------------------------');
  } catch (error) {
    console.error('Lỗi thực thi script:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Đã ngắt kết nối MongoDB.');
  }
}

run();