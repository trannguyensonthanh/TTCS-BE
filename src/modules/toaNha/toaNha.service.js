// src/modules/danhMuc/toaNha.service.js
import { toaNhaRepository } from './toaNha.repository.js';
import { donViRepository } from '../donVi/donVi.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import LoaiDonVi from '../../enums/loaiDonVi.enum.js';

/**
 * Tạo mới một tòa nhà.
 * @param {Object} toaNhaBody - Dữ liệu tòa nhà cần tạo.
 * @param {string} toaNhaBody.maToaNha - Mã tòa nhà (duy nhất).
 * @param {string} toaNhaBody.tenToaNha - Tên tòa nhà.
 * @param {string} toaNhaBody.coSoID - ID cơ sở liên kết (phải là loại 'CO_SO').
 * @param {string} [toaNhaBody.moTaToaNha] - Mô tả tòa nhà (tùy chọn).
 * @returns {Promise<Object>} Đối tượng tòa nhà vừa tạo kèm thông tin cơ sở.
 * @throws {ApiError} Nếu mã tòa nhà đã tồn tại hoặc cơ sở không hợp lệ.
 */
const createToaNha = async (toaNhaBody) => {
  const existingMa = await toaNhaRepository.getToaNhaByMa(toaNhaBody.maToaNha);
  if (existingMa) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Mã tòa nhà "${toaNhaBody.maToaNha}" đã tồn tại.`
    );
  }
  const coSo = await donViRepository.getDonViById(toaNhaBody.coSoID);
  if (!coSo) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cơ sở với ID "${toaNhaBody.coSoID}" không tồn tại.`
    );
  }
  if (coSo.LoaiDonVi !== LoaiDonVi.CO_SO) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Đơn vị với ID "${toaNhaBody.coSoID}" không phải là một Cơ sở.`
    );
  }
  const createdRaw = await toaNhaRepository.createToaNha(toaNhaBody);
  return {
    toaNhaID: createdRaw.ToaNhaID,
    maToaNha: createdRaw.MaToaNha,
    tenToaNha: createdRaw.TenToaNha,
    coSo: {
      donViID: coSo.DonViID,
      tenDonVi: coSo.TenDonVi,
      maDonVi: coSo.MaDonVi,
      loaiDonVi: coSo.LoaiDonVi,
    },
    moTaToaNha: createdRaw.MoTaToaNha,
  };
};

/**
 * Lấy danh sách tòa nhà có phân trang.
 * @param {Object} params - Tham số truy vấn (phân trang, lọc).
 * @param {number} [params.page] - Số trang.
 * @param {number} [params.limit] - Số lượng mỗi trang.
 * @returns {Promise<Object>} Kết quả phân trang: { items, totalPages, currentPage, totalItems, pageSize }
 */
const getToaNhaList = async (params) => {
  const { items, totalItems } =
    await toaNhaRepository.getToaNhaListWithPagination(params);
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 10;
  const totalPages = Math.ceil(totalItems / limit);
  return { items, totalPages, currentPage: page, totalItems, pageSize: limit };
};

/**
 * Lấy chi tiết một tòa nhà theo ID.
 * @param {string} toaNhaID - ID của tòa nhà.
 * @returns {Promise<Object>} Đối tượng tòa nhà.
 * @throws {ApiError} Nếu không tìm thấy tòa nhà.
 */
const getToaNhaDetail = async (toaNhaID) => {
  const toaNha = await toaNhaRepository.getToaNhaById(toaNhaID);
  if (!toaNha) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tòa nhà không tồn tại.');
  }
  return toaNha;
};

/**
 * Cập nhật thông tin tòa nhà theo ID.
 * @param {string} toaNhaID - ID của tòa nhà cần cập nhật.
 * @param {Object} updateBody - Dữ liệu cập nhật.
 * @param {string} [updateBody.maToaNha] - Mã tòa nhà mới (tùy chọn).
 * @param {string} [updateBody.tenToaNha] - Tên tòa nhà mới (tùy chọn).
 * @param {string} [updateBody.coSoID] - ID cơ sở mới (tùy chọn).
 * @param {string} [updateBody.moTaToaNha] - Mô tả mới (tùy chọn).
 * @returns {Promise<Object>} Đối tượng tòa nhà sau khi cập nhật.
 * @throws {ApiError} Nếu mã tòa nhà trùng, cơ sở không hợp lệ hoặc cập nhật thất bại.
 */
const updateToaNha = async (toaNhaID, updateBody) => {
  const currentToaNha = await getToaNhaDetail(toaNhaID);
  if (updateBody.maToaNha && updateBody.maToaNha !== currentToaNha.maToaNha) {
    const existingMa = await toaNhaRepository.getToaNhaByMa(
      updateBody.maToaNha
    );
    if (existingMa && existingMa.ToaNhaID !== toaNhaID) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Mã tòa nhà "${updateBody.maToaNha}" đã được sử dụng bởi tòa nhà khác.`
      );
    }
  }
  if (updateBody.coSoID && updateBody.coSoID !== currentToaNha.coSo.donViID) {
    const coSo = await donViRepository.getDonViById(updateBody.coSoID);
    if (!coSo || coSo.LoaiDonVi !== LoaiDonVi.CO_SO) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Cơ sở mới (ID: ${updateBody.coSoID}) không hợp lệ.`
      );
    }
  }
  const updatedRaw = await toaNhaRepository.updateToaNhaById(
    toaNhaID,
    updateBody
  );
  if (!updatedRaw) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Cập nhật tòa nhà thất bại.'
    );
  }
  return getToaNhaDetail(toaNhaID);
};

/**
 * Xóa tòa nhà theo ID.
 * @param {string} toaNhaID - ID của tòa nhà cần xóa.
 * @returns {Promise<void>} Trả về nếu xóa thành công.
 * @throws {ApiError} Nếu tòa nhà không tồn tại.
 */
const deleteToaNha = async (toaNhaID) => {
  await getToaNhaDetail(toaNhaID);
  await toaNhaRepository.deleteToaNhaById(toaNhaID);
};

export const toaNhaService = {
  createToaNha,
  getToaNhaList,
  getToaNhaDetail,
  updateToaNha,
  deleteToaNha,
};
