import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import { trangThietBiController } from './trangThietBi.controller.js';
import { trangThietBiValidation } from './trangThietBi.validation.js';

const router = express.Router();

/**
 * Lấy danh sách trang thiết bị (có phân trang, tìm kiếm).
 * @route GET /
 * @access Đăng nhập
 * @middleware validateGetTrangThietBiParams
 * @returns {Object} Danh sách thiết bị
 */
router.get(
  '/',
  authMiddleware.authenticateToken,
  trangThietBiValidation.validateGetTrangThietBiParams,
  asyncHandler(trangThietBiController.getTrangThietBiListController)
);

/**
 * Lấy danh sách trang thiết bị để chọn (select option).
 * @route GET /cho-chon
 * @access Đăng nhập
 * @middleware validateGetTrangThietBiParams
 * @returns {Object} Danh sách thiết bị phù hợp để chọn
 */
router.get(
  '/cho-chon',
  authMiddleware.authenticateToken,
  trangThietBiValidation.validateGetTrangThietBiParams,
  asyncHandler(trangThietBiController.getTrangThietBiListController)
);

/**
 * Tạo mới một trang thiết bị.
 * @route POST /
 * @access ADMIN_HE_THONG, QUAN_LY_CSVC
 * @middleware validateCreateTrangThietBiPayload
 * @returns {Object} Thiết bị vừa tạo
 */
router.post(
  '/',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG, MaVaiTro.QUAN_LY_CSVC),
  trangThietBiValidation.validateCreateTrangThietBiPayload,
  asyncHandler(trangThietBiController.createTrangThietBiController)
);

/**
 * Lấy chi tiết một trang thiết bị theo ID.
 * @route GET /:id
 * @access Đăng nhập
 * @middleware validateIdParam
 * @returns {Object} Chi tiết thiết bị
 */
router.get(
  '/:id',
  authMiddleware.authenticateToken,
  trangThietBiValidation.validateIdParam,
  asyncHandler(trangThietBiController.getTrangThietBiDetailController)
);

/**
 * Cập nhật thông tin trang thiết bị theo ID.
 * @route PUT /:id
 * @access ADMIN_HE_THONG, QUAN_LY_CSVC
 * @middleware validateIdParam, validateUpdateTrangThietBiPayload
 * @returns {Object} Thiết bị đã cập nhật
 */
router.put(
  '/:id',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG, MaVaiTro.QUAN_LY_CSVC),
  trangThietBiValidation.validateIdParam,
  trangThietBiValidation.validateUpdateTrangThietBiPayload,
  asyncHandler(trangThietBiController.updateTrangThietBiController)
);

/**
 * Xóa trang thiết bị theo ID.
 * @route DELETE /:id
 * @access ADMIN_HE_THONG, QUAN_LY_CSVC
 * @middleware validateIdParam
 * @returns {void} Không trả về dữ liệu nếu xóa thành công
 */
router.delete(
  '/:id',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG, MaVaiTro.QUAN_LY_CSVC),
  trangThietBiValidation.validateIdParam,
  asyncHandler(trangThietBiController.deleteTrangThietBiController)
);

export default router;
