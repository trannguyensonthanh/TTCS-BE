// src/modules/loaiSuKien/loaiSuKien.service.js
import { loaiSuKienRepository } from './loaiSuKien.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import { transformKeysPascalToCamel } from '../../utils/pascal_camel.util.js';

/**
 * Tạo mới loại sự kiện.
 * @param {object} loaiSKBody - Dữ liệu loại sự kiện mới (maLoaiSK, tenLoaiSK, moTaLoaiSK, isActive)
 * @returns {Promise<object>} Loại sự kiện vừa tạo
 */
const createLoaiSK = async (loaiSKBody) => {
  // Kiểm tra MaLoaiSK đã tồn tại chưa
  const existingMa = await loaiSuKienRepository.getLoaiSKByMa(
    loaiSKBody.maLoaiSK
  );
  if (existingMa) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mã loại sự kiện đã tồn tại.');
  }
  return loaiSuKienRepository.createLoaiSK(
    loaiSKBody.maLoaiSK,
    loaiSKBody.tenLoaiSK,
    loaiSKBody.moTaLoaiSK,
    loaiSKBody.isActive !== undefined ? loaiSKBody.isActive : true
  );
};

/**
 * Lấy danh sách loại sự kiện (có lọc, phân trang, tìm kiếm).
 * @param {object} params - Tham số lọc, phân trang, sắp xếp (searchTerm, isActive, page, limit, sortBy, sortOrder)
 * @returns {Promise<{items: Array<object>, totalPages: number, currentPage: number, totalItems: number, pageSize: number}>}
 */
const getLoaiSKs = async (params) => {
  console.log('params', params);
  const { items, totalItems } = await loaiSuKienRepository.getAllLoaiSK(params);
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 10;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items: transformKeysPascalToCamel(items),
    totalPages,
    currentPage: page,
    totalItems,
    pageSize: limit,
  };
};

/**
 * Lấy chi tiết loại sự kiện theo ID.
 * @param {number} loaiSuKienID - ID loại sự kiện
 * @returns {Promise<object>} Thông tin loại sự kiện
 */
const getLoaiSKById = async (loaiSuKienID) => {
  const loaiSK = await loaiSuKienRepository.getLoaiSKById(loaiSuKienID);
  if (!loaiSK) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Loại sự kiện không tồn tại.');
  }
  return loaiSK;
};

/**
 * Cập nhật loại sự kiện theo ID.
 * @param {number} loaiSuKienID - ID loại sự kiện
 * @param {object} updateBody - Dữ liệu cập nhật (maLoaiSK, tenLoaiSK, moTaLoaiSK, isActive)
 * @returns {Promise<object>} Thông tin loại sự kiện đã cập nhật
 */
const updateLoaiSKById = async (loaiSuKienID, updateBody) => {
  const loaiSK = await getLoaiSKById(loaiSuKienID); // Kiểm tra tồn tại trước
  if (updateBody.maLoaiSK && updateBody.maLoaiSK !== loaiSK.MaLoaiSK) {
    const existingMa = await loaiSuKienRepository.getLoaiSKByMa(
      updateBody.maLoaiSK
    );
    if (existingMa) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Mã loại sự kiện mới đã tồn tại.'
      );
    }
  }
  const updatedLoaiSK = await loaiSuKienRepository.updateLoaiSKById(
    loaiSuKienID,
    updateBody
  );
  if (!updatedLoaiSK) {
    // Có thể xảy ra nếu ID không đúng và query không tìm thấy để update
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Loại sự kiện không tồn tại hoặc không có gì được cập nhật.'
    );
  }
  return updatedLoaiSK;
};

/**
 * Xóa loại sự kiện theo ID.
 * @param {number} loaiSuKienID - ID loại sự kiện
 * @returns {Promise<void>} Không trả về dữ liệu nếu xóa thành công, ném lỗi nếu thất bại
 */
const deleteLoaiSKById = async (loaiSuKienID) => {
  await getLoaiSKById(loaiSuKienID); // Kiểm tra tồn tại trước khi xóa
  await loaiSuKienRepository.deleteLoaiSKById(loaiSuKienID);
  // Không có gì để trả về sau khi DELETE
};

export const loaiSuKienService = {
  createLoaiSK,
  getLoaiSKs,
  getLoaiSKById,
  updateLoaiSKById,
  deleteLoaiSKById,
};
