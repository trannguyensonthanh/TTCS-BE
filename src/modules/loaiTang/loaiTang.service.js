// src/modules/loaiTang/loaiTang.service.js
import { loaiTangRepository } from './loaiTang.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import { transformKeysPascalToCamel } from '../../utils/pascal_camel.util.js';

/**
 * Tạo mới loại tầng.
 * @param {object} loaiTangBody - Dữ liệu loại tầng mới (maLoaiTang, tenLoaiTang, soThuTu, moTa)
 * @returns {Promise<object>} Loại tầng vừa tạo
 */
const createLoaiTang = async (loaiTangBody) => {
  const existingMa = await loaiTangRepository.getLoaiTangByMa(
    loaiTangBody.maLoaiTang
  );
  if (existingMa) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Mã loại tầng "${loaiTangBody.maLoaiTang}" đã tồn tại.`
    );
  }
  return loaiTangRepository.createLoaiTang(loaiTangBody);
};

/**
 * Lấy danh sách loại tầng (có lọc, phân trang, tìm kiếm).
 * @param {object} params - Tham số lọc, phân trang, sắp xếp (searchTerm, page, limit, sortBy, sortOrder)
 * @returns {Promise<{items: Array<object>, totalPages: number, currentPage: number, totalItems: number, pageSize: number}>}
 */
const getLoaiTangList = async (params) => {
  const { items, totalItems } =
    await loaiTangRepository.getLoaiTangListWithPagination(params);
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
 * Lấy chi tiết loại tầng theo ID.
 * @param {number} loaiTangID - ID loại tầng
 * @returns {Promise<object>} Thông tin loại tầng
 */
const getLoaiTangDetail = async (loaiTangID) => {
  const loaiTang = await loaiTangRepository.getLoaiTangById(loaiTangID);
  if (!loaiTang) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Loại tầng không tồn tại.');
  }
  return loaiTang;
};

/**
 * Cập nhật loại tầng theo ID.
 * @param {number} loaiTangID - ID loại tầng
 * @param {object} updateBody - Dữ liệu cập nhật (maLoaiTang, tenLoaiTang, soThuTu, moTa)
 * @returns {Promise<object>} Thông tin loại tầng đã cập nhật
 */
const updateLoaiTang = async (loaiTangID, updateBody) => {
  const currentLoaiTang = await getLoaiTangDetail(loaiTangID); // Kiểm tra tồn tại

  if (
    updateBody.maLoaiTang &&
    updateBody.maLoaiTang !== currentLoaiTang.MaLoaiTang
  ) {
    const existingMa = await loaiTangRepository.getLoaiTangByMa(
      updateBody.maLoaiTang
    );
    if (existingMa && existingMa.LoaiTangID !== loaiTangID) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Mã loại tầng "${updateBody.maLoaiTang}" đã được sử dụng.`
      );
    }
  }
  const updated = await loaiTangRepository.updateLoaiTangById(
    loaiTangID,
    updateBody
  );
  if (!updated) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Cập nhật loại tầng thất bại.'
    );
  }
  return updated;
};

/**
 * Xóa loại tầng theo ID.
 * @param {number} loaiTangID - ID loại tầng
 * @returns {Promise<void>} Không trả về dữ liệu nếu xóa thành công, ném lỗi nếu thất bại
 */
const deleteLoaiTang = async (loaiTangID) => {
  await getLoaiTangDetail(loaiTangID); // Kiểm tra tồn tại
  const rowsAffected = await loaiTangRepository.deleteLoaiTangById(loaiTangID);
  if (rowsAffected === 0) {
    // Trường hợp này ít xảy ra nếu getLoaiTangDetail đã thành công, trừ khi có race condition
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Xóa loại tầng thất bại hoặc loại tầng không tồn tại.'
    );
  }
  // Không có gì để trả về sau khi DELETE thành công (204)
};

export const loaiTangService = {
  createLoaiTang,
  getLoaiTangList,
  getLoaiTangDetail,
  updateLoaiTang,
  deleteLoaiTang,
};
