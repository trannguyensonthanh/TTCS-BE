// src/utils/cloudinary.helper.js
import cloudinary from '../config/cloudinary.config.js';

/**
 * Upload một file lên Cloudinary.
 * Đầu vào: filePath (string - đường dẫn file local), options (object - các tùy chọn upload)
 * Đầu ra: Promise<object> - Kết quả trả về từ Cloudinary
 */
const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'uploads',
      resource_type: 'auto',
      ...options,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Xóa một file khỏi Cloudinary dựa trên public_id.
 * Đầu vào: publicId (string - public_id trên Cloudinary), options (object - tùy chọn xóa)
 * Đầu ra: Promise<object> - Kết quả trả về từ Cloudinary
 */
const deleteFromCloudinary = async (publicId, options = {}) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'auto',
      ...options,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Lấy URL đã được tối ưu hóa và có thể có chữ ký từ Cloudinary.
 * Đầu vào: publicId (string - public_id trên Cloudinary), options (object - các tùy chọn transformation)
 * Đầu ra: string - URL của file trên Cloudinary
 */
const getCloudinaryUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, options);
};

export { uploadToCloudinary, deleteFromCloudinary, getCloudinaryUrl };
