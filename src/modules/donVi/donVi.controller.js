// src/modules/donVi/donVi.controller.js
import { donViService } from './donVi.service.js';
import { okResponse, createdResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Lấy danh sách đơn vị (có lọc, phân trang, tìm kiếm).
 * @param {import('express').Request} req - Request object, chứa query filter
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với danh sách đơn vị
 */
const getDonViListController = async (req, res) => {
  const params = pick(req.query, [
    'searchTerm',
    'loaiDonVi',
    'donViChaID',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  if (params.loaiDonVi && typeof params.loaiDonVi === 'string') {
    params.loaiDonVi = params.loaiDonVi
      .split(',')
      .map((s) => s.trim().toUpperCase());
  }
  const result = await donViService.getDonViList(params);
  okResponse(res, result, 'Lấy danh sách đơn vị thành công.');
};

/**
 * Lấy chi tiết một đơn vị theo ID.
 * @param {import('express').Request} req - Request object, chứa params.donViId
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với chi tiết đơn vị
 */
const getDonViDetailController = async (req, res) => {
  const donVi = await donViService.getDonViDetail(parseInt(req.params.donViId));
  okResponse(res, donVi, 'Lấy chi tiết đơn vị thành công.');
};

/**
 * Tạo mới đơn vị.
 * @param {import('express').Request} req - Request object, chứa body đơn vị mới
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với đơn vị vừa tạo
 */
const createDonViController = async (req, res) => {
  const donVi = await donViService.createDonVi(req.body);
  createdResponse(res, donVi, 'Tạo đơn vị thành công.');
};

/**
 * Cập nhật thông tin đơn vị.
 * @param {import('express').Request} req - Request object, chứa params.donViId và body cập nhật
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với đơn vị đã cập nhật
 */
const updateDonViController = async (req, res) => {
  const updatedDonVi = await donViService.updateDonVi(
    parseInt(req.params.donViId),
    req.body
  );
  okResponse(res, updatedDonVi, 'Cập nhật đơn vị thành công.');
};

/**
 * Xóa đơn vị.
 * @param {import('express').Request} req - Request object, chứa params.donViId
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response no content khi xóa thành công
 */
const deleteDonViController = async (req, res) => {
  await donViService.deleteDonVi(parseInt(req.params.donViId));
  noContentResponse(res, 'Xóa đơn vị thành công.');
};

/**
 * Lấy danh sách loại đơn vị cho select.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} Trả về response với danh sách loại đơn vị
 */
const getLoaiDonViOptionsController = async (req, res) => {
  const result = await donViService.getLoaiDonViOptions();
  okResponse(res, result, 'Lấy danh sách loại đơn vị thành công.');
};

/**
 * Lấy danh sách đơn vị cha tiềm năng cho select.
 * @param {import('express').Request} req - Request object, chứa query filter
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với danh sách đơn vị cha tiềm năng
 */
const getDonViChaOptionsController = async (req, res) => {
  const params = pick(req.query, ['excludeDonViId', 'searchTerm', 'limit']);
  const result = await donViService.getDonViChaOptions(params);
  okResponse(res, result, 'Lấy danh sách đơn vị cha tiềm năng thành công.');
};

export const donViController = {
  getDonViListController,
  getDonViDetailController,
  createDonViController,
  updateDonViController,
  deleteDonViController,
  getLoaiDonViOptionsController,
  getDonViChaOptionsController,
};
