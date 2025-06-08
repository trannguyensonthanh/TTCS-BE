// src/middlewares/requestLogger.middleware.js
import logger from '../utils/logger.util.js';

/**
 * Middleware log thông tin request đến server.
 * Đầu vào: req, res, next
 * Đầu ra: gọi next() để tiếp tục middleware chain
 */
const requestLoggerMiddleware = (req, res, next) => {
  logger.info(`[REQUEST] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
};

export default requestLoggerMiddleware;
