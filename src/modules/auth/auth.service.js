// src/modules/auth/auth.service.js
import httpStatus from '../../constants/httpStatus.js';
import errorMessages from '../../constants/errorMessages.js';
import ApiError from '../../utils/ApiError.util.js';
import { comparePassword, hashPassword } from '../../utils/password.util.js';
import { generateAuthTokens, verifyToken } from '../../utils/jwt.util.js';
import { authRepository } from './auth.repository.js';
import crypto from 'crypto';
import emailService from '../../services/email.service.js'; // Giả sử bạn có service gửi email
import jwtConfig from '../../config/jwt.config.js';

/**
 * Đăng nhập người dùng bằng Email và Mật khẩu
 * @param {string} email
 * @param {string} matKhau
 * @returns {Promise<object>} LoginSuccessResponse
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

  const nguoiDungResponse = {
    nguoiDungID: taiKhoanNguoiDung.NguoiDungID,
    maDinhDanh: taiKhoanNguoiDung.MaDinhDanh,
    hoTen: taiKhoanNguoiDung.HoTen,
    email: taiKhoanNguoiDung.NguoiDungEmail,
    anhDaiDien: taiKhoanNguoiDung.AnhDaiDien,
  };

  // Tạo tokens
  const tokens = generateAuthTokens({
    NguoiDungID: taiKhoanNguoiDung.NguoiDungID /*, roles: ... nếu cần */,
  });

  // Lấy vai trò chức năng
  const vaiTroChucNang = await authRepository.getVaiTroByNguoiDungID(
    taiKhoanNguoiDung.NguoiDungID
  );

  // Xác định tư cách cơ bản
  let tuCachCoBan = { loai: 'KHAC', chiTiet: null }; // Mặc định
  const thongTinSV = await authRepository.getThongTinSinhVienCoBan(
    taiKhoanNguoiDung.NguoiDungID
  );
  if (thongTinSV) {
    tuCachCoBan = { loai: 'SINH_VIEN', chiTiet: thongTinSV };
  } else {
    const thongTinGV = await authRepository.getThongTinGiangVienCoBan(
      taiKhoanNguoiDung.NguoiDungID
    );
    if (thongTinGV) {
      tuCachCoBan = { loai: 'GIANG_VIEN', chiTiet: thongTinGV };
    }
    // Có thể thêm logic kiểm tra nhân viên khác nếu có bảng ThongTinNhanVien
  }

  return {
    nguoiDung: nguoiDungResponse,
    tokens: {
      accessToken: tokens.accessToken,
      // refreshToken không trả về trong body
    },
    vaiTroChucNang,
    tuCachCoBan,
    refreshTokenForCookie: tokens.refreshToken, // Trả về để controller set cookie
  };
};

const generateOtp = () => crypto.randomInt(100000, 999999).toString(); // OTP 6 chữ số
const generateResetToken = () => crypto.randomBytes(32).toString('hex');

const forgotPassword = async (email) => {
  const user = await authRepository.findNguoiDungByEmail(email);
  if (!user) {
    // Không nên báo lỗi "User not found" để tránh dò email
    // Chỉ đơn giản là trả về success message nhưng không thực sự gửi OTP nếu email không tồn tại
    // Hoặc bạn có thể log lỗi này phía server để theo dõi
    // throw new ApiError(httpStatus.NOT_FOUND, errorMessages.USER_NOT_FOUND);
    // Để an toàn, vẫn trả về thông báo thành công để tránh lộ thông tin email
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
    message: 'Mã OTP đã được gửi đến email của bạn (nếu email tồn tại).',
  };
};

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

const resendOtp = async (email) => {
  // Logic tương tự forgotPassword
  return forgotPassword(email);
};

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

  // Kiểm tra xem người dùng có tồn tại và active không (tùy chọn, nhưng nên có)
  // const userAccount = await authRepository.findTaiKhoanByNguoiDungID(payload.sub);
  // if (!userAccount || userAccount.TrangThaiTk !== 'Active') {
  //   throw new ApiError(httpStatus.UNAUTHORIZED, 'User account is not active or not found');
  // }

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

const logoutUser =
  async (/* refreshTokenFromCookie - có thể dùng để vô hiệu hóa phía server nếu lưu trữ */) => {
    // Nếu bạn lưu trữ refresh token trong DB và muốn vô hiệu hóa nó:
    // await authRepository.invalidateRefreshToken(refreshTokenFromCookie);
    // Hiện tại, việc xóa cookie sẽ do controller thực hiện.
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
