// src/app.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import httpStatus from './constants/httpStatus.js';
import ApiError from './utils/ApiError.util.js';
import {
  errorConverter,
  errorHandler,
} from './middlewares/error.middleware.js';
import requestLoggerMiddleware from './middlewares/requestLogger.middleware.js';
import apiV1Routes from './modules/index.route.js';

dotenv.config();
const app = express();

/**
 * Khởi tạo và cấu hình các middleware cho ứng dụng Express.
 * Đầu vào: không
 * Đầu ra: app (Express instance)
 */

// Set security HTTP headers
app.use(helmet());

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Enable cors
const corsOptions = {
  origin: 'http://localhost:8083',
  credentials: true,
};
app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));

// Middleware log request
app.use(requestLoggerMiddleware);

// Định tuyến API
app.use('/v1', apiV1Routes);

// Xử lý route không tồn tại
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// Chuyển đổi lỗi về ApiError nếu cần
app.use(errorConverter);

// Xử lý lỗi chung
app.use(errorHandler);

export default app;
