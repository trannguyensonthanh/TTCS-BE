// src/modules/lichSuDungPhong/lichSuDungPhong.controller.js
import { lichSuDungPhongService } from './lichSuDungPhong.service.js';
import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Lấy dữ liệu lịch đặt phòng theo các tiêu chí lọc.
 * @param {import('express').Request} req - Request object, chứa query filter (tuNgay, denNgay, phongIDs, toaNhaID, loaiPhongID, suKienID, donViToChucID)
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với dữ liệu lịch đặt phòng
 */
const getLichDatPhongController = async (req, res) => {
  const params = pick(req.query, [
    'tuNgay',
    'denNgay',
    'phongIDs',
    'toaNhaID',
    'loaiPhongID',
    'suKienID',
    'donViToChucID',
  ]);
  if (params.phongIDs && typeof params.phongIDs === 'string') {
    params.phongIDs = params.phongIDs
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !Number.isNaN(id) && id > 0);
  } else if (params.phongIDs) {
    params.phongIDs = []
      .concat(params.phongIDs)
      .map((id) => parseInt(id, 10))
      .filter((id) => !Number.isNaN(id) && id > 0);
  }
  const result = await lichSuDungPhongService.getLichDatPhong(params);
  okResponse(res, result, 'Lấy dữ liệu lịch đặt phòng thành công.');
};

const getLichDatPhongTheoPhongController = async (req, res) => {
  const phongId = parseInt(req.params.phongId, 10);
  const queryParams = pick(req.query, [
    'tuNgay',
    'denNgay',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);

  const result = await lichSuDungPhongService.getLichDatPhongTheoPhong(
    phongId,
    queryParams
  );
  okResponse(res, result, 'Lấy lịch đặt của phòng thành công.');
};

// const getPublicRoomUsageController = async (req, res) => {
//   const params = pick(req.query, [
//     'tuNgay',
//     'denNgay',
//     'toaNhaID',
//     'loaiPhongID',
//   ]);
//   const result = await lichSuDungPhongService.getPublicRoomUsage(params);
//   okResponse(res, result, 'Lấy dữ liệu sử dụng phòng tổng quan thành công.');
// };

export const lichSuDungPhongController = {
  getLichDatPhongController,
  getLichDatPhongTheoPhongController,
  // getPublicRoomUsageController,
};
