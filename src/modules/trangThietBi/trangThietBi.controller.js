// src/modules/danhMuc/trangThietBi.controller.js
import { trangThietBiService } from './trangThietBi.service.js';
import {
  createdResponse,
  okResponse,
  noContentResponse,
} from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Lấy danh sách trang thiết bị để chọn (select option).
 * @param {Object} req - Request Express, query: searchTerm, limit.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response danh sách thiết bị phù hợp để chọn.
 */
const getTrangThietBiListForSelectController = async (req, res) => {
  const params = pick(req.query, ['searchTerm', 'limit']);
  const result = await trangThietBiService.getTrangThietBisForSelect(params);
  okResponse(res, result, 'Lấy danh sách trang thiết bị để chọn thành công.');
};

/**
 * Tạo mới một trang thiết bị.
 * @param {Object} req - Request Express, body: thông tin thiết bị.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response thiết bị vừa tạo.
 */
const createTrangThietBiController = async (req, res) => {
  const trangThietBi = await trangThietBiService.createTrangThietBi(req.body);
  createdResponse(res, trangThietBi, 'Tạo trang thiết bị thành công.');
};

/**
 * Lấy danh sách trang thiết bị (có phân trang, tìm kiếm).
 * @param {Object} req - Request Express, query: searchTerm, page, limit, sortBy, sortOrder.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response danh sách thiết bị.
 */
const getTrangThietBiListController = async (req, res) => {
  const params = pick(req.query, [
    'searchTerm',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await trangThietBiService.getTrangThietBiList(params);
  okResponse(res, result, 'Lấy danh sách trang thiết bị thành công.');
};

/**
 * Lấy chi tiết một trang thiết bị theo ID.
 * @param {Object} req - Request Express, params: id.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response chi tiết thiết bị.
 */
const getTrangThietBiDetailController = async (req, res) => {
  const trangThietBi = await trangThietBiService.getTrangThietBiDetail(
    parseInt(req.params.id)
  );
  okResponse(res, trangThietBi, 'Lấy chi tiết trang thiết bị thành công.');
};

/**
 * Cập nhật thông tin trang thiết bị theo ID.
 * @param {Object} req - Request Express, params: id, body: thông tin cập nhật.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response thiết bị đã cập nhật.
 */
const updateTrangThietBiController = async (req, res) => {
  const updatedTrangThietBi = await trangThietBiService.updateTrangThietBi(
    parseInt(req.params.id),
    req.body
  );
  okResponse(res, updatedTrangThietBi, 'Cập nhật trang thiết bị thành công.');
};

/**
 * Xóa trang thiết bị theo ID.
 * @param {Object} req - Request Express, params: id.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response không có nội dung nếu xóa thành công.
 */
const deleteTrangThietBiController = async (req, res) => {
  await trangThietBiService.deleteTrangThietBi(parseInt(req.params.id));
  noContentResponse(res, 'Xóa trang thiết bị thành công.');
};

export const trangThietBiController = {
  getTrangThietBiListForSelectController,
  createTrangThietBiController,
  getTrangThietBiListController,
  getTrangThietBiDetailController,
  updateTrangThietBiController,
  deleteTrangThietBiController,
};
