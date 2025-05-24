// src/modules/donVi/donVi.route.js
import express from 'express';
import { donViController } from './donVi.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { donViValidation } from './donVi.validation.js';

const router = express.Router();
router.use(authMiddleware.authenticateToken); // Yêu cầu đăng nhập

router.get(
  '/',
  donViValidation.validateGetDonVisParams,
  asyncHandler(donViController.getDonVisController)
);

export default router;
