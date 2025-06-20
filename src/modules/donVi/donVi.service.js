// src/modules/donVi/donVi.service.js
import sql from 'mssql';
import { donViRepository } from './donVi.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import LoaiDonVi from '../../enums/loaiDonVi.enum.js';
import logger from '../../utils/logger.util.js';
import { getPool } from '../../utils/database.js';

/**
 * Map mã loại đơn vị sang tên tiếng Việt.
 * @param {string} maLoai - Mã loại đơn vị
 * @returns {string} Tên loại đơn vị tiếng Việt
 */
const mapLoaiDonViToTen = (maLoai) => {
  switch (maLoai) {
    case LoaiDonVi.KHOA:
      return 'Khoa';
    case LoaiDonVi.PHONG:
      return 'Phòng';
    case LoaiDonVi.BAN:
      return 'Ban';
    case LoaiDonVi.TRUNG_TAM:
      return 'Trung tâm';
    case LoaiDonVi.BO_MON:
      return 'Bộ môn';
    case LoaiDonVi.CLB:
      return 'Câu lạc bộ';
    case LoaiDonVi.DOAN_THE:
      return 'Đoàn thể';
    case LoaiDonVi.CO_SO:
      return 'Cơ sở'; // Thêm nếu có
    default:
      return maLoai;
  }
};

/**
 * Lấy danh sách đơn vị (có lọc, phân trang, tìm kiếm).
 * @param {object} params - Tham số lọc, phân trang, tìm kiếm
 * @returns {Promise<{items: Array<object>, totalPages: number, currentPage: number, totalItems: number, pageSize: number}>}
 */
const getDonViList = async (params) => {
  const { items, totalItems } =
    await donViRepository.getDonViListWithPagination(params);
  const page = parseInt(params.page, 10) || 1;
  const limit = parseInt(params.limit, 10) || 10;
  const totalPages = Math.ceil(totalItems / limit);

  // Thêm TenLoaiDonVi vào mỗi item nếu chưa có từ repo
  const formattedItems = items.map((item) => ({
    ...item,
    tenLoaiDonVi: item.tenLoaiDonVi || mapLoaiDonViToTen(item.loaiDonVi),
  }));

  return {
    items: formattedItems,
    totalPages,
    currentPage: page,
    totalItems,
    pageSize: limit,
  };
};

/**
 * Lấy chi tiết một đơn vị theo ID.
 * @param {number} donViId - ID đơn vị
 * @returns {Promise<object>} Thông tin đơn vị
 */
const getDonViDetail = async (donViId) => {
  const donVi = await donViRepository.getDonViById(donViId);
  if (!donVi) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Đơn vị không tồn tại.');
  }
  // Thêm TenLoaiDonVi
  donVi.tenLoaiDonVi = donVi.tenLoaiDonVi || mapLoaiDonViToTen(donVi.loaiDonVi);
  return donVi;
};

/**
 * Tạo mới đơn vị.
 * @param {object} donViBody - Dữ liệu đơn vị
 * @returns {Promise<object>} Thông tin đơn vị vừa tạo
 */
const createDonVi = async (donViBody) => {
  // 1. Kiểm tra TenDonVi unique
  const existingTen = await donViRepository.getDonViByTen(donViBody.tenDonVi);
  if (existingTen) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Tên đơn vị "${donViBody.tenDonVi}" đã tồn tại.`
    );
  }

  // 2. Kiểm tra MaDonVi (nếu có) unique
  if (donViBody.maDonVi) {
    const existingMa = await donViRepository.getDonViByMa(donViBody.maDonVi);
    if (existingMa) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Mã đơn vị "${donViBody.maDonVi}" đã tồn tại.`
      );
    }
  }

  // 3. Kiểm tra DonViChaID (nếu có) tồn tại
  if (donViBody.donViChaID) {
    const donViCha = await donViRepository.getDonViById(donViBody.donViChaID);
    if (!donViCha) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Đơn vị cha với ID "${donViBody.donViChaID}" không tồn tại.`
      );
    }
    // TODO: Kiểm tra logic phân cấp hợp lệ (VD: Phòng không thể là cha của Khoa,...)
    // Ví dụ đơn giản: CLB có thể có cha là KHOA hoặc DOAN_THE
    if (
      donViBody.loaiDonVi === LoaiDonVi.CLB &&
      donViCha.loaiDonVi !== LoaiDonVi.KHOA &&
      donViCha.loaiDonVi !== LoaiDonVi.DOAN_THE
    ) {
      logger.warn(
        `CLB "${donViBody.tenDonVi}" đang được tạo với đơn vị cha là "${donViCha.tenDonVi}" (Loại: ${donViCha.loaiDonVi}) - cần kiểm tra logic phân cấp.`
      );
    }
  }

  const newDonViID = await donViRepository.createDonViRecord(donViBody);
  logger.info(`New DonVi created with ID: ${newDonViID}`);

  // Lấy lại chi tiết đầy đủ để trả về (bao gồm cả DonViChaInfo)
  const donViDetail = await donViRepository.getDonViById(newDonViID);
  if (!donViDetail) {
    // Trường hợp hiếm
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Tạo đơn vị thành công nhưng không thể lấy chi tiết.'
    );
  }
  donViDetail.tenLoaiDonVi = mapLoaiDonViToTen(donViDetail.loaiDonVi);
  return donViDetail;
};

/**
 * Lấy tất cả ID đơn vị con (đệ quy) của một đơn vị cha
 * @param {number} donViChaId
 * @returns {Promise<number[]>}
 */
const getAllChildDonViIds = async (donViChaId) => {
  const children = new Set();
  const stack = [donViChaId];
  const pool = await getPool();
  const request = pool.request();

  while (stack.length > 0) {
    const currentParentId = stack.pop();
    children.add(currentParentId); // Thêm chính nó vào danh sách (nếu cần loại trừ chính nó thì xử lý sau)

    request.parameters = {};
    request.input('CurrentParentId', sql.Int, currentParentId);
    const result = await request.query(
      'SELECT DonViID FROM DonVi WHERE DonViChaID = @CurrentParentId'
    );

    for (const row of result.recordset) {
      if (!children.has(row.DonViID)) {
        // Tránh vòng lặp vô hạn nếu dữ liệu có vấn đề
        stack.push(row.DonViID);
      }
    }
  }
  return Array.from(children);
};

/**
 * Cập nhật thông tin đơn vị.
 * @param {number} donViId - ID đơn vị
 * @param {object} updateBody - Dữ liệu cập nhật
 * @returns {Promise<object>} Thông tin đơn vị sau cập nhật
 */
const updateDonVi = async (donViId, updateBody) => {
  const currentDonVi = await donViRepository.getDonViById(donViId);
  if (!currentDonVi) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Đơn vị không tồn tại.');
  }

  // Kiểm tra TenDonVi unique
  if (updateBody.tenDonVi && updateBody.tenDonVi !== currentDonVi.tenDonVi) {
    const existingTen = await donViRepository.getDonViByTen(
      updateBody.tenDonVi,
      donViId
    );
    if (existingTen) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Tên đơn vị "${updateBody.tenDonVi}" đã tồn tại.`
      );
    }
  }
  // Kiểm tra MaDonVi unique (nếu thay đổi và không phải null)
  if (updateBody.maDonVi && updateBody.maDonVi !== currentDonVi.maDonVi) {
    const existingMa = await donViRepository.getDonViByMa(
      updateBody.maDonVi,
      donViId
    );
    if (existingMa) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Mã đơn vị "${updateBody.maDonVi}" đã tồn tại.`
      );
    }
  }

  // Kiểm tra DonViChaID
  if (updateBody.donViChaID !== undefined) {
    // Cho phép set thành null
    if (updateBody.donViChaID !== null) {
      if (updateBody.donViChaID === donViId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Đơn vị không thể là cha của chính nó.'
        );
      }
      const donViCha = await donViRepository.getDonViById(
        updateBody.donViChaID
      );
      if (!donViCha) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Đơn vị cha với ID "${updateBody.donViChaID}" không tồn tại.`
        );
      }
      // Kiểm tra vòng lặp cha-con (quan trọng)
      const allChildrenOfCurrent = await getAllChildDonViIds(donViId);
      if (allChildrenOfCurrent.includes(updateBody.donViChaID)) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Không thể đặt đơn vị cha là một trong các đơn vị con của nó (gây vòng lặp).'
        );
      }
      // Kiểm tra logic phân cấp hợp lệ
      // Ví dụ: Không cho phép các loại đơn vị sau làm cha của các loại đơn vị cao hơn trong hệ thống
      // - PHONG không thể là cha của KHOA, BAN, TRUNG_TAM, BO_MON
      // - CLB chỉ có thể trực thuộc KHOA hoặc DOAN_THE
      // - BO_MON chỉ có thể trực thuộc KHOA
      // - KHOA không thể là con của PHONG, BAN, TRUNG_TAM, CLB, BO_MON
      const childType = updateBody.loaiDonVi || currentDonVi.loaiDonVi;
      const parentType = donViCha.loaiDonVi;
      if (
        childType === LoaiDonVi.KHOA &&
        [
          LoaiDonVi.PHONG,
          LoaiDonVi.BAN,
          LoaiDonVi.TRUNG_TAM,
          LoaiDonVi.BO_MON,
          LoaiDonVi.CLB,
        ].includes(parentType)
      ) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Khoa không thể là con của Phòng, Ban, Trung tâm, Bộ môn hoặc CLB.'
        );
      }
      if (childType === LoaiDonVi.BO_MON && parentType !== LoaiDonVi.KHOA) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Bộ môn chỉ có thể trực thuộc Khoa.'
        );
      }
      if (
        childType === LoaiDonVi.CLB &&
        ![LoaiDonVi.KHOA, LoaiDonVi.DOAN_THE].includes(parentType)
      ) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'CLB chỉ có thể trực thuộc Khoa hoặc Đoàn thể.'
        );
      }
      if (
        childType === LoaiDonVi.PHONG &&
        [LoaiDonVi.KHOA, LoaiDonVi.BO_MON, LoaiDonVi.CLB].includes(parentType)
      ) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Phòng không thể là con của Khoa, Bộ môn hoặc CLB.'
        );
      }
    }
  }
  // TODO: Kiểm tra LoaiDonVi nếu thay đổi (ví dụ: không thể đổi từ Khoa sang CLB nếu đang có ngành/lớp...)
  // Kiểm tra nếu LoaiDonVi thay đổi, cần đảm bảo không vi phạm ràng buộc dữ liệu liên quan
  if (updateBody.loaiDonVi && updateBody.loaiDonVi !== currentDonVi.loaiDonVi) {
    // Nếu đổi từ KHOA sang loại khác mà DonVi này đang có ngành học hoặc bộ môn thì không cho phép
    if (
      currentDonVi.loaiDonVi === LoaiDonVi.KHOA &&
      [
        LoaiDonVi.BO_MON,
        LoaiDonVi.CLB,
        LoaiDonVi.PHONG,
        LoaiDonVi.BAN,
        LoaiDonVi.TRUNG_TAM,
      ].includes(updateBody.loaiDonVi)
    ) {
      // Kiểm tra có ngành học hoặc bộ môn trực thuộc không
      const nganhCount =
        await donViRepository.countNganhHocByKhoaQuanLyID(donViId);
      const boMonCount = await donViRepository.countBoMonByKhoaID(donViId);
      if (nganhCount > 0 || boMonCount > 0) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Không thể đổi loại đơn vị từ Khoa sang loại khác khi còn ngành học hoặc bộ môn trực thuộc.'
        );
      }
    }
  }

  const updatedResult = await donViRepository.updateDonViRecordById(
    donViId,
    updateBody
  );
  if (!updatedResult) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Cập nhật đơn vị thất bại.'
    );
  }
  logger.info(`DonVi updated with ID: ${donViId}`);
  const donViDetail = await donViRepository.getDonViById(donViId);
  donViDetail.tenLoaiDonVi = mapLoaiDonViToTen(donViDetail.loaiDonVi);
  return donViDetail;
};

/**
 * Xóa đơn vị theo ID.
 * @param {number} donViId - ID đơn vị
 * @returns {Promise<void>}
 */
const deleteDonVi = async (donViId) => {
  const donViToDelete = await donViRepository.getDonViById(donViId);
  if (!donViToDelete) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Đơn vị không tồn tại.');
  }

  // Kiểm tra các ràng buộc trước khi xóa
  const usage = await donViRepository.checkDonViUsage(donViId);
  const usageMessages = [];
  if (usage.hasChildren) usageMessages.push('có đơn vị con trực thuộc');
  if (usage.hasNganhHoc) usageMessages.push('đang quản lý ngành học');
  if (usage.hasLopHoc)
    usageMessages.push('có lớp học liên quan (thông qua ngành học)');
  if (usage.hasNguoiDungVaiTro)
    usageMessages.push('có người dùng được gán vai trò tại đây');
  if (usage.hasThongTinGiangVien)
    usageMessages.push('có giảng viên đang công tác');
  if (usage.hasSuKienChuTri)
    usageMessages.push('đang là đơn vị chủ trì sự kiện');
  if (usage.hasSuKienThamGia)
    usageMessages.push('đang được chỉ định tham gia sự kiện');
  // if (usage.hasPhongQuanLy) usageMessages.push('đang quản lý phòng'); // Nếu có cột này
  if (usage.hasToaNha && donViToDelete.loaiDonVi === LoaiDonVi.CO_SO)
    usageMessages.push('đang quản lý tòa nhà (là một cơ sở)');

  if (usageMessages.length > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Không thể xóa đơn vị "${donViToDelete.tenDonVi}" vì nó ${usageMessages.join(', ')}.`
    );
  }

  // Cân nhắc dùng transaction nếu việc xóa đơn vị kéo theo các hành động phức tạp khác
  // (ví dụ: cập nhật DonViChaID của các đơn vị con thành NULL)
  // Hiện tại, checkDonViUsage đã kiểm tra không có đơn vị con.

  const rowsAffected = await donViRepository.deleteDonViRecordById(donViId);
  if (rowsAffected === 0) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Xóa đơn vị thất bại.'
    );
  }
  logger.info(`DonVi deleted with ID: ${donViId}`);
};

/**
 * Lấy danh sách loại đơn vị cho select options.
 * @returns {Array<{maLoai: string, tenLoai: string}>}
 */
const getLoaiDonViOptions = async () => {
  // Map enum thành cấu trúc FE yêu cầu
  return Object.entries(LoaiDonVi).map(([key, value]) => ({
    maLoai: value,
    tenLoai: mapLoaiDonViToTen(value),
  }));
};

/**
 * Lấy danh sách đơn vị cha tiềm năng cho select.
 * @param {object} params - { excludeDonViId, searchTerm, limit }
 * @returns {Promise<Array<{donViID: number, tenDonViHienThi: string}>>}
 */
const getDonViChaOptions = async (params) => {
  const { excludeDonViId, searchTerm, limit } = params;
  let excludedIds = [];
  if (excludeDonViId) {
    excludedIds = await getAllChildDonViIds(excludeDonViId);
  }

  const donVis = await donViRepository.getDonViChaOptionsFromDB(
    null,
    searchTerm,
    limit
  );

  return donVis
    .filter((dv) => !excludedIds.includes(dv.DonViID)) // Lọc bỏ các ID không được phép làm cha
    .map((dv) => ({
      donViID: dv.DonViID,
      tenDonViHienThi: `${dv.TenDonVi} (${mapLoaiDonViToTen(dv.LoaiDonVi)})${dv.MaDonVi ? ` - ${dv.MaDonVi}` : ''}`,
    }));
};

export const donViService = {
  getDonViList,
  getDonViDetail,
  createDonVi,
  updateDonVi,
  deleteDonVi,
  getLoaiDonViOptions,
  getDonViChaOptions,
};
