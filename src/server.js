// src/server.js
import app from './app.js';
import serverConfig from './config/server.config.js';
import logger from './utils/logger.util.js';
import { getPool, closePool } from './utils/database.js'; // Đảm bảo getPool được gọi để khởi tạo pool

let server;

// Khởi tạo pool CSDL khi server bắt đầu
getPool()
  .then((pool) => {
    if (!pool) {
      logger.error('Failed to connect to the database. Server not started.');
      process.exit(1); // Thoát nếu không kết nối được CSDL
    }

    server = app.listen(serverConfig.port, () => {
      logger.info(`Server is running on port ${serverConfig.port}`);
      logger.info(`Environment: ${serverConfig.env}`);
    });
  })
  .catch((err) => {
    logger.error(
      'Failed to initialize database pool during server startup:',
      err
    );
    process.exit(1);
  });

const exitHandler = async () => {
  await closePool(); // Đóng pool CSDL trước khi thoát
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0); // Thoát thành công
    });
  } else {
    process.exit(0); // Thoát nếu server chưa khởi động
  }
};

const unexpectedErrorHandler = async (error) => {
  logger.error('UNEXPECTED ERROR:', error);
  await exitHandler(); // Cố gắng đóng pool và server
  // process.exit(1); // Comment lại để tránh thoát đột ngột trong dev, nhưng nên có cho production
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
