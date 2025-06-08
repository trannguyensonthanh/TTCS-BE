// src/modules/loaiTang/loaiTang.route.js
import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import { loaiTangController } from './loaiTang.controller.js';
import { loaiTangValidation } from './loaiTang.validation.js';

const router = express.Router();

/**
 * Lấy danh sách loại tầng (có lọc, phân trang, tìm kiếm).
 * @route GET /loai-tang
 * @header {string} Authorization - Bearer access token
 * @query {object} Các tham số lọc loại tầng
 * @returns {Array<object>} Danh sách loại tầng
 */
router.get(
  '/',
  authMiddleware.authenticateToken,
  loaiTangValidation.validateGetLoaiTangParams,
  asyncHandler(loaiTangController.getLoaiTangListController)
);

/**
 * Tạo mới loại tầng.
 * @route POST /loai-tang
 * @header {string} Authorization - Bearer access token (ADMIN_HE_THONG)
 * @body {object} body - Dữ liệu loại tầng mới
 * @returns {object} Loại tầng vừa tạo
 */
router.post(
  '/',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  loaiTangValidation.validateCreateLoaiTangPayload,
  asyncHandler(loaiTangController.createLoaiTangController)
);

/**
 * Lấy chi tiết loại tầng theo ID.
 * @route GET /loai-tang/:id
 * @header {string} Authorization - Bearer access token
 * @param {string} id - ID loại tầng (URL param)
 * @returns {object} Thông tin loại tầng
 */
router.get(
  '/:id',
  authMiddleware.authenticateToken,
  loaiTangValidation.validateIdParam,
  asyncHandler(loaiTangController.getLoaiTangDetailController)
);

/**
 * Cập nhật loại tầng theo ID.
 * @route PUT /loai-tang/:id
 * @header {string} Authorization - Bearer access token (ADMIN_HE_THONG)
 * @param {string} id - ID loại tầng (URL param)
 * @body {object} body - Dữ liệu cập nhật loại tầng
 * @returns {object} Loại tầng đã cập nhật
 */
router.put(
  '/:id',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  loaiTangValidation.validateIdParam,
  loaiTangValidation.validateUpdateLoaiTangPayload,
  asyncHandler(loaiTangController.updateLoaiTangController)
);

/**
 * Xóa loại tầng theo ID.
 * @route DELETE /loai-tang/:id
 * @header {string} Authorization - Bearer access token (ADMIN_HE_THONG)
 * @param {string} id - ID loại tầng (URL param)
 * @returns {void} Trả về 204 No Content nếu xóa thành công
 */
router.delete(
  '/:id',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  loaiTangValidation.validateIdParam,
  asyncHandler(loaiTangController.deleteLoaiTangController)
);

export default router;
