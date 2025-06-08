// src/modules/tangVatLy/tangVatLy.route.js (hoặc một tên khác phù hợp)
import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import { toaNhaTangController } from '../toaNhaTang/toaNhaTang.controller.js'; // Sử dụng lại controller
import { toaNhaTangValidation } from '../toaNhaTang/toaNhaTang.validation.js';

const router = express.Router();
router.use(authMiddleware.authenticateToken); // Xác thực chung

/**
 * GET /v1/danhmuc/tang/:toaNhaTangId
 * Lấy chi tiết một tầng vật lý theo ID.
 * Yêu cầu xác thực và vai trò: ADMIN_HE_THONG, QUAN_LY_CSVC.
 * @param {string} toaNhaTangId - ID tầng vật lý (param)
 * @returns {object} Thông tin chi tiết tầng vật lý
 */
router.get(
  '/:toaNhaTangId',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG, MaVaiTro.QUAN_LY_CSVC),
  toaNhaTangValidation.validateToaNhaTangIdParam,
  asyncHandler(toaNhaTangController.getToaNhaTangDetailController)
);

/**
 * PUT /v1/danhmuc/tang/:toaNhaTangId
 * Cập nhật thông tin một tầng vật lý theo ID.
 * Yêu cầu xác thực và vai trò: ADMIN_HE_THONG.
 * @param {string} toaNhaTangId - ID tầng vật lý (param)
 * @body {object} Thông tin cập nhật tầng vật lý
 * @returns {object} Tầng vật lý đã được cập nhật
 */
router.put(
  '/:toaNhaTangId',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  toaNhaTangValidation.validateToaNhaTangIdParam,
  toaNhaTangValidation.validateUpdateToaNhaTangPayload,
  asyncHandler(toaNhaTangController.updateToaNhaTangController)
);

/**
 * DELETE /v1/danhmuc/tang/:toaNhaTangId
 * Xóa một tầng vật lý theo ID.
 * Yêu cầu xác thực và vai trò: ADMIN_HE_THONG.
 * @param {string} toaNhaTangId - ID tầng vật lý (param)
 * @returns {object} Kết quả xóa tầng vật lý
 */
router.delete(
  '/:toaNhaTangId',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  toaNhaTangValidation.validateToaNhaTangIdParam,
  asyncHandler(toaNhaTangController.deleteToaNhaTangController)
);

export default router;
