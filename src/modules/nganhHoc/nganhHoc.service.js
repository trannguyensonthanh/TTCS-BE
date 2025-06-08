// src/modules/nganhHoc/nganhHoc.service.js
import logger from '../../utils/logger.util.js';
import { nganhHocRepository } from './nganhHoc.repository.js';

/**
 * Lấy danh sách ngành học cho select option.
 * @param {object} params - Tham số truy vấn (searchTerm, khoaQuanLyID, limit)
 * @returns {Promise<Array<object>>} Danh sách ngành học tối giản
 */
const getNganhHocListForSelect = async (params) => {
  const items = await nganhHocRepository.getNganhHocForSelect(params);
  return items;
};

/**
 * Tạo mới một ngành học.
 * @param {object} nganhHocBody - Thông tin ngành học cần tạo
 * @returns {Promise<object>} Thông tin ngành học vừa tạo
 * @throws {ApiError} Nếu mã ngành học đã tồn tại hoặc khoa quản lý không hợp lệ
 */
const createNganhHoc = async (nganhHocBody) => {
  if (nganhHocBody.maNganhHoc) {
    const existingMa = await nganhHocRepository.getNganhHocByMa(
      nganhHocBody.maNganhHoc
    );
    if (existingMa) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Mã ngành học "${nganhHocBody.maNganhHoc}" đã tồn tại.`
      );
    }
  }
  const khoa = await donViRepository.getDonViById(nganhHocBody.khoaQuanLyID);
  if (!khoa) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Khoa quản lý với ID "${nganhHocBody.khoaQuanLyID}" không tồn tại.`
    );
  }
  if (khoa.LoaiDonVi !== LoaiDonVi.KHOA) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Đơn vị với ID "${nganhHocBody.khoaQuanLyID}" không phải là một Khoa.`
    );
  }
  const newNganhHocID =
    await nganhHocRepository.createNganhHocRecord(nganhHocBody);
  logger.info(`New NganhHoc created with ID: ${newNganhHocID}`);
  return nganhHocRepository.getNganhHocById(newNganhHocID, true);
};

/**
 * Lấy danh sách ngành học (có phân trang, filter).
 * @param {object} params - Tham số truy vấn (searchTerm, khoaQuanLyID, coChuyenNganh, page, limit, sortBy, sortOrder)
 * @returns {Promise<{items: Array<object>, totalPages: number, currentPage: number, totalItems: number, pageSize: number}>}
 */
const getNganhHocList = async (params) => {
  const { items, totalItems } =
    await nganhHocRepository.getNganhHocListWithPagination(params);
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 10;
  const totalPages = Math.ceil(totalItems / limit);
  return { items, totalPages, currentPage: page, totalItems, pageSize: limit };
};

/**
 * Lấy chi tiết một ngành học theo ID.
 * @param {number} nganhHocID - ID ngành học
 * @returns {Promise<object>} Thông tin chi tiết ngành học
 * @throws {ApiError} Nếu ngành học không tồn tại
 */
const getNganhHocDetail = async (nganhHocID) => {
  const nganhHoc = await nganhHocRepository.getNganhHocById(nganhHocID, true);
  if (!nganhHoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ngành học không tồn tại.');
  }
  return nganhHoc;
};

/**
 * Cập nhật thông tin một ngành học theo ID.
 * @param {number} nganhHocID - ID ngành học
 * @param {object} updateBody - Thông tin cập nhật ngành học
 * @returns {Promise<object>} Thông tin ngành học sau khi cập nhật
 * @throws {ApiError} Nếu dữ liệu không hợp lệ hoặc cập nhật thất bại
 */
const updateNganhHoc = async (nganhHocID, updateBody) => {
  const currentNganhHoc = await getNganhHocDetail(nganhHocID);
  if (
    updateBody.maNganhHoc &&
    updateBody.maNganhHoc !== currentNganhHoc.maNganhHoc
  ) {
    const existingMa = await nganhHocRepository.getNganhHocByMa(
      updateBody.maNganhHoc,
      nganhHocID
    );
    if (existingMa) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Mã ngành học "${updateBody.maNganhHoc}" đã được sử dụng.`
      );
    }
  }
  if (
    updateBody.khoaQuanLyID &&
    updateBody.khoaQuanLyID !== currentNganhHoc.khoaQuanLy.donViID
  ) {
    const khoa = await donViRepository.getDonViById(updateBody.khoaQuanLyID);
    if (!khoa || khoa.LoaiDonVi !== LoaiDonVi.KHOA) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Khoa quản lý mới không hợp lệ.'
      );
    }
  }
  if (
    updateBody.coChuyenNganh === false &&
    currentNganhHoc.coChuyenNganh === true
  ) {
    const chuyenNganhs = currentNganhHoc.chuyenNganhs || [];
    if (chuyenNganhs.length > 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Không thể bỏ cờ "Có chuyên ngành" vì ngành này đang có các chuyên ngành con. Vui lòng xóa các chuyên ngành trước.'
      );
    }
  }
  const updatedResult = await nganhHocRepository.updateNganhHocRecordById(
    nganhHocID,
    updateBody
  );
  if (!updatedResult) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Cập nhật ngành học thất bại.'
    );
  }
  logger.info(`NganhHoc updated with ID: ${nganhHocID}`);
  return nganhHocRepository.getNganhHocById(nganhHocID, true);
};

/**
 * Xóa một ngành học theo ID.
 * @param {number} nganhHocID - ID ngành học
 * @returns {Promise<void>}
 * @throws {ApiError} Nếu ngành học không tồn tại hoặc xóa thất bại
 */
const deleteNganhHoc = async (nganhHocID) => {
  await getNganhHocDetail(nganhHocID);
  const rowsAffected =
    await nganhHocRepository.deleteNganhHocRecordById(nganhHocID);
  if (rowsAffected === 0) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Xóa ngành học thất bại.'
    );
  }
};

export const nganhHocService = {
  getNganhHocListForSelect,
  createNganhHoc,
  getNganhHocList,
  getNganhHocDetail,
  updateNganhHoc,
  deleteNganhHoc,
};
