// src/modules/phongCRUD/phongCRUD.controller.js
import { phongCRUDService } from './phongCRUD.service.js';
import {
  createdResponse,
  noContentResponse,
  okResponse,
} from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';

/**
 * Lấy danh sách phòng (có phân trang, filter).
 * @param {Request} req - Express request (query: searchTerm, loaiPhongID, trangThaiPhongID, toaNhaID, toaNhaTangID, sucChuaTu, sucChuaDen, page, limit, sortBy, sortOrder)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response danh sách phòng
 */
const getPhongListController = async (req, res) => {
  const params = pick(req.query, [
    'searchTerm',
    'loaiPhongID',
    'trangThaiPhongID',
    'toaNhaID',
    'toaNhaTangID',
    'sucChuaTu',
    'sucChuaDen',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await phongCRUDService.getPhongs(params);
  okResponse(res, result, 'Lấy danh sách phòng thành công.');
};

/**
 * Lấy chi tiết một phòng theo ID.
 * @param {Request} req - Express request (params: id)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response chi tiết phòng
 */
const getPhongDetailController = async (req, res) => {
  const phong = await phongCRUDService.getPhongDetail(parseInt(req.params.id));
  okResponse(res, phong, 'Lấy chi tiết phòng thành công.');
};

/**
 * Tạo mới một phòng.
 * @param {Request} req - Express request (body: thông tin phòng)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response phòng vừa tạo
 */
const createPhongController = async (req, res) => {
  const phongBody = req.body; // Đã được validate
  const newPhong = await phongCRUDService.createPhong(phongBody);
  createdResponse(res, newPhong, 'Tạo phòng mới thành công.');
};

/**
 * Cập nhật thông tin phòng theo ID.
 * @param {Request} req - Express request (params: id, body: thông tin cập nhật)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response phòng sau khi cập nhật
 */
const updatePhongController = async (req, res) => {
  const phongID = parseInt(req.params.id);
  const updateBody = req.body; // Đã validate
  const updatedPhong = await phongCRUDService.updatePhong(phongID, updateBody);
  okResponse(res, updatedPhong, 'Cập nhật thông tin phòng thành công.');
};

/**
 * Xóa một phòng theo ID.
 * @param {Request} req - Express request (params: id)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response xác nhận xóa phòng
 */
const deletePhongController = async (req, res) => {
  const phongID = parseInt(req.params.id);
  await phongCRUDService.deletePhong(phongID);
  noContentResponse(res, 'Xóa phòng thành công.'); // Trả về 204 No Content
};

/**
 * Sinh mã phòng tự động dựa trên các tham số.
 * @param {Request} req - Express request (query: toaNhaTangID, loaiPhongID, soThuTuPhong, phongID)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response mã phòng sinh tự động
 */
const generateMaPhongController = async (req, res) => {
  const params = pick(req.query, [
    'toaNhaTangID',
    'loaiPhongID',
    'soThuTuPhong',
    'phongID',
  ]);
  const result = await phongCRUDService.generateMaPhong(params);
  okResponse(res, result, result.message);
};

const importPhongFromExcelController = async (req, res) => {
  if (!req.file) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Không có file Excel nào được tải lên.'
    );
  }
  // req.file.path là đường dẫn đến file đã upload (nếu dùng diskStorage của multer)
  const result = await phongCRUDService.importPhongFromExcel(req.file.path);
  okResponse(res, result, result.overallMessage);
};

export const phongCRUDController = {
  // Đổi tên export
  getPhongListController,
  getPhongDetailController,
  createPhongController,
  updatePhongController,
  deletePhongController,
  generateMaPhongController,
  importPhongFromExcelController,
};
