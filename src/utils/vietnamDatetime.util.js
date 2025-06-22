import { format } from 'date-fns';

/**
 * Chuyển đối tượng Date hoặc chuỗi ISO sang string giờ Việt Nam (UTC+7) để lưu vào DB.
 * @param {Date|string} date - Đối tượng Date hoặc chuỗi ISO.
 * @returns {string|null} Chuỗi 'yyyy-MM-dd HH:mm:ss' hoặc null.
 */
export function toVietnamDatetimeString(date) {
  if (!date) return null;
  let d = date;
  if (typeof date === 'string') d = new Date(date);
  if (!(d instanceof Date) || Number.isNaN(d)) return null;
  // Nếu date là UTC, cộng 7 tiếng để ra giờ Việt Nam
  const vietnamDate = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return format(vietnamDate, 'yyyy-MM-dd HH:mm:ss');
}
