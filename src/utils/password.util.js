// src/utils/password.util.js
import bcrypt from 'bcryptjs';

/**
 * Băm mật khẩu sử dụng bcrypt.
 * Đầu vào: password (string)
 * Đầu ra: Promise<string> - mật khẩu đã được băm
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * So sánh mật khẩu thường với mật khẩu đã băm.
 * Đầu vào: password (string), hashedPassword (string)
 * Đầu ra: Promise<boolean> - true nếu khớp, false nếu không
 */
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

export { hashPassword, comparePassword };
