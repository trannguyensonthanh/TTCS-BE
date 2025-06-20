import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { danhGiaSuKienController } from './danhGiaSuKien.controller.js';
import { danhGiaSuKienValidation } from './danhGiaSuKien.validation.js';

const router = express.Router();
router.use(authMiddleware.authenticateToken);

router.post(
  '/',
  danhGiaSuKienValidation.validateSubmitRatingPayload,
  asyncHandler(danhGiaSuKienController.submitEventRatingController)
);

router.put(
  '/:danhGiaSkID',
  danhGiaSuKienValidation.validateIdParam,
  danhGiaSuKienValidation.validateUpdateRatingPayload,
  asyncHandler(danhGiaSuKienController.updateEventRatingController)
);

router.delete(
  '/:danhGiaSkID',
  danhGiaSuKienValidation.validateIdParam,
  asyncHandler(danhGiaSuKienController.deleteEventRatingController)
);

export default router;
