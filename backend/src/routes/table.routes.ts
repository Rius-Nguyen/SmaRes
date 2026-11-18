import express from 'express';
import { validateTableQrAccess } from '../controllers/table.controller';

const router = express.Router();

// ============================================================================
// TK-142: POST /api/v1/tables/validate-qr-access
// Kiểm tra tính hợp lệ của mã QR / số bàn (Chỉ mở khi bàn đang SEATED / Occupied)
// ============================================================================
router.post('/validate-qr-access', validateTableQrAccess);

export default router;
