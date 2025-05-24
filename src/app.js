// src/app.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // Cần cài đặt: npm install cors
// import helmet from 'helmet'; // Cần cài đặt: npm install helmet (Tăng cường bảo mật)
// import morgan from 'morgan'; // Cần cài đặt: npm install morgan (HTTP request logger)
import httpStatus from './constants/httpStatus.js';
import serverConfig from './config/server.config.js';
import ApiError from './utils/ApiError.util.js';
import {
  errorConverter,
  errorHandler,
} from './middlewares/error.middleware.js'; // Bạn sẽ tạo file này
import requestLoggerMiddleware from './middlewares/requestLogger.middleware.js'; // Bạn sẽ tạo file này
import apiV1Routes from './modules/index.route.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
dotenv.config();
const app = express();

// Set security HTTP headers (nếu dùng helmet)
app.use(helmet());

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Enable cors
const corsOptions = {
  origin: 'http://localhost:8083', // Replace with your frontend's URL
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
};
app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions)); // Cho phép pre-flight requests

// HTTP request logging (nếu dùng morgan)
// if (serverConfig.env !== 'test') {
//   app.use(morgan(serverConfig.env === 'development' ? 'dev' : 'combined'));
// }
app.use(requestLoggerMiddleware); // Hoặc logger tùy chỉnh của bạn

// API Routes - Sẽ thêm sau khi có các module
app.use('/v1', apiV1Routes);

// Send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// Convert error to ApiError, if it's not an instance of ApiError
app.use(errorConverter);

// Handle error
app.use(errorHandler);

export default app;
