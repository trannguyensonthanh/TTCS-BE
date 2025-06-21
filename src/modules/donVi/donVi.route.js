// src/modules/donVi/donVi.route.js
import express from 'express';
import { donViController } from './donVi.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { donViValidation } from './donVi.validation.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

const router = express.Router();
router.use(authMiddleware.authenticateToken);

/**
 * Lấy danh sách đơn vị (GET /v1/donvi)
 * Query: searchTerm, loaiDonVi, donViChaID, page, limit, sortBy, sortOrder
 * @returns 200: Danh sách đơn vị (có phân trang, lọc)
 */
router.get(
  '/',
  donViValidation.validateGetDonViParams,
  asyncHandler(donViController.getDonViListController)
);

/**
 * Lấy chi tiết đơn vị theo ID (GET /v1/donvi/:donViId)
 * @returns 200: Thông tin chi tiết đơn vị
 */
router.get(
  '/:donViId',
  donViValidation.validateIdParam,
  asyncHandler(donViController.getDonViDetailController)
);

/**
 * Tạo mới đơn vị (POST /v1/donvi)
 * Body: {tenDonVi, maDonVi, loaiDonVi, donViChaID, moTaDv}
 * @returns 201: Đơn vị vừa tạo
 */
router.post(
  '/',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  donViValidation.validateCreateDonViPayload,
  asyncHandler(donViController.createDonViController)
);

/**
 * Cập nhật đơn vị (PUT /v1/donvi/:donViId)
 * Body: {tenDonVi, maDonVi, loaiDonVi, donViChaID, moTaDv}
 * @returns 200: Đơn vị sau cập nhật
 */
router.put(
  '/:donViId',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  donViValidation.validateIdParam,
  donViValidation.validateUpdateDonViPayload,
  asyncHandler(donViController.updateDonViController)
);

/**
 * Xóa đơn vị (DELETE /v1/donvi/:donViId)
 * @returns 204: Xóa thành công
 */
router.delete(
  '/:donViId',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  donViValidation.validateIdParam,
  asyncHandler(donViController.deleteDonViController)
);

/**
 * Lấy danh sách đơn vị cha tiềm năng cho select (GET /v1/donvi/don-vi-cha-options)
 * Query: excludeDonViId, searchTerm, limit
 * @returns 200: Danh sách đơn vị cha phù hợp
 */
router.get(
  '/don-vi-cha-options',
  donViValidation.validateGetDonViChaOptionsParams,
  asyncHandler(donViController.getDonViChaOptionsController)
);

export default router;
