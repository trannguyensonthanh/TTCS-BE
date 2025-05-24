// src/utils/database.js
import sql from 'mssql';
import sqlConfig from '../config/db.config.js';

let pool = null;

const getPool = async () => {
  if (pool) {
    // console.log('Returning existing pool');
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

// Hàm tiện ích để thực thi query
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

// Đảm bảo đóng pool khi ứng dụng tắt (ví dụ khi nhận SIGINT)
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

// Lắng nghe sự kiện tắt ứng dụng để đóng pool
// process.on('SIGINT', closePool).on('SIGTERM', closePool);

export { getPool, executeQuery, closePool };
