// src/modules/loaiSuKien/loaiSuKien.controller.js
import { loaiSuKienService } from './loaiSuKien.service.js';
import {
  createdResponse,
  okResponse,
  noContentResponse,
} from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

const createLoaiSKController = async (req, res) => {
  const loaiSK = await loaiSuKienService.createLoaiSK(req.body);
  createdResponse(res, loaiSK, 'Tạo loại sự kiện thành công.');
};

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

const getLoaiSKByIdController = async (req, res) => {
  const loaiSK = await loaiSuKienService.getLoaiSKById(
    parseInt(req.params.loaiSKId)
  );
  okResponse(res, loaiSK, 'Lấy chi tiết loại sự kiện thành công.');
};

const updateLoaiSKByIdController = async (req, res) => {
  const updatedLoaiSK = await loaiSuKienService.updateLoaiSKById(
    parseInt(req.params.loaiSKId),
    req.body
  );
  okResponse(res, updatedLoaiSK, 'Cập nhật loại sự kiện thành công.');
};

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
