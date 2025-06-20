// src/modules/auth/auth.service.js
import httpStatus from '../../constants/httpStatus.js';
import errorMessages from '../../constants/errorMessages.js';
import ApiError from '../../utils/ApiError.util.js';
import { comparePassword, hashPassword } from '../../utils/password.util.js';
import { generateAuthTokens, verifyToken } from '../../utils/jwt.util.js';
import { authRepository } from './auth.repository.js';
import crypto from 'crypto';
import emailService from '../../services/email.service.js';
import jwtConfig from '../../config/jwt.config.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

/**
 * Đăng nhập người dùng bằng email và mật khẩu.
 * @param {string} email
 * @param {string} matKhau
 * @returns {Promise<object>} Thông tin đăng nhập thành công.
 */
const loginUser = async (email, matKhau) => {
  const taiKhoanNguoiDung =
    await authRepository.findTaiKhoanNguoiDungByEmail(email); // Sửa ở đây

  if (
    !taiKhoanNguoiDung ||
    !(await comparePassword(matKhau, taiKhoanNguoiDung.MatKhauHash))
  ) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      errorMessages.INVALID_CREDENTIALS
    );
  }

  if (taiKhoanNguoiDung.TrangThaiTk !== 'Active') {
    let errorCode = 'ACCOUNT_INACTIVE';
    let message =
      'Tài khoản của bạn chưa được kích hoạt hoặc đang không hoạt động.';
    if (taiKhoanNguoiDung.TrangThaiTk === 'Locked') {
      errorCode = 'ACCOUNT_LOCKED';
      message = 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.';
    } else if (taiKhoanNguoiDung.TrangThaiTk === 'Disabled') {
      errorCode = 'ACCOUNT_DISABLED';
      message =
        'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.';
    }
    throw new ApiError(httpStatus.FORBIDDEN, message, true, null, errorCode);
  }

  if (!taiKhoanNguoiDung.NguoiDungIsActive) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Thông tin người dùng không hoạt động.'
    );
  }

  const nguoiDungID = taiKhoanNguoiDung.NguoiDungID;

  // 1. Tạo đối tượng `nguoiDungResponse`
  const nguoiDungResponse = {
    nguoiDungID: nguoiDungID,
    maDinhDanh: taiKhoanNguoiDung.MaDinhDanh,
    hoTen: taiKhoanNguoiDung.HoTen,
    email: taiKhoanNguoiDung.NguoiDungEmail,
    anhDaiDien: taiKhoanNguoiDung.AnhDaiDien,
  };

  // 2. Lấy TẤT CẢ các vai trò từ CSDL (chức năng + thành viên)
  const allRolesFromDB =
    await authRepository.getVaiTroChucNangByNguoiDungID(nguoiDungID);

  // 3. Xây dựng đối tượng `vaiTroChucNang`

  const vaiTroChucNang = allRolesFromDB
    .filter((role) => role.maVaiTro !== MaVaiTro.THANH_VIEN_DON_VI)
    .map((role) => ({
      maVaiTro: role.maVaiTro,
      tenVaiTro: role.tenVaiTro,
      donViThucThi: role.donVi,
    }));

  // 4. Xây dựng đối tượng `tuCachCoBan`
  let tuCachCoBan = { loai: 'KHAC', chiTiet: null };

  const thongTinSV = await authRepository.getThongTinSinhVienCoBan(nguoiDungID);
  if (thongTinSV) {
    tuCachCoBan = { loai: 'SINH_VIEN', chiTiet: thongTinSV };
  } else {
    const thongTinGV =
      await authRepository.getThongTinGiangVienCoBan(nguoiDungID);
    if (thongTinGV) {
      tuCachCoBan = { loai: 'GIANG_VIEN', chiTiet: thongTinGV };
    }
  }

  // 5. Tạo tokens
  const tokens = generateAuthTokens({ NguoiDungID: nguoiDungID });

  return {
    nguoiDung: nguoiDungResponse,
    tokens: {
      accessToken: tokens.accessToken,
    },
    vaiTroChucNang,
    tuCachCoBan,
    refreshTokenForCookie: tokens.refreshToken,
  };
};

/**
 * Sinh mã OTP ngẫu nhiên 6 chữ số.
 * @returns {string} Mã OTP.
 */
const generateOtp = () => crypto.randomInt(100000, 999999).toString();

/**
 * Sinh reset token ngẫu nhiên.
 * @returns {string} Reset token.
 */
const generateResetToken = () => crypto.randomBytes(32).toString('hex');

/**
 * Xử lý quên mật khẩu, gửi OTP về email nếu tồn tại.
 * @param {string} email
 * @returns {Promise<object>} Thông báo gửi OTP.
 */
const forgotPassword = async (email) => {
  const user = await authRepository.findNguoiDungByEmail(email);
  if (!user) {
    return {
      message:
        'Nếu email của bạn tồn tại trong hệ thống, một mã OTP sẽ được gửi đến.',
    };
  }

  const otp = generateOtp();
  await authRepository.saveOtp(email, otp);

  // Gửi email chứa OTP (cần triển khai emailService)
  try {
    await emailService.sendOtpEmail(email, user.HoTen, otp); // Ví dụ
  } catch (error) {
    // Có thể log lỗi gửi email nhưng vẫn trả về thành công cho người dùng
    console.error('Error sending OTP email:', error);
  }

  return {
    message: 'Mã OTP đã được gửi đến email của bạn.',
  };
};

/**
 * Xác thực OTP quên mật khẩu và sinh reset token.
 * @param {string} email
 * @param {string} otp
 * @returns {Promise<object>} Thông báo xác thực OTP thành công và reset token.
 */
const verifyOtp = async (email, otp) => {
  const validOtpEntry = await authRepository.findValidOtp(email, otp);
  if (!validOtpEntry) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Mã OTP không hợp lệ hoặc đã hết hạn.'
    );
  }

  await authRepository.markOtpAsUsed(validOtpEntry.TokenID);

  const resetToken = generateResetToken();
  await authRepository.saveResetToken(email, resetToken);

  return { message: 'Xác thực OTP thành công.', resetToken };
};

/**
 * Đặt lại mật khẩu mới bằng reset token hợp lệ.
 * @param {string} resetToken
 * @param {string} matKhauMoi
 * @returns {Promise<object>} Thông báo đặt lại mật khẩu thành công.
 */
const resetPassword = async (resetToken, matKhauMoi) => {
  const validResetTokenEntry =
    await authRepository.findValidResetToken(resetToken);
  if (!validResetTokenEntry) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'
    );
  }

  const newPasswordHash = await hashPassword(matKhauMoi); // Hash mật khẩu mới

  await authRepository.updateUserPasswordByEmail(
    validResetTokenEntry.Email,
    newPasswordHash
  );
  await authRepository.markOtpAsUsed(validResetTokenEntry.TokenID); // Đánh dấu reset token đã sử dụng

  return { message: 'Đặt lại mật khẩu thành công.' };
};

/**
 * Gửi lại OTP quên mật khẩu (dùng lại logic forgotPassword).
 * @param {string} email
 * @returns {Promise<object>} Thông báo gửi lại OTP.
 */
const resendOtp = async (email) => {
  return forgotPassword(email);
};

/**
 * Làm mới access token từ refresh token.
 * @param {string} refreshTokenFromCookie
 * @returns {Promise<object>} Access token mới.
 */
const refreshTokens = async (refreshTokenFromCookie) => {
  if (!refreshTokenFromCookie) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Refresh token is required');
  }

  const payload = verifyToken(refreshTokenFromCookie, jwtConfig.refreshSecret);
  if (!payload || !payload.sub) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      'Invalid or expired refresh token'
    );
  }

  // Tạo accessToken mới
  const accessTokenPayload = {
    sub: payload.sub /*, roles: userAccount.roles */,
  };
  const newAccessToken = generateAuthTokens({
    NguoiDungID: payload.sub,
  }).accessToken;
  // Không cần tạo lại refresh token ở đây trừ khi bạn muốn xoay vòng refresh token

  return { accessToken: newAccessToken };
};

/**
 * Đăng xuất người dùng.
 * Không thực hiện thao tác với refresh token (nếu có lưu trữ thì cần vô hiệu hóa ở đây).
 * @returns {Promise<{message: string}>} Thông báo đăng xuất thành công.
 */
const logoutUser = async () => {
  return { message: 'Đăng xuất thành công.' };
};

export const authService = {
  loginUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
  resendOtp,
  refreshTokens,
  logoutUser,
};
