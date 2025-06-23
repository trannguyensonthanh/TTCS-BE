// src/modules/yeuCauHuySK/yeuCauHuySK.service.js
import sql from 'mssql';
import { yeuCauHuySKRepository } from './yeuCauHuySK.repository.js';
import { suKienRepository } from '../suKien/suKien.repository.js'; // Để lấy chi tiết sự kiện sau khi cập nhật
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import MaTrangThaiSK from '../../enums/maTrangThaiSK.enum.js';
import MaTrangThaiYeuCauHuySK from '../../enums/maTrangThaiYeuCauHuySK.enum.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import { authRepository } from '../auth/auth.repository.js';
import LoaiThongBao from '../../enums/loaiThongBao.enum.js';
import { thongBaoService } from '../thongBao/thongBao.service.js';
import logger from '../../utils/logger.util.js';
import { executeQuery, getPool } from '../../utils/database.js';
import { yeuCauMuonPhongRepository } from '../yeuCauMuonPhong/yeuCauMuonPhong.repository.js';
import MaTrangThaiYeuCauPhong from '../../enums/maTrangThaiYeuCauPhong.enum.js';

const SO_NGAY_QUA_HAN_YEU_CAU_HUY = 2;
/**
 * Lấy danh sách yêu cầu hủy sự kiện (có phân trang, phân quyền)
 * Đầu vào: params (object chứa searchTerm, trangThaiYcHuySkMa, suKienID, nguoiYeuCauID, page, limit, sortBy, sortOrder), currentUser (object)
 * Đầu ra: object { items, totalPages, currentPage, totalItems, pageSize }
 */
const getYeuCauHuySKs = async (params, currentUser) => {
  const modifiedParams = { ...params };
  const userRoles = await authRepository.getVaiTroChucNangByNguoiDungID(
    currentUser.nguoiDungID
  );
  const isBGH = userRoles.some(
    (role) => role.maVaiTro === MaVaiTro.BGH_DUYET_SK_TRUONG
  );
  const isAdmin = userRoles.some(
    (role) => role.maVaiTro === MaVaiTro.ADMIN_HE_THONG
  );

  if (!isAdmin && !isBGH) {
    // CBTC chỉ thấy yêu cầu của mình
    modifiedParams.nguoiYeuCauID = currentUser.nguoiDungID;
  }
  // // BGH có thể cần filter mặc định là các yêu cầu đang chờ họ duyệt
  // else if (
  //   isBGH &&
  //   !params.trangThaiYcHuySkMa &&
  //   !params.suKienID &&
  //   !params.nguoiYeuCauID
  // ) {
  //   modifiedParams.trangThaiYcHuySkMa =
  //     MaTrangThaiYeuCauHuySK.CHO_DUYET_HUY_BGH;
  // }

  const { items, totalItems } =
    await yeuCauHuySKRepository.getYeuCauHuySKListWithPagination(
      modifiedParams,
      currentUser
    );
  const page = parseInt(params.page, 10) || 1;
  const limit = parseInt(params.limit, 10) || 10;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items,
    totalPages,
    currentPage: page,
    totalItems,
    pageSize: limit,
  };
};

/**
 * Lấy chi tiết một yêu cầu hủy sự kiện
 * Đầu vào: ycHuySkID (number), currentUser (object), fetchSuKienFullDetail (boolean, optional)
 * Đầu ra: object chi tiết yêu cầu hủy sự kiện
 */
const getYeuCauHuySKDetail = async (
  ycHuySkID,
  currentUser,
  fetchSuKienFullDetail = false
) => {
  const yeuCauHuy =
    await yeuCauHuySKRepository.getYeuCauHuySKDetailById(ycHuySkID);
  if (!yeuCauHuy) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Yêu cầu hủy sự kiện không tồn tại.'
    );
  }

  // Logic phân quyền xem chi tiết
  // const userRoles = await authRepository.getVaiTroChucNangByNguoiDungID(currentUser.nguoiDungID);
  // const isBGH = userRoles.some(role => role.maVaiTro === MaVaiTro.BGH_DUYET_SK_TRUONG);
  // const isAdmin = userRoles.some(role => role.maVaiTro === MaVaiTro.ADMIN_HE_THONG);
  // if (!isAdmin && !isBGH && yeuCauHuy.nguoiYeuCau.nguoiDungID !== currentUser.nguoiDungID) {
  //   throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền xem chi tiết yêu cầu này.');
  // }

  if (fetchSuKienFullDetail && yeuCauHuy.suKien && yeuCauHuy.suKien.suKienID) {
    yeuCauHuy.suKienFullDetail = await suKienRepository.getSuKienDetailById(
      yeuCauHuy.suKien.suKienID
    );
  }

  return yeuCauHuy;
};

/**
 * Tạo mới yêu cầu hủy sự kiện
 * Đầu vào: suKienID (number), lyDoHuy (string), nguoiYeuCau (object)
 * Đầu ra: object thông tin sự kiện đã được cập nhật trạng thái
 */
const createYeuCauHuySK = async (suKienID, lyDoHuy, nguoiYeuCau) => {
  const suKien =
    await yeuCauHuySKRepository.findSuKienForCancellationRequest(suKienID);

  if (!suKien) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sự kiện không tồn tại.');
  }

  // Kiểm tra quyền: Chỉ người tạo sự kiện hoặc admin mới được yêu cầu hủy
  const userRoles = await authRepository.getVaiTroChucNangByNguoiDungID(
    nguoiYeuCau.nguoiDungID
  );
  const isAdmin = userRoles.some((r) => r.maVaiTro === MaVaiTro.ADMIN_HE_THONG);
  if (suKien.NguoiTaoID !== nguoiYeuCau.nguoiDungID && !isAdmin) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Bạn không có quyền yêu cầu hủy sự kiện này.'
    );
  }
  // Tạm thời giả định người gọi API này đã được phân quyền đúng (CB_TO_CHUC_SU_KIEN hoặc ADMIN)
  if (suKien.NguoiTaoID !== nguoiYeuCau.nguoiDungID) {
    // Nếu cần chặt chẽ hơn, kiểm tra vai trò ADMIN ở đâyđây
    console.warn(
      `User ${nguoiYeuCau.nguoiDungID} is requesting cancellation for event created by ${suKien.NguoiTaoID}`
    );
  }

  // Kiểm tra trạng thái sự kiện có cho phép yêu cầu hủy không
  const trangThaiHienTaiSK = suKien.MaTrangThaiHienTaiSK;
  const trangThaiChoPhepYeuCauHuy = [
    MaTrangThaiSK.DA_DUYET_BGH,
    MaTrangThaiSK.CHO_DUYET_PHONG,
    MaTrangThaiSK.DA_XAC_NHAN_PHONG,
    MaTrangThaiSK.PHONG_BI_TU_CHOI, // Có thể cho phép yêu cầu hủy nếu phòng bị từ chối
  ];

  if (!trangThaiChoPhepYeuCauHuy.includes(trangThaiHienTaiSK)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Không thể yêu cầu hủy sự kiện khi đang ở trạng thái "${trangThaiHienTaiSK}".`
    );
  }

  // Kiểm tra xem đã có yêu cầu hủy nào đang chờ duyệt chưa
  const coYeuCauChoDuyet =
    await yeuCauHuySKRepository.checkExistingPendingCancellationRequest(
      suKienID
    );
  if (coYeuCauChoDuyet) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Sự kiện này đã có một yêu cầu hủy đang chờ duyệt.'
    );
  }

  // Lấy ID cho trạng thái "Chờ duyệt hủy BGH" của YeuCauHuySK
  const trangThaiYcHuySkIdChoDuyet =
    await yeuCauHuySKRepository.getTrangThaiIDByMa(
      MaTrangThaiYeuCauHuySK.CHO_DUYET_HUY_BGH,
      'TrangThaiYeuCauHuySK',
      'TrangThaiYcHuySkID',
      'MaTrangThai'
    );
  if (!trangThaiYcHuySkIdChoDuyet) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Lỗi cấu hình: Không tìm thấy trạng thái yêu cầu hủy.'
    );
  }

  // Tạo bản ghi YeuCauHuySK
  await yeuCauHuySKRepository.createYeuCauHuySKRecord(
    suKienID,
    nguoiYeuCau.nguoiDungID,
    lyDoHuy,
    trangThaiYcHuySkIdChoDuyet
  );

  // Cập nhật trạng thái của SuKien thành "Chờ duyệt hủy sau duyệt"
  const trangThaiSkChoDuyetHuy = await yeuCauHuySKRepository.getTrangThaiIDByMa(
    MaTrangThaiSK.CHO_DUYET_HUY_SAU_DUYET,
    'TrangThaiSK',
    'TrangThaiSkID',
    'MaTrangThai'
  );
  if (!trangThaiSkChoDuyetHuy) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Lỗi cấu hình: Không tìm thấy trạng thái sự kiện.'
    );
  }
  await yeuCauHuySKRepository.updateSuKienTrangThai(
    // cần sử dụng updateSuKienTrangThai từ sukienRepository
    suKienID,
    trangThaiSkChoDuyetHuy
  );

  // Trả về thông tin chi tiết sự kiện đã được cập nhật trạng thái
  const suKienUpdated = await suKienRepository.getSuKienDetailById(suKienID);
  if (!suKienUpdated) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Không thể lấy thông tin sự kiện sau khi tạo yêu cầu hủy.'
    );
  }
  // Gửi thông báo cho BGH
  const usersWithBGHRole = await authRepository.findUsersByRoleMa(
    MaVaiTro.BGH_DUYET_SK_TRUONG
  );
  if (usersWithBGHRole && usersWithBGHRole.length > 0) {
    usersWithBGHRole.forEach((userBGH) => {
      thongBaoService
        .createThongBao({
          NguoiNhanID: userBGH.NguoiDungID,
          NoiDungTB: `Có yêu cầu hủy cho sự kiện "[${suKienUpdated.tenSK}]" đang chờ Ban Giám Hiệu duyệt.`,
          DuongDanTB: `/admin/yeu-cau-huy-cho-duyet/${suKienID}`,
          SkLienQuanID: suKienID,
          LoaiThongBao: LoaiThongBao.YC_HUY_SK_MOI_CHO_BGH,
        })
        .catch((err) =>
          logger.error(
            'Failed to send YC_HUY_SK_MOI_CHO_BGH notification:',
            err
          )
        );
    });
  }
  return suKienUpdated;
};

/**
 * Duyệt yêu cầu hủy sự kiện (BGH duyệt)
 * Đầu vào: ycHuySkID (number), payload (object: ghiChuBGH optional), nguoiDuyet (object)
 * Đầu ra: object chi tiết yêu cầu hủy sự kiện sau khi duyệt
 */
const duyetYeuCauHuySK = async (ycHuySkID, payload, nguoiDuyet) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    logger.debug(`Transaction started for approving YcHuySkID: ${ycHuySkID}`);

    const yeuCauHuy = await yeuCauHuySKRepository.getYeuCauHuySKForProcessing(
      ycHuySkID,
      transaction
    );
    if (!yeuCauHuy) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Yêu cầu hủy sự kiện không tồn tại.'
      );
    }
    if (
      yeuCauHuy.MaTrangThaiHienTai !== MaTrangThaiYeuCauHuySK.CHO_DUYET_HUY_BGH
    ) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Yêu cầu hủy không ở trạng thái "Chờ duyệt BGH". Trạng thái hiện tại: ${yeuCauHuy.MaTrangThaiHienTai}`
      );
    }

    // Lấy ID trạng thái mới cho YeuCauHuySK và SuKien
    const trangThaiYcHuyDaDuyetId =
      await suKienRepository.getTrangThaiIDByMaGeneric(
        MaTrangThaiYeuCauHuySK.DA_DUYET_HUY,
        'TrangThaiYeuCauHuySK',
        'TrangThaiYcHuySkID',
        'MaTrangThai',
        transaction
      );
    const trangThaiSkDaHuyId = await suKienRepository.getTrangThaiIDByMaGeneric(
      MaTrangThaiSK.DA_HUY,
      'TrangThaiSK',
      'TrangThaiSkID',
      'MaTrangThai',
      transaction
    );

    if (!trangThaiYcHuyDaDuyetId || !trangThaiSkDaHuyId) {
      logger.error(
        'Lỗi cấu hình: Không tìm thấy mã trạng thái cần thiết cho việc duyệt hủy sự kiện.'
      );
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi hệ thống khi xử lý trạng thái.'
      );
    }

    // 1. Cập nhật YeuCauHuySK
    await yeuCauHuySKRepository.updateYeuCauHuySKAfterBGHAction(
      ycHuySkID,
      trangThaiYcHuyDaDuyetId,
      nguoiDuyet.nguoiDungID,
      null,
      payload.ghiChuBGH,
      transaction
    );
    logger.debug(
      `YeuCauHuySK ID: ${ycHuySkID} status updated to DA_DUYET_HUY.`
    );

    // 2. Cập nhật SuKien
    await suKienRepository.updateSuKienTrangThai(
      yeuCauHuy.SuKienID,
      trangThaiSkDaHuyId,
      transaction
    );
    logger.debug(`SuKien ID: ${yeuCauHuy.SuKienID} status updated to DA_HUY.`);

    let phongDaDuocGiaiPhongThongBao = false;
    const trangThaiChiTietHuyID =
      await suKienRepository.getTrangThaiIDByMaGeneric(
        MaTrangThaiYeuCauPhong.YCCPCT_DA_HUY,
        'TrangThaiYeuCauPhong',
        'TrangThaiYcpID',
        'MaTrangThai',
        transaction
      );
    if (!trangThaiChiTietHuyID) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi cấu hình: Không tìm thấy trạng thái chi tiết yêu cầu phòng đã hủy.'
      );
    }

    await yeuCauHuySKRepository.cancelAllChiTietYeuCauBySuKienID(
      yeuCauHuy.SuKienID,
      trangThaiChiTietHuyID,
      transaction
    );
    logger.info(
      `All YcMuonPhongChiTiet records for SuKienID: ${yeuCauHuy.SuKienID} have been marked as cancelled.`
    );
    phongDaDuocGiaiPhongThongBao = true;

    // // 3. XỬ LÝ GIẢI PHÓNG PHÒNG (SỬA LẠI HOÀN TOÀN)
    // let phongDaDuocGiaiPhongThongBao = false;
    // const bookedPhongRecords =
    //   await yeuCauMuonPhongRepository.getChiTietDatPhongBySuKienID(
    //     yeuCauHuy.SuKienID,
    //     transaction
    //   );

    // if (bookedPhongRecords && bookedPhongRecords.length > 0) {
    //   // BƯỚC 1: Xóa các YeuCauDoiPhong liên quan trước (xóa con)
    //   await yeuCauHuySKRepository.deleteYeuCauDoiPhongBySuKienID(
    //     yeuCauHuy.SuKienID,
    //     transaction
    //   );
    //   logger.info(
    //     `All YeuCauDoiPhong records deleted for cancelled SuKienID: ${yeuCauHuy.SuKienID}`
    //   );

    //   // BƯỚC 2: Bây giờ mới xóa ChiTietDatPhong (xóa cha)
    //   await yeuCauHuySKRepository.deleteChiTietDatPhongBySuKienID(
    //     yeuCauHuy.SuKienID,
    //     transaction
    //   );
    //   logger.info(
    //     `All ChiTietDatPhong records deleted for cancelled SuKienID: ${yeuCauHuy.SuKienID}`
    //   );
    //   phongDaDuocGiaiPhongThongBao = true;
    // }

    await transaction.commit();
    logger.info(`Transaction committed for approving YcHuySkID: ${ycHuySkID}`);

    // Gửi thông báo cho người tạo yêu cầu hủy (CB_TO_CHUC_SU_KIEN)
    const yeuCauHuyChiTiet =
      await yeuCauHuySKRepository.getYeuCauHuySKDetailById(ycHuySkID);
    const nguoiTaoYeuCauHuyID = yeuCauHuy.NguoiYeuCauID; // Lấy từ yeuCauHuy đã có trước khi commit
    const tenSuKien =
      yeuCauHuyChiTiet?.suKien?.tenSK || `ID: ${yeuCauHuy.SuKienID}`;

    if (nguoiTaoYeuCauHuyID) {
      thongBaoService
        .createThongBao({
          NguoiNhanID: nguoiTaoYeuCauHuyID,
          NoiDungTB: `Yêu cầu hủy sự kiện "[${tenSuKien}]" của bạn đã được Ban Giám Hiệu DUYỆT. Sự kiện đã được hủy thành công. ${phongDaDuocGiaiPhongThongBao ? 'Các phòng đã đặt đã được giải phóng.' : ''}`,
          DuongDanTB: `/quan-ly-su-kien/${yeuCauHuy.SuKienID}/chi-tiet`,
          SkLienQuanID: yeuCauHuy.SuKienID,
          LoaiThongBao: LoaiThongBao.YC_HUY_SK_DA_DUYET,
        })
        .catch((err) =>
          logger.error('Failed to send YC_HUY_SK_DA_DUYET notification:', err)
        );
    }

    if (phongDaDuocGiaiPhongThongBao) {
      // Gửi thông báo cho QUAN_LY_CSVC
      const usersCSVC = await authRepository.findUsersByRoleMa(
        MaVaiTro.QUAN_LY_CSVC
      );
      if (usersCSVC && usersCSVC.length > 0) {
        usersCSVC.forEach((userCSVC) => {
          thongBaoService
            .createThongBao({
              NguoiNhanID: userCSVC.NguoiDungID,
              NoiDungTB: `Sự kiện "[${tenSuKien}]" (ID: ${yeuCauHuy.SuKienID}) đã được BGH duyệt hủy. Các phòng liên quan đã được cập nhật trạng thái sẵn sàng. Vui lòng kiểm tra.`,
              DuongDanTB: `/admin/quan-ly-phong/lich-su-dung?suKienID=${yeuCauHuy.SuKienID}`,
              SkLienQuanID: yeuCauHuy.SuKienID,
              LoaiThongBao: LoaiThongBao.PHONG_DA_GIAI_PHONG_DO_HUY_SK, // Cần thêm loại này
            })
            .catch((err) =>
              logger.error(
                'Failed to send PHONG_DA_GIAI_PHONG notification to CSVC:',
                err
              )
            );
        });
      }
    }

    return yeuCauHuySKRepository.getYeuCauHuySKDetailById(ycHuySkID);
  } catch (error) {
    logger.error(
      `Error during approving YcHuySkID: ${ycHuySkID}, rolling back...`,
      error
    );
    if (transaction) {
      try {
        await transaction.rollback();
        logger.info('Transaction rolled back.');
      } catch (rbError) {
        logger.error('Error during transaction rollback:', rbError);
      }
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Duyệt yêu cầu hủy sự kiện thất bại.'
    );
  }
};

/**
 * Từ chối yêu cầu hủy sự kiện (BGH từ chối)
 * Đầu vào: ycHuySkID (number), payload (object: lyDoTuChoiHuyBGH), nguoiDuyet (object)
 * Đầu ra: object chi tiết yêu cầu hủy sự kiện sau khi bị từ chối
 */
const tuChoiYeuCauHuySK = async (ycHuySkID, payload, nguoiDuyet) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    logger.debug(`Transaction started for rejecting YcHuySkID: ${ycHuySkID}`);

    const yeuCauHuy = await yeuCauHuySKRepository.getYeuCauHuySKForProcessing(
      ycHuySkID,
      transaction
    );
    if (!yeuCauHuy) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Yêu cầu hủy sự kiện không tồn tại.'
      );
    }
    if (
      yeuCauHuy.MaTrangThaiHienTai !== MaTrangThaiYeuCauHuySK.CHO_DUYET_HUY_BGH
    ) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Yêu cầu hủy không ở trạng thái "Chờ duyệt BGH". Trạng thái hiện tại: ${yeuCauHuy.MaTrangThaiHienTai}`
      );
    }

    const trangThaiYcHuyTuChoiId =
      await suKienRepository.getTrangThaiIDByMaGeneric(
        MaTrangThaiYeuCauHuySK.TU_CHOI_HUY,
        'TrangThaiYeuCauHuySK',
        'TrangThaiYcHuySkID',
        'MaTrangThai',
        transaction
      );
    if (!trangThaiYcHuyTuChoiId)
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi cấu hình trạng thái.'
      );

    // 1. Cập nhật YeuCauHuySK
    await yeuCauHuySKRepository.updateYeuCauHuySKAfterBGHAction(
      ycHuySkID,
      trangThaiYcHuyTuChoiId,
      nguoiDuyet.nguoiDungID,
      payload.lyDoTuChoiHuyBGH,
      null, // Không có ghi chú khi từ chối (trừ khi FE gửi)
      transaction
    );
    logger.debug(`YeuCauHuySK ID: ${ycHuySkID} status updated to TU_CHOI_HUY.`);

    // 2. Cập nhật SuKien: Quay lại trạng thái trước khi có yêu cầu hủy
    // Cần biết trạng thái sự kiện trước đó. Logic này có thể phức tạp.
    // Đơn giản nhất là quay lại DA_DUYET_BGH hoặc DA_XAC_NHAN_PHONG tùy thuộc vào việc đã có phòng hay chưa.
    // Hoặc, khi tạo YeuCauHuySK, lưu lại TrangThaiSkID_TruocKhiHuy.
    // Tạm thời, nếu bị từ chối hủy, sự kiện sẽ quay lại CHO_DUYET_PHONG (nếu đã duyệt BGH) hoặc DA_XAC_NHAN_PHONG (nếu đã có phòng)
    // Logic này cần được làm rõ: trạng thái sự kiện sẽ là gì sau khi BGH từ chối YC hủy?
    // Giả sử nó quay lại DA_DUYET_BGH (chờ phòng) hoặc DA_XAC_NHAN_PHONG
    const suKienCurrentStatus =
      await yeuCauMuonPhongRepository.getSuKienTrangThai(
        yeuCauHuy.SuKienID,
        transaction
      );
    let trangThaiSKMoiSauTuChoiHuyID;

    // Kiểm tra xem sự kiện đã có phòng đặt hay chưa
    const chiTietDatPhong = await executeQuery(
      `SELECT TOP 1 DatPhongID FROM ChiTietDatPhong cdp JOIN YcMuonPhongChiTiet yct ON cdp.YcMuonPhongCtID = yct.YcMuonPhongCtID JOIN YeuCauMuonPhong yc ON yct.YcMuonPhongID = yc.YcMuonPhongID WHERE yc.SuKienID = @SuKienID`,
      [{ name: 'SuKienID', type: sql.Int, value: yeuCauHuy.SuKienID }],
      transaction
    );

    if (chiTietDatPhong.recordset.length > 0) {
      trangThaiSKMoiSauTuChoiHuyID =
        await suKienRepository.getTrangThaiIDByMaGeneric(
          MaTrangThaiSK.DA_XAC_NHAN_PHONG,
          'TrangThaiSK',
          'TrangThaiSkID',
          'MaTrangThai',
          transaction
        );
    } else {
      // Nếu chưa có phòng, nó nên ở trạng thái chờ phòng hoặc đã duyệt BGH
      // Nếu sự kiện trước đó ở CHO_DUYET_PHONG, thì quay lại CHO_DUYET_PHONG
      // Nếu trước đó chỉ mới DA_DUYET_BGH, thì quay lại DA_DUYET_BGH
      // Để đơn giản, nếu không có phòng, quay lại DA_DUYET_BGH (để có thể tạo YC phòng lại nếu cần)
      trangThaiSKMoiSauTuChoiHuyID =
        await suKienRepository.getTrangThaiIDByMaGeneric(
          MaTrangThaiSK.DA_DUYET_BGH,
          'TrangThaiSK',
          'TrangThaiSkID',
          'MaTrangThai',
          transaction
        );
    }

    if (!trangThaiSKMoiSauTuChoiHuyID)
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi cấu hình trạng thái sự kiện sau từ chối hủy.'
      );

    await suKienRepository.updateSuKienTrangThai(
      yeuCauHuy.SuKienID,
      trangThaiSKMoiSauTuChoiHuyID,
      transaction
    );
    logger.debug(
      `SuKien ID: ${yeuCauHuy.SuKienID} status reverted after cancellation rejection.`
    );

    await transaction.commit();
    logger.info(`Transaction committed for rejecting YcHuySkID: ${ycHuySkID}`);

    // Gửi thông báo cho người tạo yêu cầu hủy
    const yeuCauHuyChiTiet =
      await yeuCauHuySKRepository.getYeuCauHuySKDetailById(ycHuySkID);
    if (yeuCauHuyChiTiet && yeuCauHuyChiTiet.nguoiYeuCau) {
      thongBaoService
        .createThongBao({
          NguoiNhanID: yeuCauHuyChiTiet.nguoiYeuCau.nguoiDungID,
          NoiDungTB: `Yêu cầu hủy sự kiện "[${yeuCauHuyChiTiet.suKien.tenSK}]" của bạn đã bị Ban Giám Hiệu từ chối. Lý do: ${payload.lyDoTuChoiHuyBGH}`,
          DuongDanTB: `/quan-ly-su-kien/${yeuCauHuyChiTiet.suKien.suKienID}/chi-tiet`,
          SkLienQuanID: yeuCauHuyChiTiet.suKien.suKienID,
          LoaiThongBao: LoaiThongBao.YC_HUY_SK_BI_TU_CHOI,
        })
        .catch((err) =>
          logger.error('Failed to send YC_HUY_SK_BI_TU_CHOI notification:', err)
        );
    }

    return yeuCauHuySKRepository.getYeuCauHuySKDetailById(ycHuySkID);
  } catch (error) {
    logger.error(
      `Error during rejecting YcHuySkID: ${ycHuySkID}, rolling back...`,
      error
    );
    if (transaction) {
      try {
        await transaction.rollback();
        logger.info('Transaction rolled back.');
      } catch (rbError) {
        logger.error('Error during transaction rollback:', rbError);
      }
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Từ chối yêu cầu hủy sự kiện thất bại.'
    );
  }
};

/**
 * [MỚI] Thu hồi một yêu cầu hủy sự kiện.
 * @param {number} ycHuySkID
 * @param {object} currentUser
 * @returns {Promise<object>} Yêu cầu hủy đã được cập nhật.
 */
const thuHoiYeuCauHuySK = async (ycHuySkID, currentUser) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    // 1. Lấy thông tin yêu cầu hủy để kiểm tra
    const yeuCauHuy = await yeuCauHuySKRepository.getYeuCauHuySKForProcessing(
      ycHuySkID,
      transaction
    );
    if (!yeuCauHuy) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Yêu cầu hủy không tồn tại.');
    }

    // 2. Kiểm tra quyền sở hữu
    if (yeuCauHuy.NguoiYeuCauID !== currentUser.nguoiDungID) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Bạn không có quyền thu hồi yêu cầu này.'
      );
    }

    // 3. Kiểm tra trạng thái hiện tại của yêu cầu
    if (
      yeuCauHuy.MaTrangThaiHienTai !== MaTrangThaiYeuCauHuySK.CHO_DUYET_HUY_BGH
    ) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Chỉ có thể thu hồi yêu cầu ở trạng thái "Chờ duyệt". Trạng thái hiện tại: ${yeuCauHuy.MaTrangThaiHienTai}`
      );
    }

    // 4. Lấy ID các trạng thái mới cần thiết
    const trangThaiYcHuyDaThuHoiId =
      await suKienRepository.getTrangThaiIDByMaGeneric(
        MaTrangThaiYeuCauHuySK.DA_THU_HOI,
        'TrangThaiYeuCauHuySK',
        'TrangThaiYcHuySkID',
        'MaTrangThai',
        transaction
      );
    // Logic quay lại trạng thái sự kiện: Kiểm tra xem sự kiện có phòng chưa
    const bookedRooms =
      await yeuCauMuonPhongRepository.getChiTietDatPhongBySuKienID(
        yeuCauHuy.SuKienID,
        transaction
      );
    const trangThaiSkMoi =
      bookedRooms.length > 0
        ? MaTrangThaiSK.DA_XAC_NHAN_PHONG
        : MaTrangThaiSK.DA_DUYET_BGH;
    const trangThaiSkMoiID = await suKienRepository.getTrangThaiSkIDByMa(
      trangThaiSkMoi,
      transaction
    );

    if (!trangThaiYcHuyDaThuHoiId || !trangThaiSkMoiID) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi cấu hình trạng thái.'
      );
    }

    // 5. Cập nhật trạng thái của YeuCauHuySK -> DA_THU_HOI
    await yeuCauHuySKRepository.updateYeuCauHuySKStatus(
      ycHuySkID,
      trangThaiYcHuyDaThuHoiId,
      transaction
    );

    // 6. Cập nhật trạng thái của SuKien -> quay lại trạng thái trước khi yêu cầu hủy
    await suKienRepository.updateSuKienTrangThai(
      yeuCauHuy.SuKienID,
      trangThaiSkMoiID,
      transaction
    );

    await transaction.commit();
    logger.info(
      `User ${currentUser.nguoiDungID} revoked cancellation request ID: ${ycHuySkID}`
    );

    return yeuCauHuySKRepository.getYeuCauHuySKDetailById(ycHuySkID);
  } catch (error) {
    if (transaction) await transaction.rollback();
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Thu hồi yêu cầu thất bại.'
    );
  }
};

/**
 * [MỚI] Gửi nhắc nhở cho các yêu cầu hủy sự kiện quá hạn.
 */
const sendRemindersForOverdueCancelRequests = async () => {
  logger.info('JOB: Checking for overdue event cancellation requests...');
  const overdueRequests = await yeuCauHuySKRepository.findOverdueCancelRequests(
    SO_NGAY_QUA_HAN_YEU_CAU_HUY
  );

  if (overdueRequests.length === 0) {
    logger.info('JOB: No overdue event cancellation requests found.');
    return;
  }

  const usersBGH = await authRepository.findUsersByRoleMa(
    MaVaiTro.BGH_DUYET_SK_TRUONG
  );
  if (!usersBGH || usersBGH.length === 0) {
    logger.warn('JOB: No BGH users found to send reminders.');
    return;
  }

  for (const request of overdueRequests) {
    const noiDungTB = `Nhắc nhở: Yêu cầu hủy sự kiện "[${request.TenSK}]" (tạo bởi ${request.HoTenNguoiYeuCau}) đã chờ duyệt quá ${SO_NGAY_QUA_HAN_YEU_CAU_HUY} ngày.`;
    for (const user of usersBGH) {
      thongBaoService
        .createThongBao({
          NguoiNhanID: user.NguoiDungID,
          NoiDungTB: noiDungTB,
          DuongDanTB: `/admin/yeu-cau-huy-cho-duyet/${request.YcHuySkID}`,
          YcLienQuanID: request.YcHuySkID,
          LoaiYcLienQuan: 'YEUCAUHUYSK',
          LoaiThongBao: 'YC_HUY_SK_NHAC_NHO_DUYET_BGH', // Cần thêm vào enum nếu muốn
        })
        .catch((err) =>
          logger.error(
            `Failed to send cancel request reminder to BGH user ${user.NguoiDungID}`,
            err
          )
        );
    }
  }
  logger.info(
    `JOB: Sent reminders for ${overdueRequests.length} overdue event cancellation requests.`
  );
};

export const yeuCauHuySKService = {
  getYeuCauHuySKs,
  getYeuCauHuySKDetail,
  createYeuCauHuySK,
  duyetYeuCauHuySK,
  tuChoiYeuCauHuySK,
  thuHoiYeuCauHuySK,
  sendRemindersForOverdueCancelRequests,
};
