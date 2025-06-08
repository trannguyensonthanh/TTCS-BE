// src/modules/toaNhaTang/toaNhaTang.controller.js
import { toaNhaTangService } from './toaNhaTang.service.js';
import {
  createdResponse,
  okResponse,
  noContentResponse,
} from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Tạo mới tầng vật lý cho tòa nhà.
 * @param {Object} req - Request Express, chứa params.toaNhaId và body thông tin tầng.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response tầng vừa tạo.
 */
const createToaNhaTangController = async (req, res) => {
  const { toaNhaId } = req.params;
  const toaNhaTang = await toaNhaTangService.createToaNhaTang(
    parseInt(toaNhaId),
    req.body
  );
  createdResponse(res, toaNhaTang, 'Thêm tầng vật lý vào tòa nhà thành công.');
};

/**
 * Lấy danh sách tầng vật lý của tòa nhà (có phân trang, tìm kiếm).
 * @param {Object} req - Request Express, chứa params.toaNhaId và query filter.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response danh sách tầng.
 */
const getToaNhaTangListController = async (req, res) => {
  const { toaNhaId } = req.params;
  const queryParams = pick(req.query, [
    'searchTerm',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await toaNhaTangService.getToaNhaTangList(
    parseInt(toaNhaId),
    queryParams
  );
  okResponse(res, result, 'Lấy danh sách tầng của tòa nhà thành công.');
};

/**
 * Lấy chi tiết một tầng vật lý theo ID.
 * @param {Object} req - Request Express, chứa params.toaNhaTangId.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response chi tiết tầng.
 */
const getToaNhaTangDetailController = async (req, res) => {
  const toaNhaTang = await toaNhaTangService.getToaNhaTangDetail(
    parseInt(req.params.toaNhaTangId)
  );
  okResponse(res, toaNhaTang, 'Lấy chi tiết tầng vật lý thành công.');
};

/**
 * Cập nhật thông tin tầng vật lý theo ID.
 * @param {Object} req - Request Express, chứa params.toaNhaTangId và body cập nhật.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response tầng đã cập nhật.
 */
const updateToaNhaTangController = async (req, res) => {
  const updatedToaNhaTang = await toaNhaTangService.updateToaNhaTang(
    parseInt(req.params.toaNhaTangId),
    req.body
  );
  okResponse(
    res,
    updatedToaNhaTang,
    'Cập nhật thông tin tầng vật lý thành công.'
  );
};

/**
 * Xóa tầng vật lý theo ID.
 * @param {Object} req - Request Express, chứa params.toaNhaTangId.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response không có nội dung nếu xóa thành công.
 */
const deleteToaNhaTangController = async (req, res) => {
  await toaNhaTangService.deleteToaNhaTang(parseInt(req.params.toaNhaTangId));
  noContentResponse(res, 'Xóa tầng vật lý thành công.');
};

/**
 * Lấy danh sách tầng vật lý để chọn (select option).
 * @param {Object} req - Request Express, chứa query: toaNhaID, searchTerm, limit.
 * @param {Object} res - Response Express.
 * @returns {void} Trả về response danh sách tầng vật lý phù hợp để chọn.
 */
const getToaNhaTangListForSelectController = async (req, res) => {
  const params = pick(req.query, ['toaNhaID', 'searchTerm', 'limit']);
  const result = await toaNhaTangService.getToaNhaTangsForSelect(params);
  okResponse(res, result, 'Lấy danh sách tầng vật lý để chọn thành công.');
};

export const toaNhaTangController = {
  createToaNhaTangController,
  getToaNhaTangListController,
  getToaNhaTangDetailController,
  updateToaNhaTangController,
  deleteToaNhaTangController,
  getToaNhaTangListForSelectController,
};
