// src/modules/yeuCauHuySK/yeuCauHuySK.route.js
import express from 'express';
import { yeuCauHuySKController } from './yeuCauHuySK.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { yeuCauHuySKValidation } from './yeuCauHuySK.validation.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

const router = express.Router();

router.use(authMiddleware.authenticateToken); // Tất cả route cần xác thực

router.post(
  '/', // Endpoint sẽ là /v1/yeucauhuysk
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ), // Chỉ người có vai trò này được tạo
  yeuCauHuySKValidation.validateCreateYeuCauHuySK,
  asyncHandler(yeuCauHuySKController.createYeuCauHuySKController)
);

export default router;
