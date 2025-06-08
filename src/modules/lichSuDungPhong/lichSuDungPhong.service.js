// src/modules/lichSuDungPhong/lichSuDungPhong.service.js
import { lichSuDungPhongRepository } from './lichSuDungPhong.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';

/**
 * Lấy dữ liệu lịch đặt phòng theo các tiêu chí lọc.
 * @param {object} params - Tham số lọc (tuNgay, denNgay, phongIDs, toaNhaID, loaiPhongID, suKienID, donViToChucID)
 * @returns {Promise<Array<object>>} Danh sách lịch đặt phòng phù hợp
 */
const getLichDatPhong = async (params) => {
  if (new Date(params.denNgay) < new Date(params.tuNgay)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Ngày kết thúc không thể trước ngày bắt đầu.'
    );
  }
  const MAX_DATE_RANGE_DAYS = 90;
  const tuNgayDate = new Date(params.tuNgay);
  const denNgayDate = new Date(params.denNgay);
  const diffTime = Math.abs(denNgayDate - tuNgayDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > MAX_DATE_RANGE_DAYS) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Khoảng thời gian truy vấn không được vượt quá ${MAX_DATE_RANGE_DAYS} ngày.`
    );
  }

  const items = await lichSuDungPhongRepository.getLichDatPhongRecords(params);
  return items;
};

export const lichSuDungPhongService = {
  getLichDatPhong,
};
