// src/modules/yeuCauMuonPhong/yeuCauMuonPhong.controller.js
import { yeuCauMuonPhongService } from './yeuCauMuonPhong.service.js';
import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

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
  const currentUser = req.user; // Từ authMiddleware
  const result = await yeuCauMuonPhongService.getYeuCauMuonPhongs(
    params,
    currentUser
  );
  okResponse(res, result, 'Lấy danh sách yêu cầu mượn phòng thành công.');
};

const getYeuCauMuonPhongDetailController = async (req, res) => {
  const ycMuonPhongID = parseInt(req.params.id);
  const currentUser = req.user;
  const result = await yeuCauMuonPhongService.getYeuCauMuonPhongDetail(
    ycMuonPhongID,
    currentUser
  );
  okResponse(res, result, 'Lấy chi tiết yêu cầu mượn phòng thành công.');
};

const createYeuCauMuonPhongController = async (req, res) => {
  const payload = req.body; // Đã được validate bởi middleware
  const nguoiYeuCau = req.user; // Từ authMiddleware

  const newYeuCau = await yeuCauMuonPhongService.createYeuCauMuonPhong(
    payload,
    nguoiYeuCau
  );
  createdResponse(res, newYeuCau, 'Tạo yêu cầu mượn phòng thành công.');
};

const xuLyChiTietYeuCauController = async (req, res) => {
  const { ycMuonPhongID, ycMuonPhongCtID } = req.params; // Đã validate là số
  const payload = req.body; // Đã validate
  const nguoiXuLy = req.user; // Từ authMiddleware

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

const huyYeuCauMuonPhongByUserController = async (req, res) => {
  const ycMuonPhongID = parseInt(req.params.id);
  const nguoiHuy = req.user; // Từ authMiddleware

  const updatedYeuCau = await yeuCauMuonPhongService.huyYeuCauMuonPhongByUser(
    ycMuonPhongID,
    nguoiHuy
  );
  okResponse(res, updatedYeuCau, 'Yêu cầu mượn phòng đã được hủy thành công.');
};

export const yeuCauMuonPhongController = {
  getYeuCauMuonPhongsController,
  getYeuCauMuonPhongDetailController,
  createYeuCauMuonPhongController,
  xuLyChiTietYeuCauController,
  huyYeuCauMuonPhongByUserController,
};
