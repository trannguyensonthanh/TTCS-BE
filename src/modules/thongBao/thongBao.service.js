// src/modules/thongBao/thongBao.service.js
import { thongBaoRepository } from './thongBao.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';

/**
 * Lấy danh sách thông báo cho người dùng hiện tại
 * @param {number} nguoiDungID
 * @param {object} queryParams - { limit, page, chiChuaDoc }
 * @returns {Promise<PaginatedThongBaoResponse>}
 */
const getThongBaoCuaToi = async (nguoiDungID, queryParams) => {
  const relevantDonViIDs =
    await thongBaoRepository.getRelevantDonViIDsForUser(nguoiDungID);
  const { items, totalItems, totalUnread } =
    await thongBaoRepository.getThongBaoForUser(
      nguoiDungID,
      relevantDonViIDs,
      queryParams
    );

  const page = parseInt(queryParams.page) || 1;
  const limit = parseInt(queryParams.limit) || 10;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items,
    totalPages,
    currentPage: page,
    totalItems,
    pageSize: limit,
    totalUnread,
  };
};

/**
 * Đánh dấu một thông báo là đã đọc
 * @param {number} thongBaoID
 * @param {number} nguoiDungID
 * @returns {Promise<{message: string, updated: boolean}>}
 */
const danhDauDaDoc = async (thongBaoID, nguoiDungID) => {
  const rowsAffected = await thongBaoRepository.markThongBaoAsRead(
    thongBaoID,
    nguoiDungID
  );
  if (rowsAffected === 0) {
    // Có thể do thông báo không tồn tại, không thuộc về user, hoặc đã được đọc rồi
    // Quyết định trả về lỗi hay không tùy thuộc vào yêu cầu:
    // throw new ApiError(httpStatus.NOT_FOUND, 'Thông báo không tồn tại, không có quyền, hoặc đã được đọc.');
    return {
      message:
        'Không có thông báo nào được cập nhật (có thể đã đọc hoặc không tìm thấy).',
      updated: false,
    };
  }
  return { message: 'Đánh dấu đã đọc thành công.', updated: true };
};

/**
 * Đánh dấu tất cả thông báo của người dùng là đã đọc
 * @param {number} nguoiDungID
 * @returns {Promise<{message: string, countUpdated: number}>}
 */
const danhDauTatCaDaDoc = async (nguoiDungID) => {
  const relevantDonViIDs =
    await thongBaoRepository.getRelevantDonViIDsForUser(nguoiDungID);
  const countUpdated = await thongBaoRepository.markAllThongBaoAsReadForUser(
    nguoiDungID,
    relevantDonViIDs
  );
  return {
    message: 'Đánh dấu tất cả thông báo đã đọc thành công.',
    countUpdated,
  };
};
/**
 * Service nội bộ để tạo thông báo.
 * Sẽ được gọi từ các service khác khi có sự kiện nghiệp vụ cần thông báo.
 * @param {object} thongBaoData - { NguoiNhanID?, DonViNhanID?, SkLienQuanID?, YcLienQuanID?, LoaiYcLienQuan?, NoiDungTB, DuongDanTB?, LoaiThongBao }
 * @returns {Promise<void>}
 */
const createThongBao = async (thongBaoData) => {
  try {
    if (!thongBaoData.NoiDungTB) {
      logger.warn(
        'Attempted to create a notification with empty NoiDungTB.',
        thongBaoData
      );
      return; // Không tạo thông báo nếu không có nội dung
    }
    const newNotification =
      await thongBaoRepository.createThongBaoRecord(thongBaoData);
    logger.info(
      `Notification created successfully: ID ${newNotification.ThongBaoID}, Type: ${newNotification.LoaiThongBao}, Content: "${newNotification.NoiDungTB.substring(0, 50)}..."`
    );
  } catch (error) {
    logger.error(
      'Failed to create notification in service:',
      error,
      thongBaoData
    );
  }
};

export const thongBaoService = {
  getThongBaoCuaToi,
  danhDauDaDoc,
  danhDauTatCaDaDoc,
  createThongBao, // Service nội bộ
};
