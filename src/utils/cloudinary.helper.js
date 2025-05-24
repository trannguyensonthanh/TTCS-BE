// src/utils/cloudinary.helper.js
import cloudinary from '../config/cloudinary.config.js';

/**
 * Upload một file lên Cloudinary.
 * Hàm này hữu ích nếu bạn không dùng multer-storage-cloudinary hoặc muốn tùy chỉnh sâu hơn.
 * Với multer-storage-cloudinary, việc upload thường được xử lý tự động.
 * @param {string} filePath Đường dẫn đến file local cần upload.
 * @param {object} options Các tùy chọn cho Cloudinary (ví dụ: public_id, folder, resource_type).
 * @returns {Promise<object>} Kết quả từ Cloudinary.
 */
const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'uploads', // Thư mục mặc định
      resource_type: 'auto', // Tự động nhận diện loại file (image, video, raw)
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
 * @param {string} publicId Public ID của file trên Cloudinary.
 * @param {object} options Các tùy chọn cho việc xóa (ví dụ: resource_type, invalidate).
 * @returns {Promise<object>} Kết quả từ Cloudinary.
 */
const deleteFromCloudinary = async (publicId, options = {}) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'auto', // Hoặc chỉ định cụ thể nếu biết 'image', 'video', 'raw'
      ...options,
    });
    return result; // result sẽ là { result: 'ok' } nếu thành công
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Lấy URL đã được tối ưu hóa và có chữ ký (nếu cần) từ Cloudinary.
 * @param {string} publicId Public ID của file.
 * @param {object} options Các tùy chọn transformation (width, height, crop, quality, format, etc.).
 * @returns {string} URL của ảnh/video.
 */
const getCloudinaryUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, options);
};

export { uploadToCloudinary, deleteFromCloudinary, getCloudinaryUrl };
