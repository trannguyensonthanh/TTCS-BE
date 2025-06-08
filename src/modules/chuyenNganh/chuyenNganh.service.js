// src/modules/chuyenNganh/chuyenNganh.service.js
import { chuyenNganhRepository } from './chuyenNganh.repository.js';
import { nganhHocRepository } from '../nganhHoc/nganhHoc.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import logger from '../../utils/logger.util.js';

/**
 * Lấy danh sách chuyên ngành để chọn theo ngành học.
 * @param {number} nganhHocId - ID ngành học
 * @param {object} params - Tham số lọc (searchTerm, limit, ...)
 * @returns {Promise<Array<object>>} Danh sách chuyên ngành tối giản
 */
const getChuyenNganhListForSelectByNganh = async (nganhHocId, params) => {
  const nganhHoc = await nganhHocRepository.getNganhHocById(nganhHocId);
  if (!nganhHoc) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `Ngành học với ID "${nganhHocId}" không tồn tại.`
    );
  }
  if (!nganhHoc.coChuyenNganh) {
    logger.info(
      `Ngành học "${nganhHoc.tenNganhHoc}" không có chuyên ngành. Trả về danh sách rỗng.`
    );
    return [];
  }
  const items = await chuyenNganhRepository.getChuyenNganhForSelectByNganh(
    nganhHocId,
    params
  );
  return items;
};

/**
 * Lấy danh sách chuyên ngành của một ngành (có phân trang).
 * @param {number} nganhHocId - ID ngành học
 * @param {object} params - Tham số phân trang, tìm kiếm, sắp xếp
 * @returns {Promise<{items: Array<object>, totalPages: number, currentPage: number, totalItems: number, pageSize: number}>}
 */
const getChuyenNganhListByNganh = async (nganhHocId, params) => {
  const nganhHoc = await nganhHocRepository.getNganhHocById(nganhHocId);
  if (!nganhHoc) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `Ngành học với ID "${nganhHocId}" không tồn tại.`
    );
  }

  const { items, totalItems } =
    await chuyenNganhRepository.getChuyenNganhListByNganhWithPagination(
      nganhHocId,
      params
    );
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 10;
  const totalPages = Math.ceil(totalItems / limit);
  return { items, totalPages, currentPage: page, totalItems, pageSize: limit };
};

/**
 * Tạo chuyên ngành mới cho một ngành.
 * @param {number} nganhHocId - ID ngành học
 * @param {object} chuyenNganhBody - Dữ liệu chuyên ngành mới
 * @returns {Promise<object>} Thông tin chuyên ngành vừa tạo
 */
const createChuyenNganhForNganh = async (nganhHocId, chuyenNganhBody) => {
  // 1. Kiểm tra NganhHoc có tồn tại và có cho phép chuyên ngành không
  const nganhHoc = await nganhHocRepository.getNganhHocById(nganhHocId);
  if (!nganhHoc) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `Ngành học với ID "${nganhHocId}" không tồn tại.`
    );
  }
  if (!nganhHoc.coChuyenNganh) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Ngành học "${nganhHoc.tenNganhHoc}" không được phép có chuyên ngành.`
    );
  }

  // 2. Kiểm tra MaChuyenNganh (nếu có) có unique trong ngành đó không
  if (chuyenNganhBody.maChuyenNganh) {
    const existingMa = await chuyenNganhRepository.getChuyenNganhByMaTrongNganh(
      nganhHocId,
      chuyenNganhBody.maChuyenNganh
    );
    if (existingMa) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Mã chuyên ngành "${chuyenNganhBody.maChuyenNganh}" đã tồn tại trong ngành này.`
      );
    }
  }
  // 3. Kiểm tra TenChuyenNganh có unique trong ngành đó không (CSDL đã có UNIQUE constraint, nhưng check trước)
  // const existingTen = await chuyenNganhRepository.getChuyenNganhByTenTrongNganh(nganhHocId, chuyenNganhBody.tenChuyenNganh);
  // if (existingTen) { ... } => bổ sung sau nếu cần

  const newChuyenNganhID = await chuyenNganhRepository.createChuyenNganhRecord(
    nganhHocId,
    chuyenNganhBody
  );
  logger.info(
    `New ChuyenNganh created with ID: ${newChuyenNganhID} for NganhHocID: ${nganhHocId}`
  );

  return chuyenNganhRepository.getChuyenNganhDetailById(newChuyenNganhID);
};

/**
 * Lấy chi tiết một chuyên ngành.
 * @param {number} chuyenNganhID - ID chuyên ngành
 * @returns {Promise<object>} Thông tin chi tiết chuyên ngành
 */
const getChuyenNganhDetail = async (chuyenNganhID) => {
  const chuyenNganh =
    await chuyenNganhRepository.getChuyenNganhDetailById(chuyenNganhID);
  if (!chuyenNganh) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Chuyên ngành không tồn tại.');
  }
  return chuyenNganh;
};

/**
 * Cập nhật một chuyên ngành.
 * @param {number} chuyenNganhID - ID chuyên ngành
 * @param {object} updateBody - Dữ liệu cập nhật
 * @returns {Promise<object>} Thông tin chuyên ngành sau khi cập nhật
 */
const updateChuyenNganh = async (chuyenNganhID, updateBody) => {
  const currentChuyenNganh = await getChuyenNganhDetail(chuyenNganhID); // Kiểm tra tồn tại
  if (
    updateBody.maChuyenNganh &&
    updateBody.maChuyenNganh !== currentChuyenNganh.maChuyenNganh
  ) {
    const existingMa = await chuyenNganhRepository.getChuyenNganhByMaTrongNganh(
      currentChuyenNganh.nganhHoc.nganhHocID,
      updateBody.maChuyenNganh,
      chuyenNganhID
    );
    if (existingMa) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Mã chuyên ngành "${updateBody.maChuyenNganh}" đã được sử dụng trong ngành này.`
      );
    }
  }

  const updatedResult = await chuyenNganhRepository.updateChuyenNganhRecordById(
    chuyenNganhID,
    updateBody
  );
  if (!updatedResult) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Cập nhật chuyên ngành thất bại.'
    );
  }
  logger.info(`ChuyenNganh updated with ID: ${chuyenNganhID}`);
  return chuyenNganhRepository.getChuyenNganhDetailById(chuyenNganhID);
};

/**
 * Xóa một chuyên ngành.
 * @param {number} chuyenNganhID - ID chuyên ngành
 * @returns {Promise<void>} Không trả về dữ liệu nếu xóa thành công, ném lỗi nếu thất bại
 */
const deleteChuyenNganh = async (chuyenNganhID) => {
  await getChuyenNganhDetail(chuyenNganhID);
  const rowsAffected =
    await chuyenNganhRepository.deleteChuyenNganhRecordById(chuyenNganhID);
  if (rowsAffected === 0) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Xóa chuyên ngành thất bại.'
    );
  }
};

export const chuyenNganhService = {
  getChuyenNganhListForSelectByNganh,
  getChuyenNganhListByNganh,
  createChuyenNganhForNganh,
  getChuyenNganhDetail,
  updateChuyenNganh,
  deleteChuyenNganh,
};
