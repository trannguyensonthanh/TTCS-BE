// File: src/modules/danhGiaSuKien/danhGiaSuKien.service.js
// Service xử lý logic đánh giá sự kiện

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

  const alreadyRated = await danhGiaSuKienRepository.checkIfRatingExists(
    suKienID,
    nguoiDanhGiaID
  );
  if (alreadyRated) {
    throw new ApiError(httpStatus.CONFLICT, 'Bạn đã đánh giá sự kiện này rồi.');
  }

  const newRating = await danhGiaSuKienRepository.createRating({
    suKienID,
    nguoiDanhGiaID,
    diemNoiDung,
    diemToChuc,
    diemDiaDiem,
    yKienDongGop,
  });

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

const RATING_EDIT_TIMEFRAME_HOURS = 24; // Thời gian cho phép sửa/xóa đánh giá (giờ)

/**
 * [MỚI] Cập nhật một đánh giá đã có.
 * @param {number} danhGiaSkID
 * @param {CapNhatDanhGiaPayload} payload
 * @param {object} currentUser
 * @returns {Promise<DanhGiaSKResponse>}
 */
const updateEventRating = async (danhGiaSkID, payload, currentUser) => {
  const existingRating =
    await danhGiaSuKienRepository.getRatingById(danhGiaSkID);
  if (!existingRating) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Không tìm thấy đánh giá này.');
  }

  if (existingRating.NguoiDanhGiaID !== currentUser.nguoiDungID) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Bạn không có quyền sửa đánh giá này.'
    );
  }

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

  const updatedRating = await danhGiaSuKienRepository.updateRating(
    danhGiaSkID,
    payload
  );

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
  const existingRating =
    await danhGiaSuKienRepository.getRatingById(danhGiaSkID);
  if (!existingRating) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Không tìm thấy đánh giá này.');
  }

  if (existingRating.NguoiDanhGiaID !== currentUser.nguoiDungID) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Bạn không có quyền xóa đánh giá này.'
    );
  }

  const rowsAffected =
    await danhGiaSuKienRepository.deleteRatingById(danhGiaSkID);
  if (rowsAffected === 0) {
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
