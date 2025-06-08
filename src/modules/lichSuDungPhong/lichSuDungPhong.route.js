// src/modules/lichSuDungPhong/lichSuDungPhong.route.js
import express from 'express';
import { lichSuDungPhongController } from './lichSuDungPhong.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { lichSuDungPhongValidation } from './lichSuDungPhong.validation.js';

const router = express.Router();

router.use(authMiddleware.authenticateToken); // Tất cả người dùng đăng nhập đều có thể xem lịch

/**
 * Lấy dữ liệu lịch sử sử dụng phòng theo các tiêu chí lọc.
 * @route GET /lichsudungphong
 * @header {string} Authorization - Bearer access token
 * @query {object} Các tham số lọc lịch sử sử dụng phòng
 * @returns {Array<object>} Danh sách lịch sử sử dụng phòng
 */
router.get(
  '/',
  lichSuDungPhongValidation.validateGetLichDatPhongParams,
  asyncHandler(lichSuDungPhongController.getLichDatPhongController)
);

export default router;
