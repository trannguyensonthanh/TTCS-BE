// src/modules/loaiSuKien/loaiSuKien.service.js
import { loaiSuKienRepository } from './loaiSuKien.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import { transformKeysPascalToCamel } from '../../utils/pascal_camel.util.js';

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

const getLoaiSKById = async (loaiSuKienID) => {
  const loaiSK = await loaiSuKienRepository.getLoaiSKById(loaiSuKienID);
  if (!loaiSK) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Loại sự kiện không tồn tại.');
  }
  return loaiSK;
};

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
