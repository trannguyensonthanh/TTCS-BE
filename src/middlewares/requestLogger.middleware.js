// src/middlewares/requestLogger.middleware.js
import logger from '../utils/logger.util.js';

const requestLoggerMiddleware = (req, res, next) => {
  logger.info(`[REQUEST] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  // Bạn có thể log thêm req.body, req.query nếu cần (cẩn thận với thông tin nhạy cảm)
  next();
};

export default requestLoggerMiddleware;
