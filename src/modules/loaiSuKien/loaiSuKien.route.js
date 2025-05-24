// src/modules/loaiSuKien/loaiSuKien.route.js
import express from 'express';
import { loaiSuKienController } from './loaiSuKien.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { loaiSuKienValidation } from './loaiSuKien.validation.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

const router = express.Router();

// Lấy danh sách loại sự kiện (có thể public hoặc cho người dùng đã đăng nhập)
router.get(
  '/',
  authMiddleware.authenticateToken, // Yêu cầu đăng nhập để xem
  loaiSuKienValidation.validateGetLoaiSKParams,
  asyncHandler(loaiSuKienController.getLoaiSKsController)
);

// Các API dưới đây thường dành cho Admin
router.post(
  '/',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  loaiSuKienValidation.validateCreateLoaiSK,
  asyncHandler(loaiSuKienController.createLoaiSKController)
);

router.get(
  '/:loaiSKId',
  authMiddleware.authenticateToken,
  loaiSuKienValidation.validateLoaiSKIdParam,
  asyncHandler(loaiSuKienController.getLoaiSKByIdController)
);

router.put(
  '/:loaiSKId',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  loaiSuKienValidation.validateLoaiSKIdParam,
  loaiSuKienValidation.validateUpdateLoaiSK,
  asyncHandler(loaiSuKienController.updateLoaiSKByIdController)
);

router.delete(
  '/:loaiSKId',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  loaiSuKienValidation.validateLoaiSKIdParam,
  asyncHandler(loaiSuKienController.deleteLoaiSKByIdController)
);

export default router;
