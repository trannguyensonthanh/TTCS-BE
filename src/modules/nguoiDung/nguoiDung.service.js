// src/modules/nguoiDung/nguoiDung.service.js
import { nguoiDungRepository } from './nguoiDung.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';

/**
 * Lấy danh sách người dùng với phân trang và bộ lọc
 * @param {object} params - Các tham số filter và pagination từ GetNguoiDungsParams (FE)
 * @returns {Promise<PaginatedNguoiDungResponse>}
 */
const getNguoiDungs = async (params) => {
  // Repository sẽ xử lý logic filter phức tạp (maVaiTro, donViID)
  const { items, totalItems } =
    await nguoiDungRepository.getAllNguoiDungWithPagination(params);

  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 20; // Hoặc giá trị default từ validation
  const totalPages = Math.ceil(totalItems / limit);

  // Đảm bảo items trả về đúng định dạng NguoiDungResponseMin
  const formattedItems = items.map((user) => ({
    nguoiDungID: user.NguoiDungID,
    hoTen: user.HoTen,
    email: user.Email,
    // maDinhDanh: user.MaDinhDanh, // Tùy chọn, nếu frontend cần
    // anhDaiDien: user.AnhDaiDien, // Tùy chọn
  }));

  return {
    items: formattedItems,
    totalPages,
    currentPage: page,
    totalItems,
    pageSize: limit,
  };
};

// Các service khác cho module nguoiDung (ví dụ: tạo người dùng, lấy chi tiết, cập nhật, xóa)
// có thể được thêm vào đây sau này.
// Ví dụ:
// const getNguoiDungById = async (nguoiDungId) => {
//   const user = await nguoiDungRepository.findNguoiDungById(nguoiDungId);
//   if (!user) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Người dùng không tồn tại');
//   }
//   // Lấy thêm thông tin vai trò, thông tin SV/GV nếu cần
//   return user; // Cần định dạng lại theo NguoiDungDetailResponse
// };

export const nguoiDungService = {
  getNguoiDungs,
  // getNguoiDungById,
};
