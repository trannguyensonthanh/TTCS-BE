// src/modules/auth/auth.route.js
import express from 'express';
import { authController } from './auth.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authValidation } from './auth.validation.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * Đăng nhập hệ thống.
 * @route POST /login
 * @body {string} email - Địa chỉ email người dùng
 * @body {string} password - Mật khẩu
 * @returns {Object} Thông tin người dùng và token nếu đăng nhập thành công
 */
router.post('/login', authValidation.login, asyncHandler(authController.login));

/**
 * Làm mới access token bằng refresh token.
 * @route POST /refresh-tokens
 * @body {string} refreshToken - Refresh token hợp lệ
 * @returns {Object} Access token mới
 */
router.post('/refresh-tokens', asyncHandler(authController.refreshTokens));

/**
 * Đăng xuất khỏi hệ thống.
 * @route POST /logout
 * @header {string} Authorization - Bearer access token
 * @returns {Object} Kết quả đăng xuất
 */
router.post(
  '/logout',
  authMiddleware.authenticateToken,
  asyncHandler(authController.logout)
);

/**
 * Gửi yêu cầu quên mật khẩu (gửi OTP về email).
 * @route POST /forgot-password
 * @body {string} email - Địa chỉ email nhận OTP
 * @returns {Object} Kết quả gửi OTP
 */
router.post(
  '/forgot-password',
  authValidation.forgotPassword,
  asyncHandler(authController.forgotPassword)
);

/**
 * Xác thực OTP quên mật khẩu.
 * @route POST /verify-otp
 * @body {string} email - Địa chỉ email
 * @body {string} otp - Mã OTP
 * @returns {Object} Kết quả xác thực OTP
 */
router.post(
  '/verify-otp',
  authValidation.verifyOtp,
  asyncHandler(authController.verifyOtp)
);

/**
 * Đặt lại mật khẩu mới bằng OTP hợp lệ.
 * @route POST /reset-password
 * @body {string} email - Địa chỉ email
 * @body {string} otp - Mã OTP
 * @body {string} newPassword - Mật khẩu mới
 * @returns {Object} Kết quả đặt lại mật khẩu
 */
router.post(
  '/reset-password',
  authValidation.resetPassword,
  asyncHandler(authController.resetPassword)
);

/**
 * Gửi lại OTP quên mật khẩu.
 * @route POST /resend-otp
 * @body {string} email - Địa chỉ email nhận lại OTP
 * @returns {Object} Kết quả gửi lại OTP
 */
router.post(
  '/resend-otp',
  authValidation.resendOtp,
  asyncHandler(authController.resendOtp)
);

export default router;
