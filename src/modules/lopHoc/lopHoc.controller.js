// src/modules/lopHoc/lopHoc.controller.js
import { lopHocService } from './lopHoc.service.js';
import {
  okResponse,
  createdResponse,
  noContentResponse,
} from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Lấy danh sách lớp học (có lọc, phân trang, tìm kiếm).
 * @param {import('express').Request} req - Request object, chứa query filter
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với danh sách lớp học
 */
const getLopHocListController = async (req, res) => {
  const params = pick(req.query, [
    'searchTerm',
    'nganhHocID',
    'chuyenNganhID',
    'khoaQuanLyID',
    'nienKhoa',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await lopHocService.getLopHocList(params);
  okResponse(res, result, 'Lấy danh sách lớp học thành công.');
};

/**
 * Lấy chi tiết lớp học theo ID.
 * @param {import('express').Request} req - Request object, chứa params.id
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với chi tiết lớp học
 */
const getLopHocDetailController = async (req, res) => {
  const lopHoc = await lopHocService.getLopHocDetail(parseInt(req.params.id));
  okResponse(res, lopHoc, 'Lấy chi tiết lớp học thành công.');
};

/**
 * Tạo mới lớp học.
 * @param {import('express').Request} req - Request object, chứa body lớp học mới
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với lớp học vừa tạo
 */
const createLopHocController = async (req, res) => {
  const lopHoc = await lopHocService.createLopHoc(req.body); // req.body đã được validate
  createdResponse(res, lopHoc, 'Tạo lớp học thành công.');
};

/**
 * Cập nhật thông tin lớp học.
 * @param {import('express').Request} req - Request object, chứa params.id và body cập nhật
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response với lớp học đã cập nhật
 */
const updateLopHocController = async (req, res) => {
  const lopID = parseInt(req.params.id);
  const updatedLopHoc = await lopHocService.updateLopHoc(lopID, req.body); // req.body đã validate
  okResponse(res, updatedLopHoc, 'Cập nhật thông tin lớp học thành công.');
};

/**
 * Xóa lớp học.
 * @param {import('express').Request} req - Request object, chứa params.id
 * @param {import('express').Response} res - Response object
 * @returns {Promise<void>} Trả về response no content khi xóa thành công
 */
const deleteLopHocController = async (req, res) => {
  const lopID = parseInt(req.params.id);
  await lopHocService.deleteLopHoc(lopID);
  noContentResponse(res, 'Xóa lớp học thành công.'); // Trả về 204 No Content
};

export const lopHocController = {
  getLopHocListController,
  getLopHocDetailController,
  createLopHocController,
  updateLopHocController,
  deleteLopHocController,
};
