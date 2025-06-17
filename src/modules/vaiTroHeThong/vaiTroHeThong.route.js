// src/modules/vaiTroHeThong/vaiTroHeThong.route.js
import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import { vaiTroHeThongController } from './vaiTroHeThong.controller.js';
import { vaiTroHeThongValidation } from './vaiTroHeThong.validation.js';

const router = express.Router();

router.use(authMiddleware.authenticateToken);

router.get(
  '/cho-chon', // Sẽ được mount thành /v1/danhmuc/vaitrohethong/cho-chon
  // authMiddleware.authenticateToken, // Đã được áp dụng ở route cha (danhMuc.route.js)
  asyncHandler(vaiTroHeThongController.getVaiTroHeThongForSelectController)
);

/**
 * Lấy danh sách vai trò hệ thống (có phân trang, tìm kiếm).
 * @route GET /
 * @access ADMIN_HE_THONG
 * @middleware validateGetVaiTroHeThongParams
 * @returns {Object} Danh sách vai trò hệ thống
 */
router.get(
  '/',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  vaiTroHeThongValidation.validateGetVaiTroHeThongParams,
  asyncHandler(vaiTroHeThongController.getVaiTroListController)
);

/**
 * Lấy chi tiết một vai trò hệ thống theo ID.
 * @route GET /:vaiTroId
 * @access ADMIN_HE_THONG
 * @middleware validateIdParam
 * @returns {Object} Chi tiết vai trò hệ thống
 */
router.get(
  '/:vaiTroId',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  vaiTroHeThongValidation.validateIdParam,
  asyncHandler(vaiTroHeThongController.getVaiTroDetailController)
);

/**
 * Tạo mới một vai trò hệ thống.
 * @route POST /
 * @access ADMIN_HE_THONG
 * @middleware validateCreateVaiTroHeThongPayload
 * @returns {Object} Vai trò hệ thống vừa tạo
 */
router.post(
  '/',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  vaiTroHeThongValidation.validateCreateVaiTroHeThongPayload,
  asyncHandler(vaiTroHeThongController.createVaiTroController)
);

/**
 * Cập nhật thông tin vai trò hệ thống theo ID.
 * @route PUT /:vaiTroId
 * @access ADMIN_HE_THONG
 * @middleware validateIdParam, validateUpdateVaiTroHeThongPayload
 * @returns {Object} Vai trò hệ thống đã cập nhật
 */
router.put(
  '/:vaiTroId',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  vaiTroHeThongValidation.validateIdParam,
  vaiTroHeThongValidation.validateUpdateVaiTroHeThongPayload,
  asyncHandler(vaiTroHeThongController.updateVaiTroController)
);

/**
 * Xóa vai trò hệ thống theo ID.
 * @route DELETE /:vaiTroId
 * @access ADMIN_HE_THONG
 * @middleware validateIdParam
 * @returns {void} Không trả về dữ liệu nếu xóa thành công
 */
router.delete(
  '/:vaiTroId',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  vaiTroHeThongValidation.validateIdParam,
  asyncHandler(vaiTroHeThongController.deleteVaiTroController)
);

export default router;
