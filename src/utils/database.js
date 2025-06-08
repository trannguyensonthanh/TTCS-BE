// src/utils/database.js
import sql from 'mssql';
import sqlConfig from '../config/db.config.js';

let pool = null;

/**
 * Lấy hoặc tạo pool kết nối database (singleton).
 * Đầu vào: không
 * Đầu ra: Promise<sql.ConnectionPool> hoặc null nếu lỗi
 */
const getPool = async () => {
  if (pool) {
    return pool;
  }
  try {
    pool = new sql.ConnectionPool(sqlConfig);
    await pool.connect();
    console.log('Database connection pool created and connected successfully.');

    pool.on('error', (err) => {
      console.error('Database pool error:', err);
      pool = null; // Reset pool để lần gọi getPool tiếp theo sẽ thử tạo lại
    });

    return pool;
  } catch (err) {
    console.error('Database connection failed:', err);
    pool = null; // Reset pool nếu kết nối thất bại
    return null; // Hoặc trả về null và xử lý ở nơi gọi
  }
};

/**
 * Thực thi một truy vấn SQL với tham số truyền vào.
 * Đầu vào: query (string), params (array các object {name, type, value})
 * Đầu ra: Promise<object> kết quả truy vấn
 */
const executeQuery = async (query, params = []) => {
  const pool = await getPool();
  if (!pool) {
    throw new Error('Database connection not available.');
  }
  const request = pool.request();
  if (params && params.length > 0) {
    params.forEach((param) => {
      request.input(param.name, param.type, param.value);
    });
  }
  try {
    const result = await request.query(query);
    return result;
  } catch (error) {
    console.error(
      'SQL error:',
      error.message,
      'Query:',
      query,
      'Params:',
      params
    );
    throw error; // Re-throw lỗi để service/controller có thể bắt và xử lý
  }
};

/**
 * Đóng pool kết nối database nếu có.
 * Đầu vào: không
 * Đầu ra: Promise<void>
 */
const closePool = async () => {
  if (pool) {
    try {
      await pool.close();
      console.log('Database connection pool closed.');
      pool = null;
    } catch (err) {
      console.error('Error closing database pool:', err);
      pool = null;
    }
  }
};

export { getPool, executeQuery, closePool };
