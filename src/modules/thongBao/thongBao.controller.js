// src/modules/thongBao/thongBao.controller.js
import { thongBaoService } from './thongBao.service.js';
import { createdResponse, okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Lấy danh sách thông báo của người dùng hiện tại.
 * @param {import('express').Request} req - Express request (user, query)
 * @param {import('express').Response} res - Express response
 */
const getThongBaoCuaToiController = async (req, res) => {
  const nguoiDungID = req.user.nguoiDungID; // Từ authMiddleware
  const queryParams = pick(req.query, ['limit', 'page', 'chiChuaDoc']);
  const result = await thongBaoService.getThongBaoCuaToi(
    nguoiDungID,
    queryParams
  );
  okResponse(res, result, 'Lấy danh sách thông báo thành công.');
};

/**
 * Đánh dấu một thông báo là đã đọc cho người dùng hiện tại.
 * @param {import('express').Request} req - Express request (params: id, user)
 * @param {import('express').Response} res - Express response
 */
const danhDauDaDocController = async (req, res) => {
  const thongBaoID = parseInt(req.params.id);
  const nguoiDungID = req.user.nguoiDungID;
  const result = await thongBaoService.danhDauDaDoc(thongBaoID, nguoiDungID);
  okResponse(res, result, result.message);
};

/**
 * Đánh dấu tất cả thông báo là đã đọc cho người dùng hiện tại.
 * @param {import('express').Request} req - Express request (user)
 * @param {import('express').Response} res - Express response
 */
const danhDauTatCaDaDocController = async (req, res) => {
  const nguoiDungID = req.user.nguoiDungID;
  const result = await thongBaoService.danhDauTatCaDaDoc(nguoiDungID);
  okResponse(res, { countUpdated: result.countUpdated }, result.message);
};

/**
 * Tạo yêu cầu chỉnh sửa thông báo.
 * @param {import('express').Request} req - Express request (body, user)
 * @param {import('express').Response} res - Express response
 */
const createYeuCauChinhSuaThongBaoController = async (req, res) => {
  const payload = req.body; // Đã được validate
  const nguoiGui = req.user; // Từ authMiddleware

  const result = await thongBaoService.createYeuCauChinhSuaThongBao(
    payload,
    nguoiGui
  );
  createdResponse(res, { message: result.message }, result.message);
};

/**
 * Lấy tất cả thông báo của người dùng hiện tại với các tùy chọn lọc/phân trang.
 * @param {import('express').Request} req - Express request (user, query)
 * @param {import('express').Response} res - Express response
 */
const getAllMyNotificationsController = async (req, res) => {
  const nguoiDungID = req.user.nguoiDungID;
  const queryParams = pick(req.query, [
    'daDoc',
    'loaiThongBao',
    'searchTerm',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await thongBaoService.getAllMyNotifications(
    nguoiDungID,
    queryParams
  );
  okResponse(res, result, 'Lấy tất cả thông báo thành công.');
};

export const thongBaoController = {
  getThongBaoCuaToiController,
  danhDauDaDocController,
  danhDauTatCaDaDocController,
  createYeuCauChinhSuaThongBaoController,
  getAllMyNotificationsController,
};
