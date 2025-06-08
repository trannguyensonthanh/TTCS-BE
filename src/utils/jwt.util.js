// src/utils/jwt.util.js
import jwt from 'jsonwebtoken';
import jwtConfig from '../config/jwt.config.js';

/**
 * Sinh ra một JWT token.
 * Đầu vào: payload (object), expiresIn (string, optional), secret (string, optional)
 * Đầu ra: string - JWT token
 */
const generateToken = (
  payload,
  expiresIn = jwtConfig.expiresIn,
  secret = jwtConfig.secret
) => {
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Xác thực và giải mã một JWT token.
 * Đầu vào: token (string), secret (string, optional)
 * Đầu ra: object payload nếu hợp lệ, null nếu không hợp lệ
 */
const verifyToken = (token, secret = jwtConfig.secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};

/**
 * Sinh ra accessToken và refreshToken cho user.
 * Đầu vào: user (object)
 * Đầu ra: object { accessToken, refreshToken }
 */
const generateAuthTokens = (user) => {
  const accessTokenPayload = {
    sub: user.NguoiDungID,
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
