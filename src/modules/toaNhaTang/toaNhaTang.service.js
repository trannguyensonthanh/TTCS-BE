// src/modules/toaNhaTang/toaNhaTang.service.js
import { toaNhaTangRepository } from './toaNhaTang.repository.js';
import { toaNhaRepository } from '../toaNha/toaNha.repository.js';
import { loaiTangRepository } from '../loaiTang/loaiTang.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import logger from '../../utils/logger.util.js';

/**
 * Tạo mới tầng vật lý cho tòa nhà.
 * @param {number} toaNhaId - ID của tòa nhà.
 * @param {Object} toaNhaTangBody - Dữ liệu tầng vật lý (loaiTangID, soPhong, moTa).
 * @returns {Promise<Object>} Đối tượng tầng vật lý vừa tạo.
 * @throws {ApiError} Nếu tòa nhà hoặc loại tầng không tồn tại, hoặc đã tồn tại tầng cùng loại.
 */
const createToaNhaTang = async (toaNhaId, toaNhaTangBody) => {
  // 1. Kiểm tra ToaNha có tồn tại không
  const toaNha = await toaNhaRepository.getToaNhaById(toaNhaId);
  if (!toaNha) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `Tòa nhà với ID "${toaNhaId}" không tồn tại.`
    );
  }

  // 2. Kiểm tra LoaiTangID có tồn tại không
  const loaiTang = await loaiTangRepository.getLoaiTangById(
    toaNhaTangBody.loaiTangID
  );
  if (!loaiTang) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Loại tầng với ID "${toaNhaTangBody.loaiTangID}" không tồn tại.`
    );
  }

  // 3. Kiểm tra cặp ToaNhaID - LoaiTangID đã tồn tại chưa (UNIQUE constraint đã xử lý, nhưng check trước sẽ thân thiện hơn)
  const existingToaNhaTang = await toaNhaTangRepository.checkToaNhaTangExists(
    toaNhaId,
    toaNhaTangBody.loaiTangID
  );
  if (existingToaNhaTang) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Tòa nhà "${toaNha.tenToaNha}" đã có loại tầng "${loaiTang.TenLoaiTang}".`
    );
  }

  const createdRaw = await toaNhaTangRepository.createToaNhaTang(
    toaNhaId,
    toaNhaTangBody
  );
  // Lấy lại chi tiết để có đủ thông tin ToaNha và LoaiTang
  const newToaNhaTang = await toaNhaTangRepository.getToaNhaTangById(
    createdRaw.ToaNhaTangID
  );
  if (!newToaNhaTang) {
    logger.error(
      `Failed to fetch details for newly created ToaNhaTangID: ${createdRaw.ToaNhaTangID}`
    );
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Tạo tầng vật lý thành công nhưng không thể lấy chi tiết.'
    );
  }
  return newToaNhaTang;
};

/**
 * Lấy danh sách tầng vật lý của tòa nhà (có phân trang, tìm kiếm).
 * @param {number} toaNhaId - ID của tòa nhà.
 * @param {Object} params - Tham số truy vấn (searchTerm, page, limit, sortBy, sortOrder).
 * @returns {Promise<Object>} Kết quả phân trang và thông tin tòa nhà cha.
 * @throws {ApiError} Nếu tòa nhà không tồn tại.
 */
const getToaNhaTangList = async (toaNhaId, params) => {
  // Kiểm tra ToaNha có tồn tại không
  const toaNha = await toaNhaRepository.getToaNhaById(toaNhaId);
  if (!toaNha) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `Tòa nhà với ID "${toaNhaId}" không tồn tại.`
    );
  }

  const { items, totalItems, thongTinToaNhaCha } =
    await toaNhaTangRepository.getToaNhaTangListByToaNhaId(toaNhaId, params);
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 10;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items,
    thongTinToaNhaCha: thongTinToaNhaCha || toaNha, // Ưu tiên thông tin từ repo, nếu không có thì lấy từ check ban đầu
    totalPages,
    currentPage: page,
    totalItems,
    pageSize: limit,
  };
};

/**
 * Lấy chi tiết tầng vật lý theo ID.
 * @param {number} toaNhaTangID - ID tầng vật lý.
 * @returns {Promise<Object>} Đối tượng tầng vật lý.
 * @throws {ApiError} Nếu tầng vật lý không tồn tại.
 */
const getToaNhaTangDetail = async (toaNhaTangID) => {
  const toaNhaTang = await toaNhaTangRepository.getToaNhaTangById(toaNhaTangID);
  if (!toaNhaTang) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tầng vật lý không tồn tại.');
  }
  return toaNhaTang;
};

/**
 * Cập nhật thông tin tầng vật lý theo ID.
 * @param {number} toaNhaTangID - ID tầng vật lý cần cập nhật.
 * @param {Object} updateBody - Dữ liệu cập nhật (soPhong, moTa).
 * @returns {Promise<Object>} Đối tượng tầng vật lý sau khi cập nhật.
 * @throws {ApiError} Nếu không tồn tại hoặc cập nhật thất bại.
 */
const updateToaNhaTang = async (toaNhaTangID, updateBody) => {
  const currentToaNhaTang = await getToaNhaTangDetail(toaNhaTangID); // Kiểm tra tồn tại
  if (updateBody.loaiTangID || updateBody.toaNhaID) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Không thể thay đổi Loại Tầng hoặc Tòa Nhà của một tầng vật lý đã tạo.'
    );
  }

  const updatedRaw = await toaNhaTangRepository.updateToaNhaTangById(
    toaNhaTangID,
    updateBody
  );
  if (!updatedRaw) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Cập nhật tầng vật lý thất bại.'
    );
  }
  // Lấy lại thông tin đầy đủ sau khi cập nhật
  return toaNhaTangRepository.getToaNhaTangById(updatedRaw.ToaNhaTangID);
};

/**
 * Xóa tầng vật lý theo ID.
 * @param {number} toaNhaTangID - ID tầng vật lý cần xóa.
 * @returns {Promise<void>} Không trả về dữ liệu nếu xóa thành công.
 * @throws {ApiError} Nếu tầng vật lý không tồn tại hoặc đã bị xóa.
 */
const deleteToaNhaTang = async (toaNhaTangID) => {
  await getToaNhaTangDetail(toaNhaTangID); // Kiểm tra tồn tại
  const rowsAffected =
    await toaNhaTangRepository.deleteToaNhaTangById(toaNhaTangID);
  if (rowsAffected === 0) {
    // Có thể đã bị xóa bởi request khác hoặc ID không đúng
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Tầng vật lý không tồn tại hoặc đã được xóa.'
    );
  }
  // Không có gì để trả về sau khi DELETE thành công (204)
};

/**
 * Lấy danh sách tầng vật lý để chọn (select option).
 * @param {Object} params - Tham số truy vấn (toaNhaID, searchTerm, limit).
 * @returns {Promise<Array>} Danh sách tầng vật lý phù hợp để chọn.
 */
const getToaNhaTangsForSelect = async (params) => {
  const items = await toaNhaTangRepository.getToaNhaTangForSelect(params);
  return items; // Trả về mảng trực tiếp
};

export const toaNhaTangService = {
  createToaNhaTang,
  getToaNhaTangList,
  getToaNhaTangDetail,
  updateToaNhaTang,
  deleteToaNhaTang,
  getToaNhaTangsForSelect,
};
