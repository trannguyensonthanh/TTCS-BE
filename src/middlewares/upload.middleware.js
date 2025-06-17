// src/middlewares/upload.middleware.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import ApiError from '../utils/ApiError.util.js';
import httpStatus from '../constants/httpStatus.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cấu hình nơi lưu trữ file tạm thời hoặc dùng memoryStorage
// const storage = multer.memoryStorage(); // Lưu file vào bộ nhớ, phù hợp cho file nhỏ

// Hoặc lưu vào disk:
const UPLOAD_DIR = path.join(__dirname, '../../uploads/temp_excel'); // Tạo thư mục này nếu chưa có
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // Đảm bảo tên file là duy nhất để tránh ghi đè
    cb(
      null,
      file.fieldname + '-' + Date.now() + path.extname(file.originalname)
    );
  },
});

const excelFileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(xlsx|xls)$/)) {
    // Chỉ chấp nhận file Excel
    return cb(
      new ApiError(
        httpStatus.BAD_REQUEST,
        'Chỉ chấp nhận file Excel (.xlsx, .xls)!'
      ),
      false
    );
  }
  cb(null, true);
};

const uploadExcel = multer({
  storage: diskStorage, // Hoặc memoryStorage
  fileFilter: excelFileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5, // Giới hạn kích thước file 5MB
  },
});

export default uploadExcel;
