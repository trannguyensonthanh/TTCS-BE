// src/modules/toaNhaTang/toaNhaTang.route.js
import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import { toaNhaTangController } from './toaNhaTang.controller.js';
import { toaNhaTangValidation } from './toaNhaTang.validation.js';

const router = express.Router({ mergeParams: true });

/**
 * Lấy danh sách tầng vật lý của tòa nhà (có phân trang, tìm kiếm).
 * @route GET /v1/danhmuc/toa-nha/{toaNhaId}/tang
 * @access ADMIN_HE_THONG, QUAN_LY_CSVC
 * @middleware validateGetToaNhaTangParams
 * @returns {Object} Danh sách tầng vật lý
 */
router.get(
  '/',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG, MaVaiTro.QUAN_LY_CSVC),
  toaNhaTangValidation.validateGetToaNhaTangParams,
  asyncHandler(toaNhaTangController.getToaNhaTangListController)
);

/**
 * Tạo mới tầng vật lý cho tòa nhà.
 * @route POST /v1/danhmuc/toa-nha/{toaNhaId}/tang
 * @access ADMIN_HE_THONG
 * @middleware validateCreateToaNhaTangPayload
 * @returns {Object} Tầng vật lý vừa tạo
 */
router.post(
  '/',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  toaNhaTangValidation.validateCreateToaNhaTangPayload,
  asyncHandler(toaNhaTangController.createToaNhaTangController)
);

export default router;
