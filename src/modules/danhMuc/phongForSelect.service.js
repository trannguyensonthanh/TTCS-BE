// src/modules/phong/phong.service.js (Hoặc tên file service của bạn)

import { phongRepository } from './phongForSelect.repository.js';

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
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 50;
  const totalPages = Math.ceil(totalItems / limit);
  return { items, totalPages, currentPage: page, totalItems, pageSize: limit };
};

export const phongService = {
  // Hoặc tên export của bạn
  getPhongsForSelect,
  // ... các service khác cho phòng
};
