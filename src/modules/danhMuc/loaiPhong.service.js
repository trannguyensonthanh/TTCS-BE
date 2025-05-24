// src/modules/phong/loaiPhong.service.js
import { loaiPhongRepository } from './loaiPhong.repository.js';

const getLoaiPhongs = async (params) => {
  const { items, totalItems } =
    await loaiPhongRepository.getAllLoaiPhong(params);
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 100;
  const totalPages = Math.ceil(totalItems / limit);
  return { items, totalPages, currentPage: page, totalItems, pageSize: limit };
};

export const loaiPhongService = {
  getLoaiPhongs,
};
