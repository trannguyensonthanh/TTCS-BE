// src/middlewares/error.middleware.js
import httpStatus from '../constants/httpStatus.js';
import logger from '../utils/logger.util.js';
import ApiError from '../utils/ApiError.util.js';
import serverConfig from '../config/server.config.js';

/**
 * Chuyển đổi lỗi thường về ApiError nếu chưa phải, để chuẩn hóa xử lý lỗi.
 * Đầu vào: err (Error), req, res, next
 * Đầu ra: gọi next(error) với error là ApiError
 */
const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || httpStatus[statusCode];
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

/**
 * Middleware xử lý lỗi chung cho toàn bộ ứng dụng.
 * Đầu vào: err (Error), req, res, next
 * Đầu ra: trả về response lỗi chuẩn hóa cho client
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  if (serverConfig.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }

  res.locals.errorMessage = err.message;

  const response = {
    success: false,
    code: statusCode,
    message,
    ...(serverConfig.env === 'development' && { stack: err.stack }),
  };

  if (serverConfig.env === 'development') {
    logger.error(err.stack);
  } else {
    logger.error(err.message);
  }

  res.status(statusCode).send(response);
};

export { errorConverter, errorHandler };
