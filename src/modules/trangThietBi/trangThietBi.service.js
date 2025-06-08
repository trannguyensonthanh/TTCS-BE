// src/modules/danhMuc/trangThietBi.service.js
import { trangThietBiRepository } from './trangThietBi.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';

/**
 * Lấy danh sách trang thiết bị để chọn (select option).
 * @param {Object} params - Tham số truy vấn (searchTerm, limit).
 * @returns {Promise<Array>} Danh sách thiết bị phù hợp để chọn.
 */
const getTrangThietBisForSelect = async (params) => {
  const items =
    await trangThietBiRepository.getAllTrangThietBiForSelect(params);
  return items;
};

/**
 * Tạo mới một trang thiết bị.
 * @param {Object} trangThietBiBody - Dữ liệu thiết bị (tenThietBi, moTa).
 * @returns {Promise<Object>} Đối tượng thiết bị vừa tạo.
 * @throws {ApiError} Nếu tên thiết bị đã tồn tại.
 */
const createTrangThietBi = async (trangThietBiBody) => {
  // Kiểm tra TenThietBi đã tồn tại chưa (vì TenThietBi là UNIQUE trong CSDL)
  const existingTen = await trangThietBiRepository.getTrangThietBiByTen(
    trangThietBiBody.tenThietBi
  );
  if (existingTen) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Tên trang thiết bị "${trangThietBiBody.tenThietBi}" đã tồn tại.`
    );
  }
  // Không có MaThietBi trong payload theo định nghĩa FE
  return trangThietBiRepository.createTrangThietBi(trangThietBiBody);
};

/**
 * Lấy danh sách trang thiết bị (có phân trang, tìm kiếm).
 * @param {Object} params - Tham số truy vấn (searchTerm, page, limit, sortBy, sortOrder).
 * @returns {Promise<Object>} { items, totalPages, currentPage, totalItems, pageSize }
 */
const getTrangThietBiList = async (params) => {
  const { items, totalItems } =
    await trangThietBiRepository.getTrangThietBiListWithPagination(params);
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 10;
  const totalPages = Math.ceil(totalItems / limit);
  return { items, totalPages, currentPage: page, totalItems, pageSize: limit };
};

/**
 * Lấy chi tiết một trang thiết bị theo ID.
 * @param {number} thietBiID - ID thiết bị.
 * @returns {Promise<Object>} Đối tượng thiết bị.
 * @throws {ApiError} Nếu thiết bị không tồn tại.
 */
const getTrangThietBiDetail = async (thietBiID) => {
  const trangThietBi =
    await trangThietBiRepository.getTrangThietBiById(thietBiID);
  if (!trangThietBi) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trang thiết bị không tồn tại.');
  }
  return trangThietBi;
};

/**
 * Cập nhật thông tin thiết bị theo ID.
 * @param {number} thietBiID - ID thiết bị cần cập nhật.
 * @param {Object} updateBody - Dữ liệu cập nhật (tenThietBi, moTa).
 * @returns {Promise<Object>} Đối tượng thiết bị sau khi cập nhật.
 * @throws {ApiError} Nếu tên thiết bị đã được sử dụng hoặc cập nhật thất bại.
 */
const updateTrangThietBi = async (thietBiID, updateBody) => {
  const currentTrangThietBi = await getTrangThietBiDetail(thietBiID); // Kiểm tra tồn tại

  if (
    updateBody.tenThietBi &&
    updateBody.tenThietBi !== currentTrangThietBi.TenThietBi
  ) {
    const existingTen = await trangThietBiRepository.getTrangThietBiByTen(
      updateBody.tenThietBi
    );
    if (existingTen && existingTen.ThietBiID !== thietBiID) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Tên trang thiết bị "${updateBody.tenThietBi}" đã được sử dụng.`
      );
    }
  }

  const updated = await trangThietBiRepository.updateTrangThietBiById(
    thietBiID,
    updateBody
  );
  if (!updated) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Cập nhật trang thiết bị thất bại.'
    );
  }
  return updated;
};

/**
 * Xóa thiết bị theo ID.
 * @param {number} thietBiID - ID thiết bị cần xóa.
 * @returns {Promise<void>} Không trả về dữ liệu nếu xóa thành công.
 * @throws {ApiError} Nếu thiết bị không tồn tại hoặc xóa thất bại.
 */
const deleteTrangThietBi = async (thietBiID) => {
  await getTrangThietBiDetail(thietBiID); // Kiểm tra tồn tại
  const rowsAffected =
    await trangThietBiRepository.deleteTrangThietBiById(thietBiID);
  if (rowsAffected === 0) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Xóa trang thiết bị thất bại hoặc trang thiết bị không tồn tại.'
    );
  }
};

export const trangThietBiService = {
  getTrangThietBisForSelect,
  createTrangThietBi,
  getTrangThietBiList,
  getTrangThietBiDetail,
  updateTrangThietBi,
  deleteTrangThietBi,
};
