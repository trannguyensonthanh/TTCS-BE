// src/modules/yeuCauDoiPhong/yeuCauDoiPhong.controller.js
import { yeuCauDoiPhongService } from './yeuCauDoiPhong.service.js';
import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

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

const getYeuCauDoiPhongDetailController = async (req, res) => {
  const ycDoiPhongID = parseInt(req.params.id);
  const currentUser = req.user;
  const result = await yeuCauDoiPhongService.getYeuCauDoiPhongDetail(
    ycDoiPhongID,
    currentUser
  );
  okResponse(res, result, 'Lấy chi tiết yêu cầu đổi phòng thành công.');
};

const createYeuCauDoiPhongController = async (req, res) => {
  const payload = req.body; // Đã validate
  const nguoiYeuCau = req.user; // Từ authMiddleware

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

const xuLyYeuCauDoiPhongController = async (req, res) => {
  const ycDoiPhongID = parseInt(req.params.id);
  const payload = req.body; // Đã validate
  const nguoiXuLy = req.user; // Từ authMiddleware

  const updatedYeuCau = await yeuCauDoiPhongService.xuLyYeuCauDoiPhong(
    ycDoiPhongID,
    payload,
    nguoiXuLy
  );
  okResponse(res, updatedYeuCau, 'Xử lý yêu cầu đổi phòng thành công.');
};

const huyYeuCauDoiPhongByUserController = async (req, res) => {
  const ycDoiPhongID = parseInt(req.params.id);
  const nguoiHuy = req.user; // Từ authMiddleware

  const result = await yeuCauDoiPhongService.huyYeuCauDoiPhongByUser(
    ycDoiPhongID,
    nguoiHuy
  );
  // Trả về 200 OK với message hoặc 204 No Content đều được
  okResponse(res, null, result.message);
  // Hoặc: noContentResponse(res, result.message);
};

export const yeuCauDoiPhongController = {
  getYeuCauDoiPhongsController,
  getYeuCauDoiPhongDetailController,
  createYeuCauDoiPhongController,
  xuLyYeuCauDoiPhongController,
  huyYeuCauDoiPhongByUserController,
  // Các controller khác
};
