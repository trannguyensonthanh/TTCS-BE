// src/server.js
import app from './app.js';
import serverConfig from './config/server.config.js';
import logger from './utils/logger.util.js';
import { getPool, closePool } from './utils/database.js'; // Đảm bảo getPool được gọi để khởi tạo pool
import { startScheduledJobs } from './jobs/eventStatusManager.job.js';

let server;

/**
 * Khởi tạo pool kết nối CSDL và khởi động server.
 * Đầu vào: không
 * Đầu ra: server Express chạy trên cổng cấu hình
 */
getPool()
  .then((pool) => {
    if (!pool) {
      logger.error('Failed to connect to the database. Server not started.');
      process.exit(1);
    }
    server = app.listen(serverConfig.port, () => {
      logger.info(`Server is running on port ${serverConfig.port}`);
      logger.info(`Environment: ${serverConfig.env}`);
      startScheduledJobs();
    });
  })
  .catch((err) => {
    logger.error(
      'Failed to initialize database pool during server startup:',
      err
    );
    process.exit(1);
  });

/**
 * Đóng pool CSDL và server khi thoát ứng dụng.
 * Đầu vào: không
 * Đầu ra: không
 */
const exitHandler = async () => {
  await closePool();
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

/**
 * Xử lý các lỗi không mong muốn (uncaughtException, unhandledRejection).
 * Đầu vào: error (object)
 * Đầu ra: không
 */
const unexpectedErrorHandler = async (error) => {
  logger.error('UNEXPECTED ERROR:', error);
  await exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  await exitHandler();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received (Ctrl+C)');
  await exitHandler();
});
