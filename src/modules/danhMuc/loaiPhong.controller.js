// src/modules/phong/loaiPhong.controller.js
import { loaiPhongService } from './loaiPhong.service.js';
import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Lấy danh sách loại phòng.
 * @param {import('express').Request} req - Request object, chứa query filter
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với danh sách loại phòng
 */
const getLoaiPhongsController = async (req, res) => {
  const params = pick(req.query, [
    'isActive',
    'searchTerm',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await loaiPhongService.getLoaiPhongs(params);
  okResponse(res, result.items, 'Lấy danh sách loại phòng thành công.');
};

export const loaiPhongController = {
  getLoaiPhongsController,
};
