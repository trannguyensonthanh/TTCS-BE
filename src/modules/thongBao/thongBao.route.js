// src/modules/thongBao/thongBao.route.js
import express from 'express';
import { thongBaoController } from './thongBao.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { thongBaoValidation } from './thongBao.validation.js';

const router = express.Router();

router.use(authMiddleware.authenticateToken); // Tất cả các API thông báo đều cần biết người dùng là ai

router.get(
  '/cua-toi',
  thongBaoValidation.validateGetThongBaoCuaToiParams,
  asyncHandler(thongBaoController.getThongBaoCuaToiController)
);

router.post(
  '/:id/danh-dau-da-doc',
  thongBaoValidation.validateThongBaoIDParam,
  asyncHandler(thongBaoController.danhDauDaDocController)
);

router.post(
  '/danh-dau-tat-ca-da-doc',
  asyncHandler(thongBaoController.danhDauTatCaDaDocController)
);

export default router;
