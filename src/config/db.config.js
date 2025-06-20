// src/config/db.config.js
import dotenv from 'dotenv';

dotenv.config();

/**
 * Cấu hình kết nối cơ sở dữ liệu SQL Server từ biến môi trường.
 * Đầu vào: không
 * Đầu ra: object cấu hình sqlConfig
 */
const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '0', 10),
    idleTimeoutMillis: parseInt(
      process.env.DB_POOL_IDLE_TIMEOUT || '30000',
      10
    ),
  },
};

export default sqlConfig;
