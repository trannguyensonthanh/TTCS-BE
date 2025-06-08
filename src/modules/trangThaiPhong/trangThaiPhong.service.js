// src/modules/danhMuc/trangThaiPhong.service.js
import { trangThaiPhongRepository } from './trangThaiPhong.repository.js';

/**
 * Lấy danh sách trạng thái phòng.
 * @param {Object} params - Tham số truy vấn (limit).
 * @returns {Promise<Array>} Danh sách trạng thái phòng.
 */
const getTrangThaiPhongs = async (params) => {
  const items = await trangThaiPhongRepository.getAllTrangThaiPhong(params);
  return items;
};

export const trangThaiPhongService = {
  getTrangThaiPhongs,
};
