// src/middlewares/error.middleware.js
import httpStatus from '../constants/httpStatus.js';
import logger from '../utils/logger.util.js';
import ApiError from '../utils/ApiError.util.js';
import serverConfig from '../config/server.config.js';

const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || httpStatus[statusCode];
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

// eslint-disable-next-line no-unused-vars
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
    ...(serverConfig.env === 'development' && { stack: err.stack }), // Chỉ gửi stack trace ở môi trường dev
  };

  if (serverConfig.env === 'development') {
    logger.error(err.stack);
  } else {
    logger.error(err.message);
  }

  res.status(statusCode).send(response);
};

export { errorConverter, errorHandler };
