// src/modules/nganhHoc/nganhHoc.route.js
import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { nganhHocController } from './nganhHoc.controller.js';
import { nganhHocValidation } from './nganhHoc.validation.js';

import { chuyenNganhNestedRoutes } from '../chuyenNganh/chuyenNganh.route.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
const router = express.Router();

/**
 * Router lồng cho chuyên ngành thuộc ngành học.
 * Áp dụng xác thực token và validate param ngành học.
 */
router.use(
  '/:nganhHocId/chuyen-nganh',
  authMiddleware.authenticateToken,
  nganhHocValidation.validateNganhHocIdParam,
  chuyenNganhNestedRoutes
);

/**
 * Lấy danh sách ngành học cho select option.
 * @route GET /nganh-hoc/select-options
 * @returns {Array<object>} Danh sách ngành học tối giản
 */
router.get(
  '/select-options',
  authMiddleware.authenticateToken,
  nganhHocValidation.validateGetNganhHocForSelectParams,
  asyncHandler(nganhHocController.getNganhHocListForSelectController)
);

/**
 * Tạo mới một ngành học (chỉ Admin hệ thống).
 * @route POST /nganh-hoc
 * @body {object} Thông tin ngành học
 * @returns {object} Ngành học vừa tạo
 */
router.post(
  '/',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  nganhHocValidation.validateCreateNganhHocPayload,
  asyncHandler(nganhHocController.createNganhHocController)
);

/**
 * Lấy danh sách ngành học (có phân trang, filter).
 * @route GET /nganh-hoc
 * @returns {object} Danh sách ngành học
 */
router.get(
  '/',
  authMiddleware.authenticateToken,
  nganhHocValidation.validateGetNganhHocParams,
  asyncHandler(nganhHocController.getNganhHocListController)
);

/**
 * Lấy chi tiết một ngành học theo ID.
 * @route GET /nganh-hoc/:id
 * @param {string} id - ID ngành học (URL param)
 * @returns {object} Thông tin chi tiết ngành học
 */
router.get(
  '/:id',
  authMiddleware.authenticateToken,
  nganhHocValidation.validateIdParam,
  asyncHandler(nganhHocController.getNganhHocDetailController)
);

/**
 * Cập nhật thông tin ngành học theo ID (chỉ Admin hệ thống).
 * @route PUT /nganh-hoc/:id
 * @param {string} id - ID ngành học (URL param)
 * @body {object} Thông tin cập nhật ngành học
 * @returns {object} Ngành học sau khi cập nhật
 */
router.put(
  '/:id',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  nganhHocValidation.validateIdParam,
  nganhHocValidation.validateUpdateNganhHocPayload,
  asyncHandler(nganhHocController.updateNganhHocController)
);

/**
 * Xóa một ngành học theo ID (chỉ Admin hệ thống).
 * @route DELETE /nganh-hoc/:id
 * @param {string} id - ID ngành học (URL param)
 * @returns {object} Kết quả xóa ngành học
 */
router.delete(
  '/:id',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  nganhHocValidation.validateIdParam,
  asyncHandler(nganhHocController.deleteNganhHocController)
);

export default router;
