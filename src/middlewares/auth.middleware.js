// src/middlewares/auth.middleware.js
import httpStatus from '../constants/httpStatus.js';
import ApiError from '../utils/ApiError.util.js';
import { verifyToken } from '../utils/jwt.util.js';
import { authRepository } from '../modules/auth/auth.repository.js'; // Để lấy thông tin người dùng nếu cần

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1];

  if (!token) {
    return next(
      new ApiError(httpStatus.UNAUTHORIZED, 'Access token is required')
    );
  }

  const payload = verifyToken(token); // verifyToken từ jwt.util.js
  if (!payload) {
    return next(
      new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired access token')
    );
  }

  // Gắn thông tin người dùng vào request để các controller sau có thể sử dụng
  // Có thể lấy thêm thông tin chi tiết người dùng từ DB nếu cần
  // const user = await authRepository.findNguoiDungById(payload.sub);
  // if (!user) {
  //   return next(new ApiError(httpStatus.UNAUTHORIZED, 'User not found for token'));
  // }
  // req.user = user;

  req.user = { nguoiDungID: payload.sub }; // Gắn NguoiDungID vào request
  next();
};

// Middleware kiểm tra vai trò (ví dụ)
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
    const userMaVaiTro = userRoles.map((role) => role.MaVaiTro);

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
