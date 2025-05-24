// src/modules/auth/auth.controller.js
import httpStatus from '../../constants/httpStatus.js';
import { authService } from './auth.service.js';
import { createdResponse, okResponse } from '../../utils/response.util.js'; // Giả sử successResponse nằm trong response.util.js
import jwtConfig from '../../config/jwt.config.js';

const login = async (req, res) => {
  const { email, matKhau } = req.body; // Giả sử email được dùng làm tenDangNhap
  const loginResult = await authService.loginUser(email, matKhau);

  // Set refreshToken vào HTTPOnly cookie
  res.cookie('refreshToken', loginResult.refreshTokenForCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Chỉ gửi qua HTTPS ở production
    sameSite: 'strict', // Hoặc 'lax' tùy theo yêu cầu
    maxAge: jwtConfig.refreshExpiresIn.endsWith('d')
      ? parseInt(jwtConfig.refreshExpiresIn) * 24 * 60 * 60 * 1000 // Chuyển ngày sang ms
      : parseInt(jwtConfig.refreshExpiresIn) * 1000, // Giả sử là giây nếu không có 'd'
  });

  // Xóa refreshTokenForCookie khỏi đối tượng trả về cho client
  const { refreshTokenForCookie, ...responsePayload } = loginResult;

  okResponse(res, responsePayload, 'Đăng nhập thành công.');
};

const refreshTokens = async (req, res) => {
  const refreshTokenFromCookie = req.cookies.refreshToken; // Giả sử bạn dùng cookie-parser middleware
  const newTokens = await authService.refreshTokens(refreshTokenFromCookie);
  okResponse(res, newTokens, 'Access token refreshed successfully.');
};

const logout = async (req, res) => {
  // const refreshTokenFromCookie = req.cookies.refreshToken; // Lấy nếu cần xử lý ở service
  await authService.logoutUser(/* refreshTokenFromCookie */);

  // Xóa HTTPOnly cookie chứa refresh token
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0), // Đặt thời gian hết hạn trong quá khứ để xóa cookie
    path: '/', // Đảm bảo path khớp với lúc set cookie
  });

  okResponse(res, null, 'Đăng xuất thành công.');
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  okResponse(res, null, result.message);
};

const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const result = await authService.verifyOtp(email, otp);
  okResponse(res, { resetToken: result.resetToken }, result.message);
};

const resetPassword = async (req, res) => {
  const { resetToken, matKhauMoi } = req.body;
  const result = await authService.resetPassword(resetToken, matKhauMoi);
  okResponse(res, null, result.message);
};

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
