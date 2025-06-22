// // src/utils/timezone.util.js
// import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';
// import { utcToZonedTime } from 'date-fns-tz/utcToZonedTime'; // <<<< SỬA LỖI IMPORT Ở ĐÂY
// import { format } from 'date-fns'; // Import format từ date-fns

// const vietnamTimeZone = 'Asia/Ho_Chi_Minh';

// /**
//  * [HÀM QUAN TRỌNG] Chuyển đổi một đối tượng Date hoặc một chuỗi thời gian bất kỳ
//  * (được khuyến khích là ISO 8601) thành một đối tượng Date mới đại diện cho thời điểm đó ở múi giờ Việt Nam.
//  *
//  * Hàm này dùng để nhận dữ liệu từ client và chuẩn bị để gửi vào CSDL.
//  * @param {Date | string | number} dateInput - Thời gian đầu vào.
//  * @returns {Date | null} Một đối tượng Date mới, sẵn sàng để truyền vào thư viện mssql.
//  */
// export function convertToVietnamTime(dateInput) {
//   if (!dateInput) return null;
//   try {
//     // Biến đổi đầu vào thành một đối tượng Date mà khi .toString() sẽ ra giờ Việt Nam
//     const zonedDate = utcToZonedTime(dateInput, vietnamTimeZone);
//     return zonedDate;
//   } catch (error) {
//     console.error(
//       'Invalid date input for timezone conversion:',
//       dateInput,
//       error
//     );
//     return null;
//   }
// }

// /**
//  * Định dạng một đối tượng Date (hoặc chuỗi ISO) thành một chuỗi ngày giờ theo chuẩn Việt Nam.
//  * Dùng để hiển thị hoặc debug.
//  * @param {Date | string | number} dateInput - Thời gian đầu vào.
//  * @returns {string} Chuỗi định dạng 'dd/MM/yyyy HH:mm:ss'.
//  */
// export function formatToVietnamString(dateInput) {
//   if (!dateInput) return '';
//   try {
//     // Sử dụng formatInTimeZone để đảm bảo định dạng đúng theo múi giờ Việt Nam
//     return formatInTimeZone(dateInput, vietnamTimeZone, 'dd/MM/yyyy HH:mm:ss');
//   } catch (error) {
//     return 'Invalid Date';
//   }
// }

// /**
//  * Định dạng một đối tượng Date (hoặc chuỗi ISO) thành một chuỗi yyyy-MM-dd HH:mm:ss
//  * Dùng để lưu vào CSDL nếu CSDL không xử lý tốt đối tượng Date trực tiếp.
//  * Đây là một giải pháp dự phòng an toàn.
//  * @param {Date | string | number} dateInput - Thời gian đầu vào.
//  * @returns {string | null}
//  */
// export function formatForDB(dateInput) {
//   if (!dateInput) return null;
//   try {
//     // Chuyển về giờ VN rồi format
//     const zonedDate = utcToZonedTime(dateInput, vietnamTimeZone);
//     return format(zonedDate, 'yyyy-MM-dd HH:mm:ss.SSS'); // Thêm SSS để có độ chính xác mili giây
//   } catch (error) {
//     return null;
//   }
// }

// /**
//  * Lấy thời gian hiện tại ở Việt Nam.
//  * @returns {Date} Đối tượng Date đại diện cho thời gian hiện tại ở Việt Nam.
//  */
// export function getCurrentVietnamTime() {
//   return utcToZonedTime(new Date(), vietnamTimeZone);
// }
