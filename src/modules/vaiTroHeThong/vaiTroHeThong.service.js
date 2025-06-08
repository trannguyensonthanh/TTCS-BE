// src/modules/vaiTroHeThong/vaiTroHeThong.service.js
import { vaiTroHeThongRepository } from './vaiTroHeThong.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import logger from '../../utils/logger.util.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

/**
 * Lấy danh sách vai trò hệ thống (có phân trang, tìm kiếm).
 * @param {Object} params - Tham số truy vấn (searchTerm, page, limit, sortBy, sortOrder).
 * @returns {Promise<Object>} { items, totalPages, currentPage, totalItems, pageSize }
 */
const getVaiTroList = async (params) => {
  const { items, totalItems } =
    await vaiTroHeThongRepository.getVaiTroHeThongListWithPagination(params);
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 10;
  const totalPages = Math.ceil(totalItems / limit);
  return { items, totalPages, currentPage: page, totalItems, pageSize: limit };
};

/**
 * Lấy chi tiết một vai trò hệ thống theo ID.
 * @param {number} vaiTroId - ID vai trò.
 * @returns {Promise<Object>} Đối tượng vai trò hệ thống.
 * @throws {ApiError} Nếu vai trò không tồn tại.
 */
const getVaiTroDetail = async (vaiTroId) => {
  const vaiTro = await vaiTroHeThongRepository.getVaiTroHeThongById(vaiTroId);
  if (!vaiTro) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Vai trò hệ thống không tồn tại.');
  }
  return vaiTro;
};

/**
 * Tạo mới một vai trò hệ thống.
 * @param {object} vaiTroBody - Dữ liệu vai trò (maVaiTro, tenVaiTro, moTaVT).
 * @returns {Promise<Object>} Đối tượng vai trò hệ thống vừa tạo.
 * @throws {ApiError} Nếu mã vai trò đã tồn tại.
 */
const createVaiTro = async (vaiTroBody) => {
  const existingMa = await vaiTroHeThongRepository.getVaiTroHeThongByMa(
    vaiTroBody.maVaiTro
  );
  if (existingMa) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Mã vai trò "${vaiTroBody.maVaiTro}" đã tồn tại.`
    );
  }
  // 2. Kiểm tra TenVaiTro có thể cũng nên unique
  // const existingTen = await vaiTroHeThongRepository.getVaiTroHeThongByTen(vaiTroBody.tenVaiTro); // Cần hàm này
  // if (existingTen) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, `Tên vai trò "${vaiTroBody.tenVaiTro}" đã tồn tại.`);
  // }

  const newVaiTroID =
    await vaiTroHeThongRepository.createVaiTroHeThongRecord(vaiTroBody);
  logger.info(`New VaiTroHeThong created with ID: ${newVaiTroID}`);

  const vaiTroDetail =
    await vaiTroHeThongRepository.getVaiTroHeThongById(newVaiTroID);
  if (!vaiTroDetail) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Tạo vai trò thành công nhưng không thể lấy chi tiết.'
    );
  }
  return vaiTroDetail;
};

/**
 * Cập nhật thông tin vai trò hệ thống theo ID.
 * @param {number} vaiTroId - ID vai trò cần cập nhật.
 * @param {object} updateBody - Dữ liệu cập nhật (tenVaiTro, moTaVT).
 * @returns {Promise<Object>} Đối tượng vai trò hệ thống sau khi cập nhật.
 * @throws {ApiError} Nếu cập nhật thất bại hoặc không được phép thay đổi mã vai trò.
 */
const updateVaiTro = async (vaiTroId, updateBody) => {
  const currentVaiTro = await getVaiTroDetail(vaiTroId);

  if (updateBody.maVaiTro !== undefined) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Không được phép thay đổi Mã Vai Trò.'
    );
  }

  // Nếu TenVaiTro thay đổi, kiểm tra unique
  // if (updateBody.tenVaiTro && updateBody.tenVaiTro !== currentVaiTro.tenVaiTro) {
  //   const existingTen = await vaiTroHeThongRepository.getVaiTroHeThongByTen(updateBody.tenVaiTro, vaiTroId); // Cần hàm này
  //   if (existingTen) {
  //     throw new ApiError(httpStatus.BAD_REQUEST, `Tên vai trò "${updateBody.tenVaiTro}" đã tồn tại.`);
  //   }
  // }

  const updatedResult =
    await vaiTroHeThongRepository.updateVaiTroHeThongRecordById(
      vaiTroId,
      updateBody
    );
  if (!updatedResult) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Cập nhật vai trò hệ thống thất bại.'
    );
  }
  logger.info(`VaiTroHeThong updated with ID: ${vaiTroId}`);
  return vaiTroHeThongRepository.getVaiTroHeThongById(vaiTroId); // Lấy lại chi tiết đầy đủ
};

/**
 * Xóa vai trò hệ thống theo ID.
 * @param {number} vaiTroId - ID vai trò cần xóa.
 * @returns {Promise<void>} Không trả về dữ liệu nếu xóa thành công.
 * @throws {ApiError} Nếu vai trò không tồn tại, đang được sử dụng hoặc là vai trò cốt lõi.
 */
const deleteVaiTro = async (vaiTroId) => {
  // 1. Kiểm tra Vai Trò có tồn tại không
  const existingVaiTro =
    await vaiTroHeThongRepository.getVaiTroHeThongById(vaiTroId);
  if (!existingVaiTro) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Vai trò hệ thống không tồn tại.');
  }

  // 2. Kiểm tra ràng buộc: Vai trò có đang được sử dụng không
  const isUsed =
    await vaiTroHeThongRepository.checkVaiTroUsageInNguoiDungVaiTro(vaiTroId);
  if (isUsed) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Vai trò này đang được gán cho người dùng và không thể xóa. Vui lòng gỡ bỏ vai trò khỏi tất cả người dùng trước.'
    );
  }

  const CORE_ROLES_CANNOT_DELETE = [
    MaVaiTro.ADMIN_HE_THONG,
    MaVaiTro.BGH_DUYET_SK_TRUONG,
    MaVaiTro.QUAN_LY_CSVC,
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
  ];
  if (CORE_ROLES_CANNOT_DELETE.includes(existingVaiTro.maVaiTro)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Vai trò "${existingVaiTro.tenVaiTro}" là vai trò cốt lõi của hệ thống và không thể xóa.`
    );
  }

  const rowsAffected =
    await vaiTroHeThongRepository.deleteVaiTroHeThongRecordById(vaiTroId);
  if (rowsAffected === 0) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Xóa vai trò hệ thống thất bại.'
    );
  }
  logger.info(`VaiTroHeThong deleted with ID: ${vaiTroId}`);
};

export const vaiTroHeThongService = {
  getVaiTroList,
  getVaiTroDetail,
  createVaiTro,
  updateVaiTro,
  deleteVaiTro,
};
