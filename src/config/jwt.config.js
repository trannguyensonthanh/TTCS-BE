// src/config/jwt.config.js
import dotenv from 'dotenv';
dotenv.config();

const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '1d', // Ví dụ: 1 ngày
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // Ví dụ: 7 ngày
};

if (!jwtConfig.secret || !jwtConfig.refreshSecret) {
  throw new Error(
    'JWT_SECRET and JWT_REFRESH_SECRET must be defined in .env file'
  );
}

export default jwtConfig;
