// src/modules/danhMuc/toaNha.controller.js
import { toaNhaService } from './toaNha.service.js';
import {
  createdResponse,
  okResponse,
  noContentResponse,
} from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Tạo mới một tòa nhà.
 * @param {import('express').Request} req - Express request (body: thông tin tòa nhà)
 * @param {import('express').Response} res - Express response
 */
const createToaNhaController = async (req, res) => {
  const toaNha = await toaNhaService.createToaNha(req.body);
  createdResponse(res, toaNha, 'Tạo tòa nhà thành công.');
};

/**
 * Lấy danh sách tòa nhà (có lọc, phân trang).
 * @param {import('express').Request} req - Express request (query: filter, phân trang)
 * @param {import('express').Response} res - Express response
 */
const getToaNhaListController = async (req, res) => {
  const params = pick(req.query, [
    'searchTerm',
    'coSoID',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await toaNhaService.getToaNhaList(params);
  okResponse(res, result, 'Lấy danh sách tòa nhà thành công.');
};

/**
 * Lấy chi tiết một tòa nhà theo ID.
 * @param {import('express').Request} req - Express request (params: id)
 * @param {import('express').Response} res - Express response
 */
const getToaNhaDetailController = async (req, res) => {
  const toaNha = await toaNhaService.getToaNhaDetail(parseInt(req.params.id));
  okResponse(res, toaNha, 'Lấy chi tiết tòa nhà thành công.');
};

/**
 * Cập nhật thông tin một tòa nhà theo ID.
 * @param {import('express').Request} req - Express request (params: id, body: thông tin cập nhật)
 * @param {import('express').Response} res - Express response
 */
const updateToaNhaController = async (req, res) => {
  const updatedToaNha = await toaNhaService.updateToaNha(
    parseInt(req.params.id),
    req.body
  );
  okResponse(res, updatedToaNha, 'Cập nhật tòa nhà thành công.');
};

/**
 * Xóa một tòa nhà theo ID.
 * @param {import('express').Request} req - Express request (params: id)
 * @param {import('express').Response} res - Express response
 */
const deleteToaNhaController = async (req, res) => {
  await toaNhaService.deleteToaNha(parseInt(req.params.id));
  noContentResponse(res, 'Xóa tòa nhà thành công.');
};

export const toaNhaController = {
  createToaNhaController,
  getToaNhaListController,
  getToaNhaDetailController,
  updateToaNhaController,
  deleteToaNhaController,
};
