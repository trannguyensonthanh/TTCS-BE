// src/modules/suKien/suKien.controller.js
import { suKienService } from './suKien.service.js';
import { createdResponse, okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import logger from '../../utils/logger.util.js';

/**
 * Lấy danh sách sự kiện (có phân trang, lọc, phân quyền).
 * @param {import('express').Request} req - Express request (query: filter, phân trang, sắp xếp)
 * @param {import('express').Response} res - Express response
 * @returns {void} Trả về danh sách sự kiện qua okResponse
 */
const getSuKienListController = async (req, res) => {
  const filterOptions = pick(req.query, [
    'searchTerm',
    'trangThaiSkMa',
    'donViChuTriID',
    'tuNgay',
    'denNgay',
    'isCongKhaiNoiBo',
    'sapDienRa',
    'nguoiTaoID',
    'thamGiaDonViID',
    'thamGiaNguoiDungID',
  ]);
  const paginationOptions = pick(req.query, [
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const params = { ...filterOptions, ...paginationOptions };

  const result = await suKienService.getSuKienList(params);
  okResponse(res, result, 'Lấy danh sách sự kiện thành công.');
};

/**
 * Lấy chi tiết một sự kiện theo ID.
 * @param {import('express').Request} req - Express request (params: suKienID)
 * @param {import('express').Response} res - Express response
 * @returns {void} Trả về chi tiết sự kiện qua okResponse
 */
const getSuKienDetailController = async (req, res) => {
  console.log('getSuKienDetailController called with params:', req.params);
  const { suKienID } = req.params;

  const suKienDetail = await suKienService.getSuKienDetail(parseInt(suKienID));
  okResponse(res, suKienDetail, 'Lấy chi tiết sự kiện thành công.');
};

/**
 * Cập nhật trạng thái sự kiện.
 * @param {import('express').Request} req - Express request (params: suKienID, body: trạng thái mới, lý do)
 * @param {import('express').Response} res - Express response
 * @returns {void} Trả về sự kiện đã cập nhật qua okResponse
 */
const updateSuKienTrangThaiController = async (req, res) => {
  const { suKienID } = req.params;
  const payload = req.body;
  const nguoiThucHien = req.user;

  const suKienUpdated = await suKienService.updateSuKienTrangThai(
    parseInt(suKienID),
    payload,
    nguoiThucHien
  );
  okResponse(res, suKienUpdated, 'Cập nhật trạng thái sự kiện thành công.');
};

/**
 * Lấy danh sách sự kiện công khai (public).
 * @param {import('express').Request} req - Express request (query: filter, phân trang, sắp xếp)
 * @param {import('express').Response} res - Express response
 * @returns {void} Trả về danh sách sự kiện công khai qua okResponse
 */
const getPublicSuKienListController = async (req, res) => {
  const filterOptions = pick(req.query, [
    'searchTerm',
    'loaiSuKienMa',
    'tuNgay',
    'denNgay',
    'sapDienRa',
  ]);
  const paginationOptions = pick(req.query, [
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const params = { ...filterOptions, ...paginationOptions };

  const result = await suKienService.getPublicSuKienList(params);
  okResponse(res, result, 'Lấy danh sách sự kiện công khai thành công.');
};

/**
 * Lấy chi tiết sự kiện công khai theo ID.
 * @param {import('express').Request} req - Express request (params: id)
 * @param {import('express').Response} res - Express response
 * @returns {void} Trả về chi tiết sự kiện công khai qua okResponse
 */
const getPublicSuKienDetailController = async (req, res) => {
  const { id: suKienID } = req.params; // Lấy 'id' từ path params
  const suKienDetail = await suKienService.getPublicSuKienDetail(
    parseInt(suKienID)
  );
  okResponse(res, suKienDetail, 'Lấy chi tiết sự kiện công khai thành công.');
};

/**
 * Tạo mới một sự kiện.
 * @param {import('express').Request} req - Express request (body: thông tin sự kiện)
 * @param {import('express').Response} res - Express response
 * @returns {void} Trả về sự kiện vừa tạo qua createdResponse
 */
const createSuKienController = async (req, res) => {
  const suKienBody = req.body;
  const nguoiTaoID = req.user.nguoiDungID;

  const newSuKienDetail = await suKienService.createSuKienService(
    suKienBody,
    nguoiTaoID
  );

  createdResponse(
    res,
    newSuKienDetail,
    'Tạo sự kiện thành công, đang chờ duyệt.'
  );
};

/**
 * Cập nhật thông tin một sự kiện.
 * @param {import('express').Request} req - Express request (params: suKienID, body: thông tin cập nhật)
 * @param {import('express').Response} res - Express response
 * @returns {void} Trả về sự kiện đã cập nhật qua okResponse
 */
const updateSuKienController = async (req, res) => {
  const { suKienID } = req.params;
  const suKienBody = req.body;
  const nguoiThucHien = req.user;

  const updatedSuKien = await suKienService.updateSuKienService(
    parseInt(suKienID),
    suKienBody,
    nguoiThucHien
  );

  okResponse(res, updatedSuKien, 'Cập nhật sự kiện thành công.');
};

/**
 * Duyệt sự kiện bởi BGH.
 * @param {import('express').Request} req - Express request (params: id, body: ghi chú BGH)
 * @param {import('express').Response} res - Express response
 * @returns {void} Trả về sự kiện đã duyệt qua okResponse
 */
const duyetSuKienByBGHController = async (req, res) => {
  const { id: suKienID } = req.params;
  const payload = req.body;
  const nguoiDuyet = req.user;

  const suKienUpdated = await suKienService.duyetSuKienByBGH(
    parseInt(suKienID),
    payload,
    nguoiDuyet
  );
  okResponse(res, suKienUpdated, 'Sự kiện đã được duyệt bởi BGH thành công.');
};

/**
 * Từ chối sự kiện bởi BGH.
 * @param {import('express').Request} req - Express request (params: id, body: lý do từ chối)
 * @param {import('express').Response} res - Express response
 * @returns {void} Trả về sự kiện đã bị từ chối qua okResponse
 */
const tuChoiSuKienByBGHController = async (req, res) => {
  const { id: suKienID } = req.params;
  const payload = req.body;
  const nguoiDuyet = req.user;

  const suKienUpdated = await suKienService.tuChoiSuKienByBGH(
    parseInt(suKienID),
    payload,
    nguoiDuyet
  );
  okResponse(res, suKienUpdated, 'Sự kiện đã bị từ chối bởi BGH.');
};

/**
 * Lấy danh sách sự kiện để chọn tạo yêu cầu phòng.
 * @param {import('express').Request} req - Express request (query: filter, phân trang, quyền user)
 * @param {import('express').Response} res - Express response
 * @returns {void} Trả về danh sách sự kiện phù hợp qua okResponse
 */
const getSuKiensForYeuCauPhongSelectController = async (req, res) => {
  console.log(
    'getSuKiensForYeuCauPhongSelectController called with query params:',
    req.query
  );
  const params = pick(req.query, [
    'nguoiTaoID',
    'donViChuTriID',
    'searchTerm',
    'page',
    'limit',
    'coTheTaoYeuCauPhongMoi',
    'sortBy',
    'sortOrder',
  ]);
  const currentUser = req.user;

  const result = await suKienService.getSuKiensForYeuCauPhongSelect(
    params,
    currentUser
  );
  okResponse(
    res,
    result,
    'Lấy danh sách sự kiện để chọn tạo yêu cầu phòng thành công.'
  );
};

/**
 * [MỚI] Lấy danh sách sự kiện đủ điều kiện để mời.
 */
const getSuKienCoTheMoiController = async (req, res) => {
  const params = pick(req.query, [
    'searchTerm',
    'donViToChucID',
    'loaiSuKienID',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await suKienService.getSuKienCoTheMoi(params);
  okResponse(res, result, 'Lấy danh sách sự kiện có thể mời thành công.');
};

/**
 * [MỚI] Gửi lời mời tham gia sự kiện.
 */
const guiLoiMoiThamGiaController = async (req, res) => {
  const { suKienID } = req.params;
  const payload = req.body;
  const nguoiGui = req.user;

  const result = await suKienService.guiLoiMoiThamGia(
    parseInt(suKienID),
    payload,
    nguoiGui
  );
  okResponse(res, result, result.message);
};

/**
 * [MỚI] Lấy danh sách người đã được mời cho một sự kiện.
 */
const getDanhSachMoiController = async (req, res) => {
  const { suKienID } = req.params;
  const params = pick(req.query, [
    'searchTerm',
    'trangThaiPhanHoi',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await suKienService.getDanhSachMoi(parseInt(suKienID), params);
  okResponse(res, result, 'Lấy danh sách mời thành công.');
};

/**
 * [MỚI] Gửi lời mời hàng loạt.
 */
const guiLoiMoiHangLoatController = async (req, res) => {
  const { suKienID } = req.params;
  const payload = req.body;
  const nguoiGui = req.user;

  const result = await suKienService.guiLoiMoiHangLoat(
    parseInt(suKienID),
    payload,
    nguoiGui
  );
  okResponse(res, result, result.message);
};

const getMyAttendedEventsController = async (req, res) => {
  const nguoiDungID = req.user.nguoiDungID;
  const params = pick(req.query, [
    'trangThaiSuKien',
    'daDanhGia',
    'tuNgay',
    'denNgay',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await suKienService.getMyAttendedEvents(nguoiDungID, params);
  okResponse(res, result, 'Lấy danh sách sự kiện đã tham gia thành công.');
};

export const suKienController = {
  getSuKienListController,
  getSuKienDetailController,
  updateSuKienTrangThaiController,
  getPublicSuKienListController,
  getPublicSuKienDetailController,
  createSuKienController,
  updateSuKienController,
  duyetSuKienByBGHController,
  tuChoiSuKienByBGHController,
  getSuKiensForYeuCauPhongSelectController,
  getDanhSachMoiController,
  getSuKienCoTheMoiController,
  guiLoiMoiThamGiaController,
  guiLoiMoiHangLoatController,
  getMyAttendedEventsController,
};
