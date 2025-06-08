// src/modules/loaiSuKien/loaiSuKien.controller.js
import { loaiSuKienService } from './loaiSuKien.service.js';
import {
  createdResponse,
  okResponse,
  noContentResponse,
} from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Tạo mới loại sự kiện.
 * @param {import('express').Request} req - Request object, chứa body loại sự kiện mới
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với loại sự kiện vừa tạo
 */
const createLoaiSKController = async (req, res) => {
  const loaiSK = await loaiSuKienService.createLoaiSK(req.body);
  createdResponse(res, loaiSK, 'Tạo loại sự kiện thành công.');
};

/**
 * Lấy danh sách loại sự kiện (có lọc, phân trang, tìm kiếm).
 * @param {import('express').Request} req - Request object, chứa query filter
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với danh sách loại sự kiện
 */
const getLoaiSKsController = async (req, res) => {
  console.log('req.query', req.query);
  const params = pick(req.query, [
    'searchTerm',
    'isActive',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await loaiSuKienService.getLoaiSKs(params);
  okResponse(res, result, 'Lấy danh sách loại sự kiện thành công.');
};

/**
 * Lấy chi tiết loại sự kiện theo ID.
 * @param {import('express').Request} req - Request object, chứa params.loaiSKId
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với chi tiết loại sự kiện
 */
const getLoaiSKByIdController = async (req, res) => {
  const loaiSK = await loaiSuKienService.getLoaiSKById(
    parseInt(req.params.loaiSKId)
  );
  okResponse(res, loaiSK, 'Lấy chi tiết loại sự kiện thành công.');
};

/**
 * Cập nhật loại sự kiện theo ID.
 * @param {import('express').Request} req - Request object, chứa params.loaiSKId và body cập nhật
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với loại sự kiện đã cập nhật
 */
const updateLoaiSKByIdController = async (req, res) => {
  const updatedLoaiSK = await loaiSuKienService.updateLoaiSKById(
    parseInt(req.params.loaiSKId),
    req.body
  );
  okResponse(res, updatedLoaiSK, 'Cập nhật loại sự kiện thành công.');
};

/**
 * Xóa loại sự kiện theo ID.
 * @param {import('express').Request} req - Request object, chứa params.loaiSKId
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response no content khi xóa thành công
 */
const deleteLoaiSKByIdController = async (req, res) => {
  await loaiSuKienService.deleteLoaiSKById(parseInt(req.params.loaiSKId));
  noContentResponse(res, 'Xóa loại sự kiện thành công.');
};

export const loaiSuKienController = {
  createLoaiSKController,
  getLoaiSKsController,
  getLoaiSKByIdController,
  updateLoaiSKByIdController,
  deleteLoaiSKByIdController,
};
