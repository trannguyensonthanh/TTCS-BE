import { format } from 'date-fns';

/**
 * [MỚI] Chuyển đổi một đối tượng Date sang chuỗi ISO 8601 mà KHÔNG thay đổi múi giờ.
 * Hàm này rất quan trọng để đảm bảo thời gian trả về cho frontend đúng với giờ Việt Nam.
 * @param {Date} date - Đối tượng Date cần định dạng.
 * @returns {string|null} Chuỗi thời gian định dạng 'yyyy-MM-dd'T'HH:mm:ss.SSS' hoặc null.
 */
export const formatToLocalISOString = (date) => {
  if (!date || !(date instanceof Date)) {
    return null;
  }
  // Sử dụng date-fns để định dạng, 'T' là ký tự phân cách đúng chuẩn ISO
  return format(date, "yyyy-MM-dd'T'HH:mm:ss.SSS");
};

/**
 * [MỚI] Chuyển đổi một đối tượng Date sang chuỗi ngày YYYY-MM-DD.
 * @param {Date} date - Đối tượng Date cần định dạng.
 * @returns {string|null} Chuỗi ngày hoặc null.
 */
export const formatToDateString = (date) => {
  if (!date || !(date instanceof Date)) {
    return null;
  }
  return format(date, 'yyyy-MM-dd');
};
