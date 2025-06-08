// src/utils/logger.util.js
import serverConfig from '../config/server.config.js';

/**
 * Ghi log thông tin mức INFO.
 * Đầu vào: message (string), ...args (các tham số bổ sung)
 * Đầu ra: không
 */
const logger = {
  info: (message, ...args) => {
    console.log(`[INFO] ${new Date().toISOString()}:`, message, ...args);
  },
  /**
   * Ghi log thông tin mức ERROR.
   * Đầu vào: message (string), ...args (các tham số bổ sung)
   * Đầu ra: không
   */
  error: (message, ...args) => {
    console.error(`[ERROR] ${new Date().toISOString()}:`, message, ...args);
  },
  /**
   * Ghi log thông tin mức WARN.
   * Đầu vào: message (string), ...args (các tham số bổ sung)
   * Đầu ra: không
   */
  warn: (message, ...args) => {
    console.warn(`[WARN] ${new Date().toISOString()}:`, message, ...args);
  },
  /**
   * Ghi log thông tin mức DEBUG (chỉ hiển thị ở môi trường development).
   * Đầu vào: message (string), ...args (các tham số bổ sung)
   * Đầu ra: không
   */
  debug: (message, ...args) => {
    if (serverConfig.env === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()}:`, message, ...args);
    }
  },
};

export default logger;
