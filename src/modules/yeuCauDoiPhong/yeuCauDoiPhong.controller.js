// src/modules/yeuCauDoiPhong/yeuCauDoiPhong.controller.js
import { yeuCauDoiPhongService } from './yeuCauDoiPhong.service.js';
import { createdResponse, okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';
import logger from '../../utils/logger.util.js';

/**
 * Lấy danh sách yêu cầu đổi phòng (có phân trang, tìm kiếm).
 * @param {Object} req - Request Express, query: các tham số lọc, phân trang.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response danh sách yêu cầu đổi phòng.
 */
const getYeuCauDoiPhongsController = async (req, res) => {
  const params = pick(req.query, [
    'searchTerm',
    'trangThaiYcDoiPhongMa',
    'suKienID',
    'nguoiYeuCauID',
    'donViNguoiYeuCauID',
    'phongCuID',
    'phongMoiID',
    'tuNgayYeuCau',
    'denNgayYeuCau',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const currentUser = req.user;
  const result = await yeuCauDoiPhongService.getYeuCauDoiPhongs(
    params,
    currentUser
  );
  okResponse(res, result, 'Lấy danh sách yêu cầu đổi phòng thành công.');
};

/**
 * Lấy chi tiết một yêu cầu đổi phòng theo ID.
 * @param {Object} req - Request Express, params: id.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response chi tiết yêu cầu đổi phòng.
 */
const getYeuCauDoiPhongDetailController = async (req, res) => {
  const ycDoiPhongID = parseInt(req.params.id);
  const currentUser = req.user;
  const result = await yeuCauDoiPhongService.getYeuCauDoiPhongDetail(
    ycDoiPhongID,
    currentUser
  );
  logger.info('result:', result);
  okResponse(res, result, 'Lấy chi tiết yêu cầu đổi phòng thành công.');
};

/**
 * Tạo mới một yêu cầu đổi phòng.
 * @param {Object} req - Request Express, body: thông tin yêu cầu, user: người yêu cầu.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response yêu cầu vừa tạo.
 */
const createYeuCauDoiPhongController = async (req, res) => {
  const payload = req.body;
  const nguoiYeuCau = req.user;

  const newYeuCauDoiPhong = await yeuCauDoiPhongService.createYeuCauDoiPhong(
    payload,
    nguoiYeuCau
  );
  createdResponse(
    res,
    newYeuCauDoiPhong,
    'Tạo yêu cầu đổi phòng thành công, đang chờ duyệt.'
  );
};

/**
 * Xử lý yêu cầu đổi phòng (duyệt, từ chối, ...).
 * @param {Object} req - Request Express, params: id, body: thông tin xử lý, user: người xử lý.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response yêu cầu đã xử lý.
 */
const xuLyYeuCauDoiPhongController = async (req, res) => {
  const ycDoiPhongID = parseInt(req.params.id);
  const payload = req.body;
  const nguoiXuLy = req.user;

  const updatedYeuCau = await yeuCauDoiPhongService.xuLyYeuCauDoiPhong(
    ycDoiPhongID,
    payload,
    nguoiXuLy
  );
  okResponse(res, updatedYeuCau, 'Xử lý yêu cầu đổi phòng thành công.');
};

/**
 * Hủy yêu cầu đổi phòng bởi người dùng.
 * @param {Object} req - Request Express, params: id, user: người hủy.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response thông báo hủy thành công.
 */
const huyYeuCauDoiPhongByUserController = async (req, res) => {
  const ycDoiPhongID = parseInt(req.params.id);
  const nguoiHuy = req.user;

  const result = await yeuCauDoiPhongService.huyYeuCauDoiPhongByUser(
    ycDoiPhongID,
    nguoiHuy
  );

  okResponse(res, null, result.message);
};

export const yeuCauDoiPhongController = {
  getYeuCauDoiPhongsController,
  getYeuCauDoiPhongDetailController,
  createYeuCauDoiPhongController,
  xuLyYeuCauDoiPhongController,
  huyYeuCauDoiPhongByUserController,
};
