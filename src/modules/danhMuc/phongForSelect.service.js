// src/modules/phong/phong.service.js

import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';
import { phongRepository } from './phongForSelect.repository.js';

/**
 * Lấy danh sách phòng để chọn theo các tiêu chí lọc, kiểm tra phòng trống nếu có thời gian.
 * @param {object} params - Tham số lọc, phân trang, kiểm tra phòng trống (searchTerm, loaiPhongID, sucChuaToiThieu, thoiGianMuon, thoiGianTra, trangThaiPhongMa, page, limit, sortBy, sortOrder)
 * @returns {Promise<Array<object>>} Danh sách phòng phù hợp
 */
const getPhongsForSelect = async (params) => {
  if (params.thoiGianMuon && !params.thoiGianTra) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Cần cung cấp cả thời gian mượn và thời gian trả để kiểm tra phòng trống.'
    );
  }
  if (!params.thoiGianMuon && params.thoiGianTra) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Cần cung cấp cả thời gian mượn và thời gian trả để kiểm tra phòng trống.'
    );
  }
  if (
    params.thoiGianMuon &&
    params.thoiGianTra &&
    new Date(params.thoiGianTra) <= new Date(params.thoiGianMuon)
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Thời gian trả phải sau thời gian mượn.'
    );
  }

  const { items, totalItems } = await phongRepository.getPhongForSelect(params);
  const page = parseInt(params.page, 10) || 1;
  const limit = parseInt(params.limit, 10) || 50;
  const totalPages = Math.ceil(totalItems / limit);
  console.log('ccccccccccccccccccc', items);
  return items;
};

export const phongService = {
  getPhongsForSelect,
};
