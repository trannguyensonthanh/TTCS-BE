// src/modules/chuyenNganh/chuyenNganh.controller.js
import { chuyenNganhService } from './chuyenNganh.service.js';
import {
  createdResponse,
  okResponse,
  noContentResponse,
} from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Lấy danh sách chuyên ngành để chọn theo ngành học
 */
const getChuyenNganhListForSelectByNganhController = async (req, res) => {
  const { nganhHocId } = req.params;
  const queryParams = pick(req.query, ['searchTerm', 'limit']);
  const result = await chuyenNganhService.getChuyenNganhListForSelectByNganh(
    parseInt(nganhHocId),
    queryParams
  );
  okResponse(res, result, 'Lấy danh sách chuyên ngành để chọn thành công.');
};

/**
 * Lấy danh sách chuyên ngành theo ngành học (có phân trang, tìm kiếm, sắp xếp)
 */
const getChuyenNganhListByNganhController = async (req, res) => {
  const { nganhHocId } = req.params;
  const queryParams = pick(req.query, [
    'searchTerm',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await chuyenNganhService.getChuyenNganhListByNganh(
    parseInt(nganhHocId),
    queryParams
  );
  okResponse(res, result, 'Lấy danh sách chuyên ngành thành công.');
};

/**
 * Tạo mới chuyên ngành cho một ngành học
 */
const createChuyenNganhForNganhController = async (req, res) => {
  const { nganhHocId } = req.params;
  const chuyenNganh = await chuyenNganhService.createChuyenNganhForNganh(
    parseInt(nganhHocId),
    req.body
  );
  createdResponse(res, chuyenNganh, 'Tạo chuyên ngành thành công.');
};

/**
 * Lấy chi tiết một chuyên ngành
 */
const getChuyenNganhDetailController = async (req, res) => {
  const chuyenNganh = await chuyenNganhService.getChuyenNganhDetail(
    parseInt(req.params.id)
  );
  okResponse(res, chuyenNganh, 'Lấy chi tiết chuyên ngành thành công.');
};

/**
 * Cập nhật thông tin chuyên ngành.
 * @param {import('express').Request} req - Request object, chứa params.id và body dữ liệu cập nhật
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với chuyên ngành đã cập nhật
 */
const updateChuyenNganhController = async (req, res) => {
  const updatedChuyenNganh = await chuyenNganhService.updateChuyenNganh(
    parseInt(req.params.id),
    req.body
  );
  okResponse(res, updatedChuyenNganh, 'Cập nhật chuyên ngành thành công.');
};

/**
 * Xóa chuyên ngành.
 * @param {import('express').Request} req - Request object, chứa params.id
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response no content khi xóa thành công
 */
const deleteChuyenNganhController = async (req, res) => {
  await chuyenNganhService.deleteChuyenNganh(parseInt(req.params.id));
  noContentResponse(res, 'Xóa chuyên ngành thành công.');
};

export const chuyenNganhController = {
  getChuyenNganhListForSelectByNganhController,
  getChuyenNganhListByNganhController,
  createChuyenNganhForNganhController,
  getChuyenNganhDetailController,
  updateChuyenNganhController,
  deleteChuyenNganhController,
};
