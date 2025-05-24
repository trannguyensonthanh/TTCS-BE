// src/modules/phong/phong.controller.js (Hoặc tên file controller của bạn)

import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';
import { phongService } from './phongForSelect.service.js';

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
  // Hoặc tên export của bạn
  getPhongsForSelectController,
  // ... các controller khác
};
