// src/modules/nganhHoc/nganhHoc.controller.js
import { nganhHocService } from './nganhHoc.service.js';
import {
  createdResponse,
  okResponse,
  noContentResponse,
} from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Lấy danh sách ngành học để chọn (dùng cho select option).
 * @param {Request} req - Express request (query: searchTerm, khoaQuanLyID, limit)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response danh sách ngành học
 */
const getNganhHocListForSelectController = async (req, res) => {
  const params = pick(req.query, ['searchTerm', 'khoaQuanLyID', 'limit']);
  const result = await nganhHocService.getNganhHocListForSelect(params);
  okResponse(res, result, 'Lấy danh sách ngành học để chọn thành công.');
};

/**
 * Tạo mới một ngành học.
 * @param {Request} req - Express request (body: thông tin ngành học)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response ngành học vừa tạo
 */
const createNganhHocController = async (req, res) => {
  const nganhHoc = await nganhHocService.createNganhHoc(req.body);
  createdResponse(res, nganhHoc, 'Tạo ngành học thành công.');
};

/**
 * Lấy danh sách ngành học (có phân trang, filter).
 * @param {Request} req - Express request (query: searchTerm, khoaQuanLyID, coChuyenNganh, page, limit, sortBy, sortOrder)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response danh sách ngành học
 */
const getNganhHocListController = async (req, res) => {
  const params = pick(req.query, [
    'searchTerm',
    'khoaQuanLyID',
    'coChuyenNganh',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await nganhHocService.getNganhHocList(params);
  okResponse(res, result, 'Lấy danh sách ngành học thành công.');
};

/**
 * Lấy chi tiết một ngành học theo ID.
 * @param {Request} req - Express request (params: id)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response chi tiết ngành học
 */
const getNganhHocDetailController = async (req, res) => {
  const nganhHoc = await nganhHocService.getNganhHocDetail(
    parseInt(req.params.id)
  );
  okResponse(res, nganhHoc, 'Lấy chi tiết ngành học thành công.');
};

/**
 * Cập nhật thông tin một ngành học theo ID.
 * @param {Request} req - Express request (params: id, body: thông tin cập nhật)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response ngành học sau khi cập nhật
 */
const updateNganhHocController = async (req, res) => {
  const updatedNganhHoc = await nganhHocService.updateNganhHoc(
    parseInt(req.params.id),
    req.body
  );
  okResponse(res, updatedNganhHoc, 'Cập nhật ngành học thành công.');
};

/**
 * Xóa một ngành học theo ID.
 * @param {Request} req - Express request (params: id)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response xác nhận xóa ngành học
 */
const deleteNganhHocController = async (req, res) => {
  await nganhHocService.deleteNganhHoc(parseInt(req.params.id));
  noContentResponse(res, 'Xóa ngành học thành công.');
};

export const nganhHocController = {
  getNganhHocListForSelectController,
  createNganhHocController,
  getNganhHocListController,
  getNganhHocDetailController,
  updateNganhHocController,
  deleteNganhHocController,
};
