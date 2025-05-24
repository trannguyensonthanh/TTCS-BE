// src/modules/suKien/suKien.controller.js
import { suKienService } from './suKien.service.js';
import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';

const getSuKienListController = async (req, res) => {
  // Lấy các tham số query đã được validate (nếu dùng middleware)
  // Hoặc pick các tham số hợp lệ từ req.query
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

const getSuKienDetailController = async (req, res) => {
  const { suKienID } = req.params;
  // suKienID đã được validate là số nguyên dương bởi middleware (nếu dùng)
  // hoặc có thể validate lại ở đây:
  // if (isNaN(parseInt(suKienID)) || parseInt(suKienID) <= 0) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'ID sự kiện không hợp lệ.');
  // }

  const suKienDetail = await suKienService.getSuKienDetail(parseInt(suKienID));
  okResponse(res, suKienDetail, 'Lấy chi tiết sự kiện thành công.');
};

const updateSuKienTrangThaiController = async (req, res) => {
  const { suKienID } = req.params;
  const payload = req.body; // Gồm maTrangThaiMoi, lyDo (đã được validate bởi middleware)
  const nguoiThucHien = req.user; // Lấy từ authMiddleware

  const suKienUpdated = await suKienService.updateSuKienTrangThai(
    parseInt(suKienID),
    payload,
    nguoiThucHien
  );
  okResponse(res, suKienUpdated, 'Cập nhật trạng thái sự kiện thành công.');
};

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

const getPublicSuKienDetailController = async (req, res) => {
  const { id: suKienID } = req.params; // Lấy 'id' từ path params
  const suKienDetail = await suKienService.getPublicSuKienDetail(
    parseInt(suKienID)
  );
  okResponse(res, suKienDetail, 'Lấy chi tiết sự kiện công khai thành công.');
};

/**
 * Controller để tạo mới một sự kiện
 */
const createSuKienController = async (req, res) => {
  // req.body đã được validate bởi suKienValidation.validateCreateSuKien
  const suKienBody = req.body;
  const nguoiTaoID = req.user.nguoiDungID; // Lấy NguoiDungID từ middleware xác thực token

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
 * Controller để cập nhật thông tin sự kiện
 */
const updateSuKienController = async (req, res) => {
  const { suKienID } = req.params;
  const suKienBody = req.body; // Đã được validate bởi middleware
  const nguoiThucHien = req.user; // Lấy từ middleware xác thực

  const updatedSuKien = await suKienService.updateSuKienService(
    parseInt(suKienID),
    suKienBody,
    nguoiThucHien
  );

  okResponse(res, updatedSuKien, 'Cập nhật sự kiện thành công.');
};

const duyetSuKienByBGHController = async (req, res) => {
  const { id: suKienID } = req.params; // Lấy id từ params
  const payload = req.body; // Chứa ghiChuBGH (optional)
  const nguoiDuyet = req.user; // Từ authMiddleware

  const suKienUpdated = await suKienService.duyetSuKienByBGH(
    parseInt(suKienID),
    payload,
    nguoiDuyet
  );
  okResponse(res, suKienUpdated, 'Sự kiện đã được duyệt bởi BGH thành công.');
};

const tuChoiSuKienByBGHController = async (req, res) => {
  const { id: suKienID } = req.params; // Lấy id từ params
  const payload = req.body; // Chứa lyDoTuChoiBGH (required)
  const nguoiDuyet = req.user;

  const suKienUpdated = await suKienService.tuChoiSuKienByBGH(
    parseInt(suKienID),
    payload,
    nguoiDuyet
  );
  okResponse(res, suKienUpdated, 'Sự kiện đã bị từ chối bởi BGH.');
};

const getSuKiensForYeuCauPhongSelectController = async (req, res) => {
  const params = pick(req.query, [
    'nguoiTaoID',
    'donViChuTriID',
    'searchTerm',
    'page',
    'limit',
    'coTheTaoYeuCauPhongMoi', // Thêm tham số này
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
};
