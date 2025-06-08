// src/middlewares/auth.middleware.js
import httpStatus from '../constants/httpStatus.js';
import ApiError from '../utils/ApiError.util.js';
import { verifyToken } from '../utils/jwt.util.js';
import { authRepository } from '../modules/auth/auth.repository.js';
import logger from '../utils/logger.util.js';

/**
 * Middleware xác thực access token từ header Authorization.
 * Đầu vào: req, res, next
 * Đầu ra: Gán req.user nếu hợp lệ, gọi next() hoặc trả lỗi nếu không hợp lệ
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
  if (!payload) {
    return next(
      new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired access token')
    );
  }

  req.user = { nguoiDungID: payload.sub };
  next();
};

/**
 * Middleware kiểm tra quyền truy cập theo vai trò.
 * Đầu vào: ...requiredRoles (danh sách vai trò), trả về middleware (req, res, next)
 * Đầu ra: Cho phép hoặc từ chối truy cập dựa trên vai trò của user
 */
const authorizeRoles = (...requiredRoles) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.nguoiDungID) {
      return next(
        new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required')
      );
    }

    const userRoles = await authRepository.getVaiTroByNguoiDungID(
      req.user.nguoiDungID
    );
    logger.info(
      `User roles for NguoiDungID ${req.user.nguoiDungID}: ${JSON.stringify(userRoles)}`
    );
    const userMaVaiTro = userRoles.map((role) => role.maVaiTro);

    const hasRequiredRole = requiredRoles.some((role) =>
      userMaVaiTro.includes(role)
    );

    if (!hasRequiredRole) {
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
