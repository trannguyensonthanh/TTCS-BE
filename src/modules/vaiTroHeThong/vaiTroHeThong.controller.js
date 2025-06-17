// src/modules/vaiTroHeThong/vaiTroHeThong.controller.js
import { vaiTroHeThongService } from './vaiTroHeThong.service.js';
import {
  okResponse,
  createdResponse,
  noContentResponse,
} from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

const getVaiTroHeThongForSelectController = async (req, res) => {
  const params = pick(req.query, ['searchTerm', 'limit']);
  const result = await vaiTroHeThongService.getVaiTroHeThongForSelect(params);
  okResponse(res, result, 'Lấy danh sách vai trò hệ thống để chọn thành công.');
};

/**
 * Lấy danh sách vai trò hệ thống (có phân trang, tìm kiếm).
 * @param {Object} req - Request Express, query: searchTerm, page, limit, sortBy, sortOrder.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response danh sách vai trò hệ thống.
 */
const getVaiTroListController = async (req, res) => {
  const params = pick(req.query, [
    'searchTerm',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await vaiTroHeThongService.getVaiTroList(params);
  okResponse(res, result, 'Lấy danh sách vai trò hệ thống thành công.');
};

/**
 * Lấy chi tiết một vai trò hệ thống theo ID.
 * @param {Object} req - Request Express, params: vaiTroId.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response chi tiết vai trò hệ thống.
 */
const getVaiTroDetailController = async (req, res) => {
  const vaiTro = await vaiTroHeThongService.getVaiTroDetail(
    parseInt(req.params.vaiTroId)
  );
  okResponse(res, vaiTro, 'Lấy chi tiết vai trò hệ thống thành công.');
};

/**
 * Tạo mới một vai trò hệ thống.
 * @param {Object} req - Request Express, body: thông tin vai trò.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response vai trò vừa tạo.
 */
const createVaiTroController = async (req, res) => {
  const vaiTro = await vaiTroHeThongService.createVaiTro(req.body);
  createdResponse(res, vaiTro, 'Tạo vai trò hệ thống thành công.');
};

/**
 * Cập nhật thông tin vai trò hệ thống theo ID.
 * @param {Object} req - Request Express, params: vaiTroId, body: thông tin cập nhật.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response vai trò đã cập nhật.
 */
const updateVaiTroController = async (req, res) => {
  const updatedVaiTro = await vaiTroHeThongService.updateVaiTro(
    parseInt(req.params.vaiTroId),
    req.body
  );
  okResponse(res, updatedVaiTro, 'Cập nhật vai trò hệ thống thành công.');
};

/**
 * Xóa vai trò hệ thống theo ID.
 * @param {Object} req - Request Express, params: vaiTroId.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response không có nội dung nếu xóa thành công.
 */
const deleteVaiTroController = async (req, res) => {
  await vaiTroHeThongService.deleteVaiTro(parseInt(req.params.vaiTroId));
  noContentResponse(res, 'Xóa vai trò hệ thống thành công.');
};

export const vaiTroHeThongController = {
  getVaiTroHeThongForSelectController,
  getVaiTroListController,
  getVaiTroDetailController,
  createVaiTroController,
  updateVaiTroController,
  deleteVaiTroController,
};
