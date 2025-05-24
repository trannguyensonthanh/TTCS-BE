// src/modules/nguoiDung/nguoiDung.route.js
import express from 'express';
import { nguoiDungController } from './nguoiDung.controller.js'; // Bạn sẽ tạo controller này
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { nguoiDungValidation } from './nguoiDung.validation.js';

const router = express.Router();
router.use(authMiddleware.authenticateToken);

router.get(
  '/',
  nguoiDungValidation.validateGetNguoiDungsParams,
  asyncHandler(nguoiDungController.getNguoiDungsController)
);

export default router;
