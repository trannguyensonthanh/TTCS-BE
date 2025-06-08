// src/modules/lopHoc/lopHoc.route.js
import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import { lopHocController } from './lopHoc.controller.js';
import { lopHocValidation } from './lopHoc.validation.js';

const router = express.Router();

router.use(authMiddleware.authenticateToken);

/**
 * Lấy danh sách lớp học.
 * Query params được validate bởi validateGetLopHocParams.
 * @route GET /v1/danhmuc/lop-hoc
 * @returns {Array<object>} Danh sách lớp học
 */
router.get(
  '/',
  lopHocValidation.validateGetLopHocParams,
  asyncHandler(lopHocController.getLopHocListController)
);

/**
 * Lấy chi tiết một lớp học theo ID.
 * @route GET /v1/danhmuc/lop-hoc/:id
 * @param {string} id - ID lớp học (URL param)
 * @returns {object} Thông tin chi tiết lớp học
 */
router.get(
  '/:id',
  lopHocValidation.validateIdParam,
  asyncHandler(lopHocController.getLopHocDetailController)
);

/**
 * Tạo mới một lớp học.
 * Chỉ Admin hệ thống được phép thực hiện.
 * @route POST /v1/danhmuc/lop-hoc
 * @body {object} Thông tin lớp học cần tạo
 * @returns {object} Lớp học vừa được tạo
 */
router.post(
  '/',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  lopHocValidation.validateCreateLopHocPayload,
  asyncHandler(lopHocController.createLopHocController)
);

/**
 * Cập nhật thông tin lớp học theo ID.
 * Chỉ Admin hệ thống được phép thực hiện.
 * @route PUT /v1/danhmuc/lop-hoc/:id
 * @param {string} id - ID lớp học (URL param)
 * @body {object} Thông tin cập nhật lớp học
 * @returns {object} Lớp học sau khi cập nhật
 */
router.put(
  '/:id',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  lopHocValidation.validateIdParam,
  lopHocValidation.validateUpdateLopHocPayload,
  asyncHandler(lopHocController.updateLopHocController)
);

/**
 * Xóa một lớp học theo ID.
 * Chỉ Admin hệ thống được phép thực hiện.
 * @route DELETE /v1/danhmuc/lop-hoc/:id
 * @param {string} id - ID lớp học (URL param)
 * @returns {object} Kết quả xóa lớp học
 */
router.delete(
  '/:id',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  lopHocValidation.validateIdParam,
  asyncHandler(lopHocController.deleteLopHocController)
);

export default router;
