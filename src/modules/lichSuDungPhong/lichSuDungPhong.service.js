// src/modules/lichSuDungPhong/lichSuDungPhong.service.js
import { lichSuDungPhongRepository } from './lichSuDungPhong.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import { phongCRUDRepository } from '../phongCRUD/phongCRUD.repository.js';

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

/**
 * Lấy lịch đặt của một phòng cụ thể
 * @param {number} phongId
 * @param {object} queryParams - { tuNgay, denNgay, page, limit, sortBy, sortOrder }
 * @returns {Promise<PaginatedLichDatPhongResponse>}
 */
const getLichDatPhongTheoPhong = async (phongId, queryParams) => {
  // Kiểm tra phòng có tồn tại không
  const phong = await phongCRUDRepository.findPhongByIdMinimal(phongId); // Dùng hàm đã có
  if (!phong) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Phòng không tồn tại.');
  }

  // Validate khoảng thời gian
  if (
    queryParams.tuNgay &&
    queryParams.denNgay &&
    new Date(queryParams.denNgay) < new Date(queryParams.tuNgay)
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Ngày kết thúc không thể trước ngày bắt đầu.'
    );
  }
  // Có thể thêm giới hạn khoảng thời gian ở đây

  const { items, totalItems } =
    await lichSuDungPhongRepository.getLichDatPhongByPhongId(
      phongId,
      queryParams
    );
  const page = parseInt(queryParams.page, 10) || 1;
  const limit = parseInt(queryParams.limit, 10) || 10;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items,
    totalPages,
    currentPage: page,
    totalItems,
    pageSize: limit,
  };
};

// /**
//  * [MỚI] Lấy và xử lý dữ liệu lịch sử dụng phòng công khai.
//  * @param {object} params - Tham số lọc.
//  * @returns {Promise<KhungGioPhongBanItem[]>}
//  */
// const getPublicRoomUsage = async (params) => {
//   const rawUsageData =
//     await lichSuDungPhongRepository.getPublicRoomUsage(params);

//   const usageMap = new Map();

//   for (const record of rawUsageData) {
//     const ngay = record.BatDau.toISOString().split('T')[0];
//     const phongKey = `${ngay}_${record.PhongID}`;

//     if (!usageMap.has(phongKey)) {
//       usageMap.set(phongKey, {
//         ngay,
//         phongID: record.PhongID,
//         tenPhong: record.TenPhong,
//         maPhong: record.MaPhong,
//         khungGioBan: [],
//       });
//     }

//     usageMap.get(phongKey).khungGioBan.push({
//       batDau: record.BatDau.toISOString(),
//       ketThuc: record.KetThuc.toISOString(),
//     });
//   }

//   return Array.from(usageMap.values());
// };

export const lichSuDungPhongService = {
  getLichDatPhong,
  getLichDatPhongTheoPhong,
  // getPublicRoomUsage,
};
