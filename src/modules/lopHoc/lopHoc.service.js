// src/modules/lopHoc/lopHoc.service.js
import { lopHocRepository } from './lopHoc.repository.js';
import { nganhHocRepository } from '../nganhHoc/nganhHoc.repository.js'; // Giả sử có để validate
import { chuyenNganhRepository } from '../chuyenNganh/chuyenNganh.repository.js'; // Giả sử có để validate
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import logger from '../../utils/logger.util.js';

/**
 * Lấy danh sách lớp học với phân trang.
 * @param {object} params - Tham số truy vấn (page, limit, filter, ...)
 * @returns {Promise<{items: Array<object>, totalPages: number, currentPage: number, totalItems: number, pageSize: number}>} Thông tin phân trang và danh sách lớp học
 */
const getLopHocList = async (params) => {
  const { items, totalItems } =
    await lopHocRepository.getLopHocListWithPagination(params);
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 10;
  const totalPages = Math.ceil(totalItems / limit);
  return { items, totalPages, currentPage: page, totalItems, pageSize: limit };
};

/**
 * Lấy chi tiết một lớp học theo ID.
 * @param {number} lopID - ID lớp học
 * @returns {Promise<object>} Thông tin chi tiết lớp học
 * @throws {ApiError} Nếu lớp học không tồn tại
 */
const getLopHocDetail = async (lopID) => {
  const lopHoc = await lopHocRepository.getLopHocDetailById(lopID);
  if (!lopHoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lớp học không tồn tại.');
  }
  return lopHoc;
};

/**
 * Tạo mới một lớp học.
 * @param {object} lopHocBody - Thông tin lớp học cần tạo
 * @returns {Promise<object>} Thông tin lớp học vừa tạo
 * @throws {ApiError} Nếu mã lớp đã tồn tại hoặc ngành/chuyên ngành không hợp lệ
 */
const createLopHoc = async (lopHocBody) => {
  // 1. Validate MaLop (nếu có) phải unique
  if (lopHocBody.maLop) {
    const existingMaLop = await lopHocRepository.getLopHocByMaLop(
      lopHocBody.maLop
    );
    if (existingMaLop) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Mã lớp "${lopHocBody.maLop}" đã tồn tại.`
      );
    }
  }

  // 2. Validate NganhHocID có tồn tại
  const nganhHoc = await nganhHocRepository.getNganhHocById(
    lopHocBody.nganhHocID
  );
  if (!nganhHoc) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Ngành học với ID "${lopHocBody.nganhHocID}" không tồn tại.`
    );
  }

  // 3. Validate ChuyenNganhID
  if (lopHocBody.chuyenNganhID) {
    const chuyenNganh = await chuyenNganhRepository.getChuyenNganhById(
      lopHocBody.chuyenNganhID
    );
    if (!chuyenNganh) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Chuyên ngành với ID "${lopHocBody.chuyenNganhID}" không tồn tại.`
      );
    }
    // Kiểm tra chuyên ngành có thuộc ngành học đã chọn không
    if (chuyenNganh.NganhHocID !== lopHocBody.nganhHocID) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Chuyên ngành "${chuyenNganh.TenChuyenNganh}" không thuộc ngành học "${nganhHoc.TenNganhHoc}".`
      );
    }
    // Kiểm tra ngành học đó có cho phép chia chuyên ngành không
    if (!nganhHoc.coChuyenNganh) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Ngành học "${nganhHoc.tenNganhHoc}" không được cấu hình để có chuyên ngành.`
      );
    }
  } else {
    if (nganhHoc.coChuyenNganh) {
      logger.warn(
        `Lớp được tạo cho ngành "${nganhHoc.tenNganhHoc}" mà không có chuyên ngành cụ thể, dù ngành này có chia chuyên ngành.`
      );
    }
  }

  const newLopID = await lopHocRepository.createLopHocRecord(lopHocBody);
  logger.info(`New LopHoc created with ID: ${newLopID}`);

  // Lấy lại chi tiết đầy đủ để trả về
  const lopHocDetail = await lopHocRepository.getLopHocDetailById(newLopID);
  if (!lopHocDetail) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Tạo lớp học thành công nhưng không thể lấy chi tiết.'
    );
  }
  return lopHocDetail;
};

/**
 * Cập nhật thông tin một lớp học theo ID.
 * @param {number} lopID - ID lớp học
 * @param {object} updateBody - Thông tin cập nhật lớp học
 * @returns {Promise<object>} Thông tin lớp học sau khi cập nhật
 * @throws {ApiError} Nếu lớp học không tồn tại hoặc dữ liệu không hợp lệ
 */
const updateLopHoc = async (lopID, updateBody) => {
  const currentLopHoc = await lopHocRepository.getLopHocDetailById(lopID);
  if (!currentLopHoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lớp học không tồn tại.');
  }

  // 1. Validate MaLop
  if (updateBody.maLop && updateBody.maLop !== currentLopHoc.maLop) {
    const existingMaLop = await lopHocRepository.getLopHocByMaLop(
      updateBody.maLop,
      lopID
    );
    if (existingMaLop) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Mã lớp "${updateBody.maLop}" đã tồn tại.`
      );
    }
  }

  // 2. Xác định NganhHocID mới hoặc cũ để validate ChuyenNganhID
  const finalNganhHocID =
    updateBody.nganhHocID !== undefined
      ? updateBody.nganhHocID
      : currentLopHoc.nganhHoc.nganhHocID;
  let nganhHoc;
  if (
    updateBody.nganhHocID !== undefined &&
    updateBody.nganhHocID !== currentLopHoc.nganhHoc.nganhHocID
  ) {
    nganhHoc = await nganhHocRepository.getNganhHocById(finalNganhHocID);
    if (!nganhHoc) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Ngành học mới với ID "${finalNganhHocID}" không tồn tại.`
      );
    }
  } else {
    nganhHoc = await nganhHocRepository.getNganhHocById(finalNganhHocID);
  }

  // 3. Validate ChuyenNganhID
  if (updateBody.chuyenNganhID !== undefined) {
    if (updateBody.chuyenNganhID !== null) {
      const chuyenNganh = await chuyenNganhRepository.getChuyenNganhById(
        updateBody.chuyenNganhID
      );
      if (!chuyenNganh) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Chuyên ngành với ID "${updateBody.chuyenNganhID}" không tồn tại.`
        );
      }
      if (chuyenNganh.NganhHocID !== finalNganhHocID) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Chuyên ngành "${chuyenNganh.TenChuyenNganh}" không thuộc ngành học có ID "${finalNganhHocID}".`
        );
      }
      if (!nganhHoc.coChuyenNganh) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Ngành học "${nganhHoc.tenNganhHoc}" không được cấu hình để có chuyên ngành.`
        );
      }
    } else {
      updateBody.chuyenNganhID === null;
    }
  } else if (
    updateBody.nganhHocID !== undefined &&
    updateBody.nganhHocID !== currentLopHoc.nganhHoc.nganhHocID
  ) {
    if (currentLopHoc.chuyenNganh && currentLopHoc.chuyenNganh.chuyenNganhID) {
      const oldChuyenNganh = await chuyenNganhRepository.getChuyenNganhById(
        currentLopHoc.chuyenNganh.chuyenNganhID
      );
      if (oldChuyenNganh && oldChuyenNganh.NganhHocID !== finalNganhHocID) {
        if (updateBody.chuyenNganhID === undefined) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Khi thay đổi Ngành học, bạn phải chỉ định Chuyên ngành mới (hoặc đặt là null nếu không có).'
          );
        }
      }
    }
  }

  const updatedResult = await lopHocRepository.updateLopHocRecordById(
    lopID,
    updateBody
  );
  if (!updatedResult || !updatedResult.LopID) {
    logger.warn(
      `Update LopHoc ID: ${lopID} resulted in no direct changes to LopHoc table or failed to return ID.`
    );
  }

  logger.info(`LopHoc updated with ID: ${lopID}`);
  return lopHocRepository.getLopHocDetailById(lopID);
};

/**
 * Xóa một lớp học theo ID.
 * @param {number} lopID - ID lớp học
 * @returns {Promise<void>}
 * @throws {ApiError} Nếu lớp học không tồn tại, đang được sử dụng hoặc xóa thất bại
 */
const deleteLopHoc = async (lopID) => {
  const existingLopHoc = await lopHocRepository.getLopHocDetailById(lopID);
  if (!existingLopHoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lớp học không tồn tại.');
  }
  const isUsed =
    await lopHocRepository.checkLopHocUsageInThongTinSinhVien(lopID);
  if (isUsed) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Lớp học này đang có sinh viên và không thể xóa. Vui lòng chuyển sinh viên sang lớp khác hoặc xóa sinh viên trước.'
    );
  }
  const rowsAffected = await lopHocRepository.deleteLopHocRecordById(lopID);
  if (rowsAffected === 0) {
    logger.warn(
      `Attempted to delete LopHoc ID: ${lopID} but no rows were affected (already deleted or race condition).`
    );
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Xóa lớp học thất bại, lớp không tìm thấy hoặc đã được xóa.'
    );
  }
  logger.info(`LopHoc deleted with ID: ${lopID}`);
};

export const lopHocService = {
  getLopHocList,
  getLopHocDetail,
  createLopHoc,
  updateLopHoc,
  deleteLopHoc,
};
