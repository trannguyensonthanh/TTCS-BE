// src/modules/chiTietSuDungPhong/chiTietSuDungPhong.controller.js
import { chiTietSuDungPhongService } from './chiTietSuDungPhong.service.js';
import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

const getMyActiveBookedRoomsController = async (req, res) => {
  const queryParams = pick(req.query, ['nguoiYeuCauID', 'limit']);
  const currentUser = req.user; // Từ authMiddleware

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
