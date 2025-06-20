import { suKienRepository } from '../suKien/suKien.repository.js';
import MaTrangThaiSK from '../../enums/maTrangThaiSK.enum.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import { danhGiaSuKienRepository } from './danhGiaSuKien.repository.js';
import logger from '../../utils/logger.util.js';

/**
 * [MỚI] Người dùng gửi đánh giá cho một sự kiện.
 * @param {GuiDanhGiaPayload} payload
 * @param {object} currentUser
 * @returns {Promise<DanhGiaSKResponse>}
 */
const submitEventRating = async (payload, currentUser) => {
  const { suKienID, diemNoiDung, diemToChuc, diemDiaDiem, yKienDongGop } =
    payload;
  const nguoiDanhGiaID = currentUser.nguoiDungID;

  // 1. Kiểm tra người dùng có đủ điều kiện để đánh giá không
  const eligibility = await danhGiaSuKienRepository.checkRatingEligibility(
    suKienID,
    nguoiDanhGiaID
  );
  if (!eligibility) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Bạn không có quyền đánh giá sự kiện này (chưa tham gia hoặc sự kiện chưa kết thúc).'
    );
  }

  // 2. Kiểm tra xem đã đánh giá trước đó chưa
  const alreadyRated = await danhGiaSuKienRepository.checkIfRatingExists(
    suKienID,
    nguoiDanhGiaID
  );
  if (alreadyRated) {
    throw new ApiError(httpStatus.CONFLICT, 'Bạn đã đánh giá sự kiện này rồi.');
  }

  // 3. Tạo bản ghi đánh giá mới
  const newRating = await danhGiaSuKienRepository.createRating({
    suKienID,
    nguoiDanhGiaID,
    diemNoiDung,
    diemToChuc,
    diemDiaDiem,
    yKienDongGop,
  });

  // 4. Map kết quả về đúng định dạng response
  return {
    danhGiaSkID: Number(newRating.DanhGiaSkID),
    suKienID: newRating.SuKienID,
    nguoiDanhGiaID: newRating.NguoiDanhGiaID,
    diemNoiDung: newRating.DiemNoiDung,
    diemToChuc: newRating.DiemToChuc,
    diemDiaDiem: newRating.DiemDiaDiem,
    yKienDongGop: newRating.YKienDongGop,
    tgDanhGia: newRating.TgDanhGia.toISOString(),
  };
};

const RATING_EDIT_TIMEFRAME_HOURS = 24; // Ví dụ: cho phép sửa trong 24 giờ

/**
 * [MỚI] Cập nhật một đánh giá đã có.
 * @param {number} danhGiaSkID
 * @param {CapNhatDanhGiaPayload} payload
 * @param {object} currentUser
 * @returns {Promise<DanhGiaSKResponse>}
 */
const updateEventRating = async (danhGiaSkID, payload, currentUser) => {
  // 1. Lấy đánh giá gốc từ DB
  const existingRating =
    await danhGiaSuKienRepository.getRatingById(danhGiaSkID);
  if (!existingRating) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Không tìm thấy đánh giá này.');
  }

  // 2. Kiểm tra quyền sở hữu
  if (existingRating.NguoiDanhGiaID !== currentUser.nguoiDungID) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Bạn không có quyền sửa đánh giá này.'
    );
  }

  // 3. (Tùy chọn) Kiểm tra thời gian cho phép sửa
  const tgTaoDanhGia = new Date(existingRating.TgDanhGia);
  const tgHienTai = new Date();
  const thoiGianDaTroiMs = tgHienTai.getTime() - tgTaoDanhGia.getTime();
  const thoiGianDaTroiH = thoiGianDaTroiMs / (1000 * 60 * 60);

  if (thoiGianDaTroiH > RATING_EDIT_TIMEFRAME_HOURS) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `Bạn chỉ có thể sửa đánh giá trong vòng ${RATING_EDIT_TIMEFRAME_HOURS} giờ sau khi gửi.`
    );
  }

  // 4. Cập nhật bản ghi
  const updatedRating = await danhGiaSuKienRepository.updateRating(
    danhGiaSkID,
    payload
  );

  // 5. Map kết quả về đúng định dạng
  return {
    danhGiaSkID: Number(updatedRating.DanhGiaSkID),
    suKienID: updatedRating.SuKienID,
    nguoiDanhGiaID: updatedRating.NguoiDanhGiaID,
    diemNoiDung: updatedRating.DiemNoiDung,
    diemToChuc: updatedRating.DiemToChuc,
    diemDiaDiem: updatedRating.DiemDiaDiem,
    yKienDongGop: updatedRating.YKienDongGop,
    tgDanhGia: updatedRating.TgDanhGia.toISOString(),
  };
};

/**
 * [MỚI] Xóa một đánh giá đã có.
 * @param {number} danhGiaSkID
 * @param {object} currentUser
 * @returns {Promise<{message: string}>}
 */
const deleteEventRating = async (danhGiaSkID, currentUser) => {
  // 1. Lấy đánh giá gốc từ DB để kiểm tra
  const existingRating =
    await danhGiaSuKienRepository.getRatingById(danhGiaSkID);
  if (!existingRating) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Không tìm thấy đánh giá này.');
  }

  // 2. Kiểm tra quyền sở hữu
  if (existingRating.NguoiDanhGiaID !== currentUser.nguoiDungID) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Bạn không có quyền xóa đánh giá này.'
    );
  }

  // 3. (Tùy chọn) Kiểm tra thời gian cho phép xóa, tương tự như khi sửa
  // const tgTaoDanhGia = new Date(existingRating.TgDanhGia);
  // const tgHienTai = new Date();
  // const thoiGianDaTroiMs = tgHienTai.getTime() - tgTaoDanhGia.getTime();
  // const thoiGianDaTroiH = thoiGianDaTroiMs / (1000 * 60 * 60);
  //
  // if (thoiGianDaTroiH > RATING_EDIT_TIMEFRAME_HOURS) {
  //   throw new ApiError(
  //     httpStatus.FORBIDDEN,
  //     `Bạn chỉ có thể xóa đánh giá trong vòng ${RATING_EDIT_TIMEFRAME_HOURS} giờ sau khi gửi.`
  //   );
  // }

  // 4. Thực hiện xóa
  const rowsAffected =
    await danhGiaSuKienRepository.deleteRatingById(danhGiaSkID);
  if (rowsAffected === 0) {
    // Trường hợp hiếm, có thể do race condition
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Xóa đánh giá thất bại.'
    );
  }

  logger.info(
    `User ${currentUser.nguoiDungID} deleted rating ID: ${danhGiaSkID}`
  );
  return { message: 'Đã xóa đánh giá thành công.' };
};

export const danhGiaSuKienService = {
  submitEventRating,
  updateEventRating,
  deleteEventRating,
};
