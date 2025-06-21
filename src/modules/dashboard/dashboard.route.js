import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { dashboardController } from './dashboard.controller.js';
import { dashboardValidation } from './dashboard.validation.js';

const router = express.Router();
// Tất cả API trong đây chỉ cần đăng nhập
router.use(authMiddleware.authenticateToken);

router.get(
  '/tong-quan-cong-khai/kpi',
  dashboardValidation.validateGetPublicKpiParams,
  asyncHandler(dashboardController.getPublicDashboardKpiController)
);

export default router;
