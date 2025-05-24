// src/utils/password.util.js
import bcrypt from 'bcryptjs'; // Cần cài đặt: npm install bcryptjs

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

export { hashPassword, comparePassword };
