// src/modules/thongBao/thongBao.service.js
import { thongBaoRepository } from './thongBao.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import { authRepository } from '../auth/auth.repository.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import LoaiThongBao from '../../enums/loaiThongBao.enum.js';
import { suKienRepository } from '../suKien/suKien.repository.js';
import { yeuCauMuonPhongRepository } from '../yeuCauMuonPhong/yeuCauMuonPhong.repository.js';
import logger from '../../utils/logger.util.js';
import MaTrangThaiSK from '../../enums/maTrangThaiSK.enum.js';
import MaTrangThaiYeuCauPhong from '../../enums/maTrangThaiYeuCauPhong.enum.js';
/**
 * Lấy danh sách thông báo cho người dùng hiện tại.
 * @param {number} nguoiDungID - ID người dùng
 * @param {object} queryParams - Tham số lọc/phân trang { limit, page, chiChuaDoc }
 * @returns {Promise<PaginatedThongBaoResponse>} Danh sách thông báo, tổng số, tổng chưa đọc
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
 * Đánh dấu một thông báo là đã đọc.
 * @param {number} thongBaoID - ID thông báo
 * @param {number} nguoiDungID - ID người dùng
 * @returns {Promise<{message: string, updated: boolean}>}
 */
const danhDauDaDoc = async (thongBaoID, nguoiDungID) => {
  const rowsAffected = await thongBaoRepository.markThongBaoAsRead(
    thongBaoID,
    nguoiDungID
  );
  if (rowsAffected === 0) {
    return {
      message:
        'Không có thông báo nào được cập nhật (có thể đã đọc hoặc không tìm thấy).',
      updated: false,
    };
  }
  return { message: 'Đánh dấu đã đọc thành công.', updated: true };
};

/**
 * Đánh dấu tất cả thông báo của người dùng là đã đọc.
 * @param {number} nguoiDungID - ID người dùng
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
 * @param {object} thongBaoData - Thông tin thông báo
 * @param {object} [transaction] - Optional transaction object for DB transaction support
 * @returns {Promise<void>}
 */
const createThongBao = async (thongBaoData, transaction = null) => {
  try {
    if (!thongBaoData.NoiDungTB) {
      logger.warn(
        'Attempted to create a notification with empty NoiDungTB.',
        thongBaoData
      );
      return;
    }
    const newNotification = await thongBaoRepository.createThongBaoRecord(
      thongBaoData,
      transaction
    );
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

/**
 * Tạo thông báo yêu cầu chỉnh sửa từ BGH hoặc CSVC.
 * @param {object} payload - Thông tin yêu cầu chỉnh sửa
 * @param {object} nguoiGui - Thông tin người gửi yêu cầu
 * @returns {Promise<{message: string}>}
 */
const createYeuCauChinhSuaThongBao = async (payload, nguoiGui) => {
  const { loaiThucThe, idThucThe, nguoiNhanID, noiDungGhiChu } = payload;

  let loaiThongBaoTuDong;
  let duongDanLienQuan;
  let thucTheLienQuanID;
  let tenThucThe = '';

  // Xác định vai trò của người gửi để xác định loại thông báo
  const vaiTroNguoiGui = await authRepository.getVaiTroChucNangByNguoiDungID(
    nguoiGui.nguoiDungID
  );
  const isBGH = vaiTroNguoiGui.some(
    (vt) => vt.maVaiTro === MaVaiTro.BGH_DUYET_SK_TRUONG
  );
  const isCSVC = vaiTroNguoiGui.some(
    (vt) => vt.maVaiTro === MaVaiTro.QUAN_LY_CSVC
  );

  if (loaiThucThe === 'SU_KIEN') {
    if (
      !isBGH &&
      !vaiTroNguoiGui.some((vt) => vt.maVaiTro === MaVaiTro.ADMIN_HE_THONG)
    ) {
      // Chỉ BGH hoặc Admin được YC sửa SK
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Bạn không có quyền yêu cầu chỉnh sửa sự kiện.'
      );
    }
    loaiThongBaoTuDong = LoaiThongBao.BGH_YEU_CAU_CHINH_SUA_SK;
    duongDanLienQuan = `/quan-ly-su-kien/${idThucThe}/chinh-sua`; // Ví dụ
    thucTheLienQuanID = idThucThe;
    // Lấy tên sự kiện để thông báo rõ hơn
    const suKien = await suKienRepository.getSuKienDetailById(idThucThe); // Lấy chi tiết để có tên
    if (!suKien)
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Sự kiện với ID ${idThucThe} không tồn tại.`
      );
    tenThucThe = suKien.tenSK;
    const trangThaiSKID = await suKienRepository.getTrangThaiSkIDByMa(
      MaTrangThaiSK.BGH_YEU_CAU_CHINH_SUA_SK
    );
    // Cập nhật trạng thái sự kiện
    await suKienRepository.updateSuKienTrangThai(idThucThe, trangThaiSKID);
  } else if (loaiThucThe === 'YC_MUON_PHONG_CHI_TIET') {
    if (
      !isCSVC &&
      !vaiTroNguoiGui.some((vt) => vt.maVaiTro === MaVaiTro.ADMIN_HE_THONG)
    ) {
      // Chỉ CSVC hoặc Admin
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Bạn không có quyền yêu cầu chỉnh sửa chi tiết yêu cầu phòng.'
      );
    }
    loaiThongBaoTuDong = LoaiThongBao.CSVC_YEU_CAU_CHINH_SUA_YCPCT;
    // Cần YcMuonPhongID (header) để tạo link
    const ycChiTiet =
      await yeuCauMuonPhongRepository.getYcMuonPhongChiTietForProcessing(
        idThucThe
      ); // Hàm này trả về YcMuonPhongID
    if (!ycChiTiet)
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Chi tiết yêu cầu phòng ID ${idThucThe} không tồn tại.`
      );
    duongDanLienQuan = `/yeu-cau-muon-phong/${ycChiTiet.YcMuonPhongID}/chi-tiet/${idThucThe}/chinh-sua`; // Ví dụ
    thucTheLienQuanID = idThucThe; // YcMuonPhongCtID
    // Lấy tên sự kiện của yêu cầu phòng đó
    const yeuCauHeader =
      await yeuCauMuonPhongRepository.getYeuCauMuonPhongDetailById(
        ycChiTiet.YcMuonPhongID
      );
    if (yeuCauHeader)
      tenThucThe = `chi tiết yêu cầu phòng cho sự kiện "${yeuCauHeader.suKien.tenSK}"`;
    else tenThucThe = `chi tiết yêu cầu phòng ID ${idThucThe}`;

    // 1. Lấy ID của trạng thái từ mã trạng thái
    const trangThaiMoiID = await suKienRepository.getTrangThaiIDByMaGeneric(
      MaTrangThaiYeuCauPhong.CSVC_YEU_CAU_CHINH_SUA_CT,
      'TrangThaiYeuCauPhong',
      'TrangThaiYcpID',
      'MaTrangThai'
    );

    if (!trangThaiMoiID) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi cấu hình: Không tìm thấy mã trạng thái CSVC_YEU_CAU_CHINH_SUA_CT.'
      );
    }
    // Cập nhật trạng thái chi tiết yêu cầu mượn phòng
    await yeuCauMuonPhongRepository.updateYcMuonPhongChiTietStatus(
      idThucThe,
      trangThaiMoiID, // <<== Truyền ID (số), không phải chuỗi
      noiDungGhiChu // <<== Ghi chú nên lấy từ payload, không phải null
    );
  } else {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Loại thực thể không được hỗ trợ.'
    );
  }

  const noiDungThongBaoHoanChinh = `Yêu cầu chỉnh sửa cho ${loaiThucThe.toLowerCase().replace(/_/g, ' ')} "[${tenThucThe}]": ${noiDungGhiChu} (Từ: ${nguoiGui.hoTen || 'Hệ thống'})`;

  const thongBaoData = {
    NguoiNhanID: nguoiNhanID,
    NoiDungTB: noiDungThongBaoHoanChinh,
    DuongDanTB: duongDanLienQuan,
    SkLienQuanID:
      loaiThucThe === 'SU_KIEN'
        ? thucTheLienQuanID
        : loaiThucThe === 'YC_MUON_PHONG_CHI_TIET'
          ? (
              await yeuCauMuonPhongRepository.getYcMuonPhongChiTietForProcessing(
                idThucThe
              )
            )?.SuKienID
          : null,
    YcLienQuanID:
      loaiThucThe === 'YC_MUON_PHONG_CHI_TIET'
        ? (
            await yeuCauMuonPhongRepository.getYcMuonPhongChiTietForProcessing(
              idThucThe
            )
          )?.YcMuonPhongID
        : null,
    LoaiYcLienQuan:
      loaiThucThe === 'YC_MUON_PHONG_CHI_TIET'
        ? 'YEUCAUMUONPHONG_CHITIET'
        : null,
    LoaiThongBao: loaiThongBaoTuDong,
  };

  await createThongBao(thongBaoData);
  return { message: 'Thông báo yêu cầu chỉnh sửa đã được gửi thành công.' };
};

/**
 * Lấy tất cả thông báo của người dùng hiện tại (có phân trang và lọc).
 * @param {number} nguoiDungID - ID người dùng
 * @param {object} queryParams - Tham số lọc/phân trang (GetAllMyNotificationsParams)
 * @returns {Promise<PaginatedThongBaoResponse>} Danh sách thông báo, tổng số, tổng chưa đọc
 */
const getAllMyNotifications = async (nguoiDungID, queryParams) => {
  const relevantDonViIDs =
    await thongBaoRepository.getRelevantDonViIDsForUser(nguoiDungID);
  const { items, totalItems, totalUnread } =
    await thongBaoRepository.getAllThongBaoForUserWithPagination(
      nguoiDungID,
      relevantDonViIDs,
      queryParams
    );

  const page = parseInt(queryParams.page) || 1;
  const limit = parseInt(queryParams.limit) || 15;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items,
    totalPages,
    currentPage: page,
    totalItems,
    pageSize: limit,
    totalUnread: totalUnread,
  };
};

export const thongBaoService = {
  getThongBaoCuaToi,
  danhDauDaDoc,
  danhDauTatCaDaDoc,
  createThongBao,
  createYeuCauChinhSuaThongBao,
  getAllMyNotifications,
};
