// src/modules/chiTietSuDungPhong/chiTietSuDungPhong.controller.js
import { chiTietSuDungPhongService } from './chiTietSuDungPhong.service.js';
import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Lấy danh sách các phòng đã đặt còn hiệu lực của người dùng hiện tại để phục vụ đổi phòng.
 * @param {import('express').Request} req - Đối tượng request, chứa query và user
 * @param {import('express').Response} res - Đối tượng response
 * @returns {Promise<void>} Trả về response chứa danh sách phòng có thể đổi
 */
const getMyActiveBookedRoomsController = async (req, res) => {
  const queryParams = pick(req.query, ['nguoiYeuCauID', 'limit']);
  const currentUser = req.user;

  const result =
    await chiTietSuDungPhongService.getMyActiveBookedRoomsForChange(
      queryParams,
      currentUser
    );
  okResponse(res, result, 'Lấy danh sách phòng có thể đổi thành công.');
};

export const chiTietSuDungPhongController = {
  getMyActiveBookedRoomsController,
};
