// src/modules/loaiTang/loaiTang.controller.js
import { loaiTangService } from './loaiTang.service.js';
import {
  createdResponse,
  okResponse,
  noContentResponse,
} from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Tạo mới loại tầng.
 * @param {import('express').Request} req - Request object, chứa body loại tầng mới
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với loại tầng vừa tạo
 */
const createLoaiTangController = async (req, res) => {
  const loaiTang = await loaiTangService.createLoaiTang(req.body);
  createdResponse(res, loaiTang, 'Tạo loại tầng thành công.');
};

/**
 * Lấy danh sách loại tầng (có lọc, phân trang, tìm kiếm).
 * @param {import('express').Request} req - Request object, chứa query filter
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với danh sách loại tầng
 */
const getLoaiTangListController = async (req, res) => {
  const params = pick(req.query, [
    'searchTerm',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await loaiTangService.getLoaiTangList(params);
  okResponse(res, result, 'Lấy danh sách loại tầng thành công.');
};

/**
 * Lấy chi tiết loại tầng theo ID.
 * @param {import('express').Request} req - Request object, chứa params.id
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với chi tiết loại tầng
 */
const getLoaiTangDetailController = async (req, res) => {
  const loaiTang = await loaiTangService.getLoaiTangDetail(
    parseInt(req.params.id)
  );
  okResponse(res, loaiTang, 'Lấy chi tiết loại tầng thành công.');
};

/**
 * Cập nhật loại tầng theo ID.
 * @param {import('express').Request} req - Request object, chứa params.id và body cập nhật
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với loại tầng đã cập nhật
 */
const updateLoaiTangController = async (req, res) => {
  const updatedLoaiTang = await loaiTangService.updateLoaiTang(
    parseInt(req.params.id),
    req.body
  );
  okResponse(res, updatedLoaiTang, 'Cập nhật loại tầng thành công.');
};

/**
 * Xóa loại tầng theo ID.
 * @param {import('express').Request} req - Request object, chứa params.id
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response no content khi xóa thành công
 */
const deleteLoaiTangController = async (req, res) => {
  await loaiTangService.deleteLoaiTang(parseInt(req.params.id));
  noContentResponse(res, 'Xóa loại tầng thành công.');
};

export const loaiTangController = {
  createLoaiTangController,
  getLoaiTangListController,
  getLoaiTangDetailController,
  updateLoaiTangController,
  deleteLoaiTangController,
};
