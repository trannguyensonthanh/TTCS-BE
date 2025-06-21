// File: src/modules/danhGiaSuKien/danhGiaSuKien.route.js
// Cấu trúc: Định nghĩa các route cho đánh giá sự kiện, sử dụng middleware xác thực và validation.

import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { danhGiaSuKienController } from './danhGiaSuKien.controller.js';
import { danhGiaSuKienValidation } from './danhGiaSuKien.validation.js';

const router = express.Router();
router.use(authMiddleware.authenticateToken);

/**
 * Tạo mới đánh giá sự kiện
 */
router.post(
  '/',
  danhGiaSuKienValidation.validateSubmitRatingPayload,
  asyncHandler(danhGiaSuKienController.submitEventRatingController)
);

/**
 * Cập nhật đánh giá sự kiện theo ID
 */
router.put(
  '/:danhGiaSkID',
  danhGiaSuKienValidation.validateIdParam,
  danhGiaSuKienValidation.validateUpdateRatingPayload,
  asyncHandler(danhGiaSuKienController.updateEventRatingController)
);

/**
 * Xóa đánh giá sự kiện theo ID
 */
router.delete(
  '/:danhGiaSkID',
  danhGiaSuKienValidation.validateIdParam,
  asyncHandler(danhGiaSuKienController.deleteEventRatingController)
);

export default router;
