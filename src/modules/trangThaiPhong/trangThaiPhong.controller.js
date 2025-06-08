// src/modules/danhMuc/trangThaiPhong.controller.js
import { trangThaiPhongService } from './trangThaiPhong.service.js';
import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Lấy danh sách trạng thái phòng.
 * @param {Object} req - Request Express, có thể chứa query.limit để giới hạn số lượng.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response danh sách trạng thái phòng.
 */
const getTrangThaiPhongListController = async (req, res) => {
  const params = pick(req.query, ['limit']);
  const result = await trangThaiPhongService.getTrangThaiPhongs(params);
  okResponse(res, result, 'Lấy danh sách trạng thái phòng thành công.');
};

export const trangThaiPhongController = {
  getTrangThaiPhongListController,
};
