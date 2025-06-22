import { format } from 'date-fns';

/**
 * [MỚI] Chuyển đổi một đối tượng Date sang chuỗi ISO 8601 đúng múi giờ Việt Nam (UTC+7).
 * Nếu date là UTC, cần TRỪ đi 7 tiếng để trả về đúng giờ local Việt Nam.
 * @param {Date} date - Đối tượng Date cần định dạng.
 * @returns {string|null} Chuỗi thời gian định dạng 'yyyy-MM-dd'T'HH:mm:ss.SSS' hoặc null.
 */
export const formatToLocalISOString = (date) => {
  if (!date || !(date instanceof Date)) {
    return null;
  }
  // Trừ đi 7 tiếng (UTC+7) để trả về đúng giờ Việt Nam
  const localDate = new Date(date.getTime() - 7 * 60 * 60 * 1000);
  return format(localDate, "yyyy-MM-dd'T'HH:mm:ss.SSS");
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
