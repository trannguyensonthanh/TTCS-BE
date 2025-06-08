// src/modules/chiTietSuDungPhong/chiTietSuDungPhong.route.js
import express from 'express';
import { chiTietSuDungPhongController } from './chiTietSuDungPhong.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { chiTietSuDungPhongValidation } from './chiTietSuDungPhong.validation.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các route
router.use(authMiddleware.authenticateToken);

/**
 * Route: Lấy danh sách các phòng đã đặt mà người dùng có thể yêu cầu đổi.
 * Yêu cầu xác thực, phân quyền và kiểm tra tham số hợp lệ.
 * @route GET /v1/chitietsudungphong/co-the-doi
 * @header {string} Authorization - Bearer access token
 * @query {number} nguoiYeuCauID - ID người yêu cầu
 * @query {number} [limit] - Số lượng kết quả tối đa
 * @returns {Array<object>} Danh sách phòng đã đặt còn hiệu lực
 */
router.get(
  '/co-the-doi',
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  chiTietSuDungPhongValidation.validateGetMyActiveBookedRoomsParams,
  asyncHandler(chiTietSuDungPhongController.getMyActiveBookedRoomsController)
);

export default router;
