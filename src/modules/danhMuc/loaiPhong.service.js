// src/modules/phong/loaiPhong.service.js
import { loaiPhongRepository } from './loaiPhong.repository.js';

/**
 * Lấy danh sách loại phòng với phân trang, tìm kiếm, sắp xếp.
 * @param {object} params - Tham số lọc, phân trang, sắp xếp ({searchTerm, page, limit, sortBy, sortOrder})
 * @returns {Promise<{items: Array<object>}>} Danh sách loại phòng
 */
const getLoaiPhongs = async (params) => {
  const { items, totalItems } =
    await loaiPhongRepository.getAllLoaiPhong(params);
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 100;
  const totalPages = Math.ceil(totalItems / limit);
  return {
    items,
  };
};

export const loaiPhongService = {
  getLoaiPhongs,
};
