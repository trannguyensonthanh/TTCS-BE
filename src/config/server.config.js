// src/config/server.config.js
import dotenv from 'dotenv';
dotenv.config();

const serverConfig = {
  port: parseInt(process.env.PORT || '3000'),
  env: process.env.NODE_ENV || 'development',
};

export default serverConfig;
