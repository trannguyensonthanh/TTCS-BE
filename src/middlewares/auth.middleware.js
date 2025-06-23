// src/middlewares/auth.middleware.js
import httpStatus from '../constants/httpStatus.js';
import ApiError from '../utils/ApiError.util.js';
import { verifyToken } from '../utils/jwt.util.js';
import { authRepository } from '../modules/auth/auth.repository.js';
import logger from '../utils/logger.util.js';
import MaVaiTro from '../enums/maVaiTro.enum.js';

/**
 * Middleware xác thực access token từ header Authorization.
 * SỬA ĐỔI: Hàm này giờ đây không chỉ xác thực token mà còn tải toàn bộ thông tin quyền hạn của người dùng
 * và gắn vào `req.user` để các middleware/controller sau sử dụng.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1];

  if (!token) {
    return next(
      new ApiError(httpStatus.UNAUTHORIZED, 'Access token is required')
    );
  }

  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    return next(
      new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired access token')
    );
  }

  const nguoiDungID = payload.sub;

  const [allRoles, thongTinSV, thongTinGV] = await Promise.all([
    authRepository.getVaiTroChucNangByNguoiDungID(nguoiDungID),
    authRepository.getThongTinSinhVienCoBan(nguoiDungID),
    authRepository.getThongTinGiangVienCoBan(nguoiDungID),
  ]);

  const maVaiTroChucNang = allRoles
    .filter((role) => role.maVaiTro !== MaVaiTro.THANH_VIEN_DON_VI)
    .map((role) => role.maVaiTro);

  let dinhDanh = 'NHAN_VIEN';
  if (thongTinSV) {
    dinhDanh = 'SINH_VIEN';
  } else if (thongTinGV) {
    dinhDanh = 'GIANG_VIEN';
  }

  req.user = {
    nguoiDungID,
    dinhDanh,
    maVaiTro: maVaiTroChucNang,
  };

  logger.debug(`Authenticated user ${nguoiDungID}:`, req.user);
  next();
};

/**
 * Middleware kiểm tra quyền truy cập theo vai trò hoặc định danh.
 * SỬA ĐỔI: Logic kiểm tra giờ sẽ dựa trên cả định danh và vai trò chức năng trong `req.user`.
 * @param {...string} requiredRoles - Danh sách các định danh hoặc vai trò được yêu cầu.
 * @returns {function} Middleware function.
 */
const authorizeRoles = (...requiredRoles) => {
  return (req, res, next) => {
    // Hàm này giờ phụ thuộc vào kết quả của authenticateToken ở trên
    if (!req.user || !req.user.nguoiDungID) {
      return next(
        new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required')
      );
    }

    const { dinhDanh, maVaiTro } = req.user;

    // Tạo một mảng chứa tất cả "quyền" của người dùng, bao gồm cả định danh của họ
    // và các mã vai trò chức năng họ có.
    const userPermissions = [dinhDanh, ...maVaiTro];

    // Kiểm tra xem mảng quyền của người dùng có chứa ít nhất một trong các quyền được yêu cầu không.
    const hasRequiredRole = requiredRoles.some((role) =>
      userPermissions.includes(role)
    );

    if (!hasRequiredRole) {
      logger.warn(
        `Forbidden: User ${req.user.nguoiDungID} with permissions [${userPermissions.join(', ')}] tried to access a resource requiring [${requiredRoles.join(', ')}]`
      );
      return next(
        new ApiError(
          httpStatus.FORBIDDEN,
          'You do not have permission to perform this action'
        )
      );
    }

    next();
  };
};

export const authMiddleware = {
  authenticateToken,
  authorizeRoles,
};
