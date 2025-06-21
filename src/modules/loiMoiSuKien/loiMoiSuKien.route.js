// loiMoiSuKien.route.js
// Định nghĩa các route cho module Lời Mời Sự Kiện

import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { loiMoiSuKienController } from './loiMoiSuKien.controller.js';
import { loiMoiSuKienValidation } from './loiMoiSuKien.validation.js';

const router = express.Router();
router.use(authMiddleware.authenticateToken);

/**
 * Lấy danh sách lời mời sự kiện của người dùng hiện tại
 */
router.get(
  '/cua-toi',
  loiMoiSuKienValidation.validateGetMyInvitationsParams,
  asyncHandler(loiMoiSuKienController.getMyInvitationsController)
);

/**
 * Phản hồi lời mời tham gia sự kiện
 */
router.post(
  '/:moiThamGiaID/phan-hoi',
  loiMoiSuKienValidation.validateIdParam,
  loiMoiSuKienValidation.validateRespondToInvitationPayload,
  asyncHandler(loiMoiSuKienController.respondToInvitationController)
);

export default router;
