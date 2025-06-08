// src/modules/loaiSuKien/loaiSuKien.route.js
import express from 'express';
import { loaiSuKienController } from './loaiSuKien.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { loaiSuKienValidation } from './loaiSuKien.validation.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

const router = express.Router();

/**
 * Lấy danh sách loại sự kiện (có thể public hoặc cho người dùng đã đăng nhập)
 * @route GET /loai-su-kien
 * @header {string} Authorization - Bearer access token
 * @returns {array} Danh sách loại sự kiện
 */
router.get(
  '/',
  authMiddleware.authenticateToken, // Yêu cầu đăng nhập để xem
  loaiSuKienValidation.validateGetLoaiSKParams,
  asyncHandler(loaiSuKienController.getLoaiSKsController)
);

/**
 * Tạo mới loại sự kiện.
 * @route POST /loai-su-kien
 * @header {string} Authorization - Bearer access token (ADMIN_HE_THONG)
 * @body {object} body - Dữ liệu loại sự kiện mới
 * @returns {object} Loại sự kiện vừa tạo
 */
router.post(
  '/',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  loaiSuKienValidation.validateCreateLoaiSK,
  asyncHandler(loaiSuKienController.createLoaiSKController)
);

/**
 * Lấy chi tiết loại sự kiện theo ID.
 * @route GET /loai-su-kien/:loaiSKId
 * @header {string} Authorization - Bearer access token
 * @param {string} loaiSKId - ID loại sự kiện (URL param)
 * @returns {object} Thông tin loại sự kiện
 */
router.get(
  '/:loaiSKId',
  authMiddleware.authenticateToken,
  loaiSuKienValidation.validateLoaiSKIdParam,
  asyncHandler(loaiSuKienController.getLoaiSKByIdController)
);

/**
 * Cập nhật loại sự kiện theo ID.
 * @route PUT /loai-su-kien/:loaiSKId
 * @header {string} Authorization - Bearer access token (ADMIN_HE_THONG)
 * @param {string} loaiSKId - ID loại sự kiện (URL param)
 * @body {object} body - Dữ liệu cập nhật loại sự kiện
 * @returns {object} Loại sự kiện đã cập nhật
 */
router.put(
  '/:loaiSKId',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  loaiSuKienValidation.validateLoaiSKIdParam,
  loaiSuKienValidation.validateUpdateLoaiSK,
  asyncHandler(loaiSuKienController.updateLoaiSKByIdController)
);

/**
 * Xóa loại sự kiện theo ID.
 * @route DELETE /loai-su-kien/:loaiSKId
 * @header {string} Authorization - Bearer access token (ADMIN_HE_THONG)
 * @param {string} loaiSKId - ID loại sự kiện (URL param)
 * @returns {void} Trả về 204 No Content nếu xóa thành công
 */
router.delete(
  '/:loaiSKId',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  loaiSuKienValidation.validateLoaiSKIdParam,
  asyncHandler(loaiSuKienController.deleteLoaiSKByIdController)
);

export default router;
