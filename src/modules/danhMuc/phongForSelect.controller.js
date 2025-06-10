// src/modules/phong/phong.controller.js

import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';
import { phongService } from './phongForSelect.service.js';

/**
 * Lấy danh sách phòng để chọn theo các tiêu chí lọc.
 * @param {import('express').Request} req - Request object, chứa query filter
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với danh sách phòng phù hợp
 */
const getPhongsForSelectController = async (req, res) => {
  const params = pick(req.query, [
    'searchTerm',
    'loaiPhongID',
    'sucChuaToiThieu',
    'thoiGianMuon',
    'thoiGianTra',
    'trangThaiPhongMa',
    'page',
    'limit',
  ]);
  const result = await phongService.getPhongsForSelect(params);
  okResponse(res, result, 'Lấy danh sách phòng để chọn thành công.');
};

export const phongForSelectController = {
  getPhongsForSelectController,
};
