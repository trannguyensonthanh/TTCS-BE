// src/utils/jwt.util.js
import jwt from 'jsonwebtoken'; // Cần cài đặt: npm install jsonwebtoken
import jwtConfig from '../config/jwt.config.js';

const generateToken = (
  payload,
  expiresIn = jwtConfig.expiresIn,
  secret = jwtConfig.secret
) => {
  return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (token, secret = jwtConfig.secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null; // Hoặc throw lỗi cụ thể
  }
};

const generateAuthTokens = (user) => {
  const accessTokenPayload = {
    sub: user.NguoiDungID, // Subject (thường là ID người dùng)
    // Thêm các thông tin khác nếu cần, ví dụ vai trò chính
    // roles: user.roles, // Giả sử user object có thông tin vai trò
  };
  const refreshTokenPayload = {
    sub: user.NguoiDungID,
  };

  const accessToken = generateToken(
    accessTokenPayload,
    jwtConfig.expiresIn,
    jwtConfig.secret
  );
  const refreshToken = generateToken(
    refreshTokenPayload,
    jwtConfig.refreshExpiresIn,
    jwtConfig.refreshSecret
  );

  return {
    accessToken,
    refreshToken,
  };
};

export { generateToken, verifyToken, generateAuthTokens };
