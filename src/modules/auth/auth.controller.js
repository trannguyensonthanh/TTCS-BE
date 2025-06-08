// src/modules/auth/auth.controller.js
import httpStatus from '../../constants/httpStatus.js';
import { authService } from './auth.service.js';
import { createdResponse, okResponse } from '../../utils/response.util.js';
import jwtConfig from '../../config/jwt.config.js';

/**
 * Đăng nhập người dùng
 * @param {Object} req - Express request (body: { email, matKhau })
 * @param {Object} res - Express response
 * @returns {Promise<void>} Gửi response đăng nhập thành công hoặc lỗi
 */
const login = async (req, res) => {
  const { email, matKhau } = req.body;
  const loginResult = await authService.loginUser(email, matKhau);

  res.cookie('refreshToken', loginResult.refreshTokenForCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: jwtConfig.refreshExpiresIn.endsWith('d')
      ? parseInt(jwtConfig.refreshExpiresIn) * 24 * 60 * 60 * 1000
      : parseInt(jwtConfig.refreshExpiresIn) * 1000,
  });

  const { refreshTokenForCookie, ...responsePayload } = loginResult;

  okResponse(res, responsePayload, 'Đăng nhập thành công.');
};

/**
 * Làm mới access token từ refresh token trong cookie
 * @param {Object} req - Express request (cookies: { refreshToken })
 * @param {Object} res - Express response
 * @returns {Promise<void>} Gửi response với access token mới
 */
const refreshTokens = async (req, res) => {
  const refreshTokenFromCookie = req.cookies.refreshToken;
  const newTokens = await authService.refreshTokens(refreshTokenFromCookie);
  okResponse(res, newTokens, 'Access token refreshed successfully.');
};

/**
 * Đăng xuất người dùng, xóa refresh token cookie
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Promise<void>} Gửi response đăng xuất thành công
 */
const logout = async (req, res) => {
  await authService.logoutUser();

  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
    path: '/',
  });

  okResponse(res, null, 'Đăng xuất thành công.');
};

/**
 * Gửi OTP quên mật khẩu về email
 * @param {Object} req - Express request (body: { email })
 * @param {Object} res - Express response
 * @returns {Promise<void>} Gửi response thông báo gửi OTP
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  okResponse(res, null, result.message);
};

/**
 * Xác thực OTP quên mật khẩu
 * @param {Object} req - Express request (body: { email, otp })
 * @param {Object} res - Express response
 * @returns {Promise<void>} Gửi response với resetToken nếu thành công
 */
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const result = await authService.verifyOtp(email, otp);
  okResponse(res, { resetToken: result.resetToken }, result.message);
};

/**
 * Đặt lại mật khẩu mới bằng reset token
 * @param {Object} req - Express request (body: { resetToken, matKhauMoi })
 * @param {Object} res - Express response
 * @returns {Promise<void>} Gửi response đặt lại mật khẩu thành công
 */
const resetPassword = async (req, res) => {
  const { resetToken, matKhauMoi } = req.body;
  const result = await authService.resetPassword(resetToken, matKhauMoi);
  okResponse(res, null, result.message);
};

/**
 * Gửi lại OTP quên mật khẩu
 * @param {Object} req - Express request (body: { email })
 * @param {Object} res - Express response
 * @returns {Promise<void>} Gửi response thông báo gửi lại OTP
 */
const resendOtp = async (req, res) => {
  const { email } = req.body;
  const result = await authService.resendOtp(email);
  okResponse(res, null, result.message);
};

export const authController = {
  login,
  refreshTokens,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
  resendOtp,
};
