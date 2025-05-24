// src/modules/phong/loaiPhong.controller.js
import { loaiPhongService } from './loaiPhong.service.js';
import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

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
  okResponse(res, result, 'Lấy danh sách loại phòng thành công.');
};

export const loaiPhongController = {
  getLoaiPhongsController,
};
