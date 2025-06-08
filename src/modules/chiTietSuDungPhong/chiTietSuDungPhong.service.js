// src/modules/chiTietSuDungPhong/chiTietSuDungPhong.service.js
import { chiTietSuDungPhongRepository } from './chiTietSuDungPhong.repository.js';
import logger from '../../utils/logger.util.js';

/**
 * Lấy danh sách các phòng đã đặt đang hoạt động mà người dùng có thể yêu cầu đổi.
 * @param {object} queryParams - Tham số truy vấn (nguoiYeuCauID optional, limit)
 * @param {object} currentUser - Thông tin người dùng thực hiện
 * @returns {Promise<Array>} Danh sách phòng đã đặt
 */
const getMyActiveBookedRoomsForChange = async (queryParams, currentUser) => {
  let effectiveNguoiYeuCauID = currentUser.nguoiDungID;
  logger.debug(
    `getMyActiveBookedRoomsForChange called by user ${currentUser.nguoiDungID} with params: ${JSON.stringify(queryParams)}`
  );

  const paramsForRepo = {
    nguoiYeuCauID: effectiveNguoiYeuCauID,
    limit: queryParams.limit,
  };

  const items =
    await chiTietSuDungPhongRepository.getActiveBookedRoomsForChange(
      paramsForRepo
    );
  return items;
};

export const chiTietSuDungPhongService = {
  getMyActiveBookedRoomsForChange,
};
