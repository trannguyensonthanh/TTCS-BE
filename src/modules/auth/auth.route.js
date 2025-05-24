// src/modules/auth/auth.route.js
import express from 'express';
import { authController } from './auth.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authValidation } from './auth.validation.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js'; // Cần tạo file này

const router = express.Router();

router.post('/login', authValidation.login, asyncHandler(authController.login));

router.post(
  '/refresh-tokens',
  asyncHandler(authController.refreshTokens) // Không cần authMiddleware ở đây vì dựa vào refresh token trong cookie
);

router.post(
  '/logout',
  authMiddleware.authenticateToken, // Cần Access Token để biết ai đang logout (backend có thể làm thêm gì đó với token này)
  asyncHandler(authController.logout)
);

router.post(
  '/forgot-password',
  authValidation.forgotPassword, // Cần tạo schema validation
  asyncHandler(authController.forgotPassword)
);

router.post(
  '/verify-otp',
  authValidation.verifyOtp, // Cần tạo schema validation
  asyncHandler(authController.verifyOtp)
);

router.post(
  '/reset-password',
  authValidation.resetPassword, // Cần tạo schema validation
  asyncHandler(authController.resetPassword)
);

router.post(
  '/resend-otp',
  authValidation.resendOtp, // Có thể dùng lại schema của forgotPassword
  asyncHandler(authController.resendOtp)
);

export default router;
