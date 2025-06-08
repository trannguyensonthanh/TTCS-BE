// src/modules/yeuCauMuonPhong/yeuCauMuonPhong.controller.js
import { yeuCauMuonPhongService } from './yeuCauMuonPhong.service.js';
import { createdResponse, okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Lấy danh sách yêu cầu mượn phòng.
 * Đầu vào: req.query (searchTerm, trangThaiChungMa, suKienID, nguoiYeuCauID, donViYeuCauID, tuNgayYeuCau, denNgayYeuCau, page, limit, sortBy, sortOrder), req.user
 * Đầu ra: Response trả về danh sách yêu cầu mượn phòng
 */
const getYeuCauMuonPhongsController = async (req, res) => {
  const params = pick(req.query, [
    'searchTerm',
    'trangThaiChungMa',
    'suKienID',
    'nguoiYeuCauID',
    'donViYeuCauID',
    'tuNgayYeuCau',
    'denNgayYeuCau',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const currentUser = req.user;
  const result = await yeuCauMuonPhongService.getYeuCauMuonPhongs(
    params,
    currentUser
  );
  okResponse(res, result, 'Lấy danh sách yêu cầu mượn phòng thành công.');
};

/**
 * Lấy chi tiết một yêu cầu mượn phòng.
 * Đầu vào: req.params.id (ID yêu cầu), req.user
 * Đầu ra: Response trả về chi tiết yêu cầu mượn phòng
 */
const getYeuCauMuonPhongDetailController = async (req, res) => {
  const ycMuonPhongID = parseInt(req.params.id);
  const currentUser = req.user;
  const result = await yeuCauMuonPhongService.getYeuCauMuonPhongDetail(
    ycMuonPhongID,
    currentUser
  );
  okResponse(res, result, 'Lấy chi tiết yêu cầu mượn phòng thành công.');
};

/**
 * Tạo mới yêu cầu mượn phòng.
 * Đầu vào: req.body (payload yêu cầu mượn phòng), req.user
 * Đầu ra: Response trả về yêu cầu mượn phòng vừa tạo
 */
const createYeuCauMuonPhongController = async (req, res) => {
  const payload = req.body;
  const nguoiYeuCau = req.user;

  const newYeuCau = await yeuCauMuonPhongService.createYeuCauMuonPhong(
    payload,
    nguoiYeuCau
  );
  createdResponse(res, newYeuCau, 'Tạo yêu cầu mượn phòng thành công.');
};

/**
 * Xử lý chi tiết yêu cầu mượn phòng.
 * Đầu vào: req.params (ycMuonPhongID, ycMuonPhongCtID), req.body (payload xử lý), req.user
 * Đầu ra: Response trả về kết quả xử lý chi tiết yêu cầu
 */
const xuLyChiTietYeuCauController = async (req, res) => {
  const { ycMuonPhongID, ycMuonPhongCtID } = req.params;
  const payload = req.body;
  const nguoiXuLy = req.user;

  const updatedYeuCau = await yeuCauMuonPhongService.xuLyChiTietYeuCau(
    parseInt(ycMuonPhongCtID),
    payload,
    nguoiXuLy
  );
  okResponse(
    res,
    updatedYeuCau,
    'Xử lý chi tiết yêu cầu mượn phòng thành công.'
  );
};

/**
 * Hủy yêu cầu mượn phòng bởi người dùng.
 * Đầu vào: req.params.id (ID yêu cầu), req.user
 * Đầu ra: Response trả về kết quả hủy yêu cầu
 */
const huyYeuCauMuonPhongByUserController = async (req, res) => {
  const ycMuonPhongID = parseInt(req.params.id);
  const nguoiHuy = req.user;

  const updatedYeuCau = await yeuCauMuonPhongService.huyYeuCauMuonPhongByUser(
    ycMuonPhongID,
    nguoiHuy
  );
  okResponse(res, updatedYeuCau, 'Yêu cầu mượn phòng đã được hủy thành công.');
};

/**
 * Cập nhật yêu cầu mượn phòng bởi người dùng.
 * Đầu vào: req.params.id (ID yêu cầu), req.body (payload cập nhật), req.user
 * Đầu ra: Response trả về kết quả cập nhật yêu cầu
 */
const updateYeuCauMuonPhongByUserController = async (req, res) => {
  const ycMuonPhongID = parseInt(req.params.id);
  const payload = req.body;
  const nguoiThucHien = req.user;

  const updatedYeuCau =
    await yeuCauMuonPhongService.updateYeuCauMuonPhongByUser(
      ycMuonPhongID,
      payload,
      nguoiThucHien
    );

  okResponse(res, updatedYeuCau, 'Cập nhật yêu cầu mượn phòng thành công.');
};

export const yeuCauMuonPhongController = {
  getYeuCauMuonPhongsController,
  getYeuCauMuonPhongDetailController,
  createYeuCauMuonPhongController,
  xuLyChiTietYeuCauController,
  huyYeuCauMuonPhongByUserController,

  updateYeuCauMuonPhongByUserController,
};
