// src/modules/chiTietSuDungPhong/chiTietSuDungPhong.service.js
import { chiTietSuDungPhongRepository } from './chiTietSuDungPhong.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
// import MaVaiTro from '../../enums/maVaiTro.enum.js';
// import { authRepository } from '../auth/auth.repository.js';

/**
 * Lấy danh sách các phòng đã đặt đang hoạt động mà người dùng có thể yêu cầu đổi.
 * @param {object} queryParams - { nguoiYeuCauID (optional, for admin), limit }
 * @param {object} currentUser - Thông tin người dùng thực hiện
 * @returns {Promise<ChiTietDatPhongForSelect[]>}
 */
const getMyActiveBookedRoomsForChange = async (queryParams, currentUser) => {
  let effectiveNguoiYeuCauID = currentUser.nguoiDungID;

  // Nếu là admin và có truyền nguoiYeuCauID thì dùng theo param (cho mục đích debug/quản trị)
  // const userRoles = await authRepository.getVaiTroChucNangByNguoiDungID(currentUser.nguoiDungID);
  // const isAdmin = userRoles.some(role => role.maVaiTro === MaVaiTro.ADMIN_HE_THONG);
  // if (isAdmin && queryParams.nguoiYeuCauID) {
  //   effectiveNguoiYeuCauID = queryParams.nguoiYeuCauID;
  // } else if (!isAdmin && queryParams.nguoiYeuCauID && queryParams.nguoiYeuCauID !== currentUser.nguoiDungID) {
  //   throw new ApiError(httpStatus.FORBIDDEN, "Bạn không có quyền xem danh sách này của người dùng khác.");
  // }
  // Tạm thời, API này chỉ trả về cho chính người dùng đang đăng nhập.

  const paramsForRepo = {
    nguoiYeuCauID: effectiveNguoiYeuCauID,
    limit: queryParams.limit,
  };

  const items =
    await chiTietSuDungPhongRepository.getActiveBookedRoomsForChange(
      paramsForRepo
    );
  return items; // Trả về mảng trực tiếp theo yêu cầu FE
};

export const chiTietSuDungPhongService = {
  getMyActiveBookedRoomsForChange,
};
