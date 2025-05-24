// src/utils/logger.util.js
import serverConfig from '../config/server.config.js';

const logger = {
  info: (message, ...args) => {
    console.log(`[INFO] ${new Date().toISOString()}:`, message, ...args);
  },
  error: (message, ...args) => {
    console.error(`[ERROR] ${new Date().toISOString()}:`, message, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] ${new Date().toISOString()}:`, message, ...args);
  },
  debug: (message, ...args) => {
    if (serverConfig.env === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()}:`, message, ...args);
    }
  },
};

export default logger;
