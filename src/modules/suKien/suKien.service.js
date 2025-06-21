// src/modules/suKien/suKien.service.js
import sql from 'mssql';
import { format } from 'morgan';
import { suKienRepository } from './suKien.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js'; // Import enum MaVaiTro
import MaTrangThaiSK from '../../enums/maTrangThaiSK.enum.js';
import { authRepository } from '../auth/auth.repository.js';
import { loaiSuKienRepository } from '../loaiSuKien/loaiSuKien.repository.js';
import LoaiThongBao from '../../enums/loaiThongBao.enum.js';
import { thongBaoService } from '../thongBao/thongBao.service.js';
import logger from '../../utils/logger.util.js';
import { getPool } from '../../utils/database.js';
import { nguoiDungRepository } from '../nguoiDung/nguoiDung.repository.js';
import emailService from '../../services/email.service.js';
/**
 * Lấy danh sách sự kiện với phân trang và bộ lọc
 * @param {object} params - GetSuKienParams
 * @returns {Promise<PaginatedSuKienResponse>}
 */
const getSuKienList = async (params) => {
  const { items, totalItems } =
    await suKienRepository.getSuKienListWithPagination(params);

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
 * Lấy chi tiết một sự kiện
 * @param {number} suKienID
 * @returns {Promise<SuKienDetailResponse>}
 */
const getSuKienDetail = async (suKienID) => {
  const suKien = await suKienRepository.getSuKienDetailById(suKienID);

  if (!suKien) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Sự kiện không tồn tại hoặc bạn không có quyền truy cập.'
    );
  }

  return suKien;
};

/**
 * Cập nhật trạng thái của một sự kiện (ví dụ: tự hủy bởi người tạo)
 * @param {number} suKienID ID của sự kiện
 * @param {object} payload - UpdateSuKienTrangThaiPayload (từ FE)
 * @param {object} nguoiThucHien - Thông tin người dùng thực hiện hành động (từ req.user)
 * @returns {Promise<SuKienDetailResponse>} Sự kiện đã được cập nhật chi tiết
 */
const updateSuKienTrangThai = async (suKienID, payload, nguoiThucHien) => {
  const { maTrangThaiMoi, lyDo } = payload;

  const suKienHienTai =
    await suKienRepository.findSuKienForStatusUpdate(suKienID);
  if (!suKienHienTai) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sự kiện không tồn tại.');
  }

  if (maTrangThaiMoi === MaTrangThaiSK.DA_HUY_BOI_NGUOI_TAO) {
    if (suKienHienTai.NguoiTaoID !== nguoiThucHien.nguoiDungID) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Bạn không phải là người tạo sự kiện này để thực hiện hành động tự hủy.'
      );
    }
    if (
      suKienHienTai.MaTrangThaiHienTai !== MaTrangThaiSK.CHO_DUYET_BGH &&
      suKienHienTai.MaTrangThaiHienTai !==
        MaTrangThaiSK.BGH_YEU_CAU_CHINH_SUA_SK
    ) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Không thể tự hủy sự kiện khi đang ở trạng thái "${suKienHienTai.MaTrangThaiHienTai}". Chỉ có thể tự hủy khi đang "${MaTrangThaiSK.CHO_DUYET_BGH} và ${MaTrangThaiSK.BGH_YEU_CAU_CHINH_SUA_SK}".`
      );
    }
    if (!lyDo) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Cần cung cấp lý do khi tự hủy sự kiện.'
      );
    }
  } else {
    const userRoles = await authRepository.getVaiTroChucNangByNguoiDungID(
      nguoiThucHien.nguoiDungID
    );
    const isAdmin = userRoles.some(
      (r) => r.maVaiTro === MaVaiTro.ADMIN_HE_THONG
    );
    if (!isAdmin) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Bạn không có quyền cập nhật sang trạng thái này.'
      );
    }
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Hành động cập nhật sang trạng thái "${maTrangThaiMoi}" không được hỗ trợ qua API này hoặc bạn không có quyền.`
    );
  }

  const trangThaiSkIDMoi =
    await suKienRepository.getTrangThaiSkIDByMa(maTrangThaiMoi);
  if (!trangThaiSkIDMoi) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Mã trạng thái mới "${maTrangThaiMoi}" không hợp lệ.`
    );
  }

  await suKienRepository.updateSuKienTrangThaiVaLyDo(
    suKienID,
    trangThaiSkIDMoi,
    lyDo
  );

  const suKienUpdated = await suKienRepository.getSuKienDetailById(suKienID);
  if (!suKienUpdated) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Không thể lấy thông tin sự kiện sau khi cập nhật.'
    );
  }
  return suKienUpdated;
};

/**
 * Lấy danh sách sự kiện CÔNG KHAI
 * @param {object} params - GetPublicSuKienParams
 * @returns {Promise<PaginatedSuKienResponse>}
 */
const getPublicSuKienList = async (params) => {
  const { items, totalItems } =
    await suKienRepository.getPublicSuKienListWithPagination(params);

  const page = parseInt(params.page, 10) || 1;
  const limit = parseInt(params.limit, 10) || 9;
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
 * Lấy chi tiết một sự kiện CÔNG KHAI
 * @param {number} suKienID
 * @returns {Promise<SuKienDetailResponse>}
 */
const getPublicSuKienDetail = async (suKienID) => {
  const suKien = await suKienRepository.getPublicSuKienDetailById(suKienID);
  if (!suKien) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Sự kiện không tồn tại hoặc không được phép truy cập công khai.'
    );
  }

  return suKien;
};

const createSuKienService = async (suKienBody, nguoiTaoID) => {
  const { cacDonViThamGiaIDs, ...suKienDataToCreate } = suKienBody;

  // 1. Validate LoaiSuKienID (nếu có)
  if (suKienDataToCreate.loaiSuKienID) {
    const loaiSK = await loaiSuKienRepository.getLoaiSKById(
      suKienDataToCreate.loaiSuKienID
    );
    if (!loaiSK || !loaiSK.IsActive) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Loại sự kiện không hợp lệ hoặc không hoạt động.'
      );
    }
  } else {
    suKienDataToCreate.loaiSuKienID = null;
  }

  // 2. Lấy ID trạng thái ban đầu
  const trangThaiBanDauID = await suKienRepository.getTrangThaiSkIDByMa(
    MaTrangThaiSK.CHO_DUYET_BGH
  );
  logger.debug('Trang thái ban đầu của sự kiện:', trangThaiBanDauID);
  if (!trangThaiBanDauID) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Lỗi cấu hình: Không tìm thấy trạng thái sự kiện ban đầu.'
    );
  }

  // 3. Kiểm tra ràng buộc chủ trì (NguoiChuTriID hoặc TenChuTriNgoai)
  if (!suKienDataToCreate.nguoiChuTriID && !suKienDataToCreate.tenChuTriNgoai) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Cần cung cấp thông tin người chủ trì (nội bộ hoặc bên ngoài).'
    );
  }
  if (suKienDataToCreate.nguoiChuTriID && suKienDataToCreate.tenChuTriNgoai) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Chỉ cung cấp người chủ trì nội bộ hoặc bên ngoài, không cung cấp cả hai.'
    );
  }
  if (
    suKienDataToCreate.tenChuTriNgoai &&
    !suKienDataToCreate.donViChuTriNgoai
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Nếu có tên chủ trì ngoài, cần cung cấp đơn vị chủ trì ngoài.'
    );
  }

  const suKienPayloadForDB = {
    ...suKienDataToCreate,
    nguoiTaoID,
    trangThaiSkID: trangThaiBanDauID,
    isCongKhaiNoiBo:
      suKienDataToCreate.isCongKhaiNoiBo !== undefined
        ? suKienDataToCreate.isCongKhaiNoiBo
        : false,
    tgBatDauThucTe: null,
    tgKetThucThucTe: null,
  };
  const pool = await getPool();
  if (!pool) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Lỗi kết nối cơ sở dữ liệu.'
    );
  }
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    logger.debug('Transaction started for creating SuKien');

    const createdSuKienRaw = await suKienRepository.createSuKien(
      suKienPayloadForDB,
      transaction
    );
    const newSuKienID = createdSuKienRaw.SuKienID;
    logger.debug(`SuKien created with ID: ${newSuKienID}`);

    if (newSuKienID && cacDonViThamGiaIDs && cacDonViThamGiaIDs.length > 0) {
      logger.debug(
        `Adding DonViThamGia for SuKienID: ${newSuKienID}`,
        cacDonViThamGiaIDs
      );
      await suKienRepository.addDonViThamGiaToSuKien(
        newSuKienID,
        cacDonViThamGiaIDs,
        transaction
      );
      logger.debug('DonViThamGia added successfully.');
    }

    await transaction.commit();
    logger.info(`Transaction committed for SuKienID: ${newSuKienID}`);

    const chiTietSuKienVuaTao =
      await suKienRepository.getSuKienDetailById(newSuKienID);
    if (!chiTietSuKienVuaTao) {
      logger.error(
        `Failed to fetch details for newly created SuKienID: ${newSuKienID} after commit.`
      );
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Không thể lấy chi tiết sự kiện vừa tạo sau khi commit.'
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
            NoiDungTB: `Có sự kiện mới "[${chiTietSuKienVuaTao.tenSK}]" đang chờ Ban Giám Hiệu duyệt.`,
            DuongDanTB: `/admin/su-kien-cho-duyet/${chiTietSuKienVuaTao.suKienID}`,
            SkLienQuanID: chiTietSuKienVuaTao.suKienID,
            LoaiThongBao: LoaiThongBao.SU_KIEN_MOI_CHO_DUYET_BGH,
          })
          .catch((err) =>
            logger.error(
              'Failed to send SU_KIEN_MOI_CHO_DUYET_BGH notification:',
              err
            )
          );
      });
    }
    return chiTietSuKienVuaTao;
  } catch (error) {
    logger.error(
      'Error during SuKien creation transaction, rolling back...',
      error
    );
    if (transaction) {
      try {
        await transaction.rollback();
        logger.info('Transaction rolled back successfully.');
      } catch (rollbackError) {
        logger.error('Error during transaction rollback:', rollbackError);
      }
    }
    // Ném lại lỗi gốc hoặc một lỗi cụ thể hơn
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Tạo sự kiện thất bại do lỗi hệ thống.'
    );
  }
};

const updateSuKienService = async (suKienID, updateBody, nguoiThucHien) => {
  logger.debug(`Updating SuKien with ID: ${suKienID}`, updateBody);
  const suKienHienTai = await suKienRepository.getSuKienDetailById(suKienID);
  if (!suKienHienTai) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sự kiện không tồn tại.');
  }

  if (
    suKienHienTai.nguoiTao.nguoiDungID !== nguoiThucHien.nguoiDungID &&
    !(
      await authRepository.getVaiTroChucNangByNguoiDungID(
        nguoiThucHien.nguoiDungID
      )
    ).some((role) => role.maVaiTro === MaVaiTro.ADMIN_HE_THONG)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Bạn không có quyền sửa sự kiện này.'
    );
  }

  // Kiểm tra trạng thái cho phép sửa
  const allowedEditStatuses = [
    MaTrangThaiSK.CHO_DUYET_BGH,
    MaTrangThaiSK.BGH_YEU_CAU_CHINH_SUA_SK,
    MaTrangThaiSK.DA_HUY_BOI_NGUOI_TAO,
    MaTrangThaiSK.BI_TU_CHOI_BGH,
    MaTrangThaiSK.DA_HUY_BOI_NGUOI_TAO,
  ];
  if (!allowedEditStatuses.includes(suKienHienTai.trangThaiSK.maTrangThai)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Không thể sửa sự kiện khi đang ở trạng thái "${suKienHienTai.trangThaiSK.tenTrangThai}".`
    );
  }

  // Validate các FKs nếu được cập nhật (LoaiSuKienID, DonViChuTriID nếu cho phép sửa)
  if (
    updateBody.loaiSuKienID &&
    updateBody.loaiSuKienID !== suKienHienTai.loaiSuKien?.loaiSuKienID
  ) {
    const loaiSK = await loaiSuKienRepository.getLoaiSKById(
      updateBody.loaiSuKienID
    );
    if (!loaiSK) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Loại sự kiện mới không hợp lệ.'
      );
    }
  }

  const { cacDonViThamGiaIDs, ghiChuPhanHoiChoBGH, ...suKienUpdateData } =
    updateBody;

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    await suKienRepository.updateSuKienById(
      suKienID,
      suKienUpdateData,
      transaction
    );
    logger.info(`SuKienID ${suKienID} updated with data:`, suKienUpdateData);
    if (cacDonViThamGiaIDs !== undefined) {
      await suKienRepository.clearDonViThamGiaFromSuKien(suKienID, transaction);
      if (cacDonViThamGiaIDs.length > 0) {
        await suKienRepository.addDonViThamGiaToSuKien(
          suKienID,
          cacDonViThamGiaIDs,
          transaction
        );
      }
    }
    logger.info(`SuKienID ${suKienID} updated successfully.`);

    let shouldNotifyBGH = false;
    if (
      suKienHienTai.trangThaiSK.maTrangThai ===
        MaTrangThaiSK.BGH_YEU_CAU_CHINH_SUA_SK ||
      suKienHienTai.trangThaiSK.maTrangThai === MaTrangThaiSK.CHO_DUYET_BGH ||
      suKienHienTai.trangThaiSK.maTrangThai ===
        MaTrangThaiSK.DA_HUY_BOI_NGUOI_TAO ||
      suKienHienTai.trangThaiSK.maTrangThai === MaTrangThaiSK.BI_TU_CHOI_BGH ||
      suKienHienTai.trangThaiSK.maTrangThai ===
        MaTrangThaiSK.DA_HUY_BOI_NGUOI_TAO
    ) {
      shouldNotifyBGH = true;
      const trangThaiChoDuyetBGHID =
        await suKienRepository.getTrangThaiSkIDByMa(
          MaTrangThaiSK.CHO_DUYET_BGH,
          transaction
        );
      if (!trangThaiChoDuyetBGHID)
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Lỗi cấu hình trạng thái.'
        );

      await suKienRepository.updateSuKienTrangThai(
        suKienID,
        trangThaiChoDuyetBGHID,
        transaction
      );
      logger.info(
        `SuKienID ${suKienID} status changed back to CHO_DUYET_BGH after edit.`
      );

      if (shouldNotifyBGH) {
        const tenSKMoiNhat = updateBody.tenSK || suKienHienTai.tenSK;

        const usersBGH = await authRepository.findUsersByRoleMa(
          MaVaiTro.BGH_DUYET_SK_TRUONG
        );
        if (usersBGH && usersBGH.length > 0) {
          usersBGH.forEach((user) => {
            // Dùng Promise.allSettled để không đợi từng cái, và không làm crash tiến trình chính nếu 1 cái lỗi
            thongBaoService
              .createThongBao({
                NguoiNhanID: user.NguoiDungID,
                NoiDungTB: `Sự kiện "[${tenSKMoiNhat}]" đã được người tạo chỉnh sửa (Phản hồi: ${ghiChuPhanHoiChoBGH || 'Không có'}) và đang chờ duyệt lại.`,
                DuongDanTB: `/admin/su-kien-cho-duyet/${suKienID}`,
                SkLienQuanID: suKienID,
                LoaiThongBao: 'SU_KIEN_DA_CHINH_SUA_CHO_BGH', // Cần thêm enum này
                transaction,
              })
              .catch((err) =>
                logger.error(
                  'Failed to send SU_KIEN_DA_CHINH_SUA_CHO_BGH notification:',
                  err
                )
              );
          });
        }
      }
      logger.debug(
        `Transaction for updating SuKienID ${suKienID} started successfully.`
      );
      await transaction.commit();
    }

    const updatedSuKienDetail =
      await suKienRepository.getSuKienDetailById(suKienID);
    if (!updatedSuKienDetail) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Không thể lấy thông tin sự kiện sau khi cập nhật.'
      );
    }
    return updatedSuKienDetail;
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rbErr) {
        logger.error(
          'Error rolling back transaction on updateSuKienService:',
          rbErr
        );
      }
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Cập nhật sự kiện thất bại.'
    );
  }
};

/**
 * BGH duyệt sự kiện
 * @param {number} suKienID
 * @param {object} payload - DuyetSuKienPayload (chứa ghiChuBGH)
 * @param {object} nguoiDuyet - Thông tin người dùng BGH (từ req.user)
 * @returns {Promise<SuKienDetailResponse>}
 */
const duyetSuKienByBGH = async (suKienID, payload, nguoiDuyet) => {
  const suKien = await suKienRepository.findSuKienForStatusUpdate(suKienID);
  if (!suKien) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sự kiện không tồn tại.');
  }

  if (suKien.MaTrangThaiHienTai !== MaTrangThaiSK.CHO_DUYET_BGH) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Sự kiện không ở trạng thái "Chờ duyệt BGH". Trạng thái hiện tại: ${suKien.MaTrangThaiHienTai}`
    );
  }

  const trangThaiDaDuyetID = await suKienRepository.getTrangThaiSkIDByMa(
    MaTrangThaiSK.DA_DUYET_BGH
  );
  if (!trangThaiDaDuyetID) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Lỗi cấu hình: Không tìm thấy mã trạng thái "Đã duyệt BGH".'
    );
  }

  await suKienRepository.updateSuKienByBGHAction(
    suKienID,
    nguoiDuyet.nguoiDungID,
    new Date(),
    trangThaiDaDuyetID,
    payload.ghiChuBGH
  );

  const updatedSuKien = await suKienRepository.getSuKienDetailById(suKienID);

  // Gửi thông báo cho người tạo sự kiện
  if (
    updatedSuKien &&
    updatedSuKien.nguoiTao &&
    updatedSuKien.nguoiTao.nguoiDungID
  ) {
    thongBaoService
      .createThongBao({
        NguoiNhanID: updatedSuKien.nguoiTao.nguoiDungID,
        NoiDungTB: `Sự kiện "[${updatedSuKien.tenSK}]" của bạn đã được Ban Giám Hiệu duyệt. Vui lòng tiến hành đăng ký phòng.`,
        DuongDanTB: `/quan-ly-su-kien/${suKienID}/chi-tiet`,
        SkLienQuanID: suKienID,
        LoaiThongBao: LoaiThongBao.SU_KIEN_DA_DUYET_BGH,
      })
      .catch((err) =>
        logger.error('Failed to send DA_DUYET_BGH notification:', err)
      );
  }
  return updatedSuKien;
};
/**
 * BGH từ chối sự kiện
 * @param {number} suKienID
 * @param {object} payload - TuChoiSuKienPayload (chứa lyDoTuChoiBGH)
 * @param {object} nguoiDuyet - Thông tin người dùng BGH (từ req.user)
 * @returns {Promise<SuKienDetailResponse>}
 */
const tuChoiSuKienByBGH = async (suKienID, payload, nguoiDuyet) => {
  const suKien = await suKienRepository.findSuKienForStatusUpdate(suKienID);
  if (!suKien) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sự kiện không tồn tại.');
  }
  logger.debug('suKien for tuChoiSuKienByBGH:', suKien);

  if (suKien.MaTrangThaiHienTai !== MaTrangThaiSK.CHO_DUYET_BGH) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Sự kiện không ở trạng thái "Chờ duyệt BGH". Trạng thái hiện tại: ${suKien.MaTrangThaiHienTai}`
    );
  }

  const trangThaiBiTuChoiID = await suKienRepository.getTrangThaiSkIDByMa(
    MaTrangThaiSK.BI_TU_CHOI_BGH
  );
  if (!trangThaiBiTuChoiID) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Lỗi cấu hình: Không tìm thấy mã trạng thái "Bị từ chối BGH".'
    );
  }

  await suKienRepository.updateSuKienByBGHAction(
    suKienID,
    nguoiDuyet.nguoiDungID,
    new Date(),
    trangThaiBiTuChoiID,
    null,
    payload.lyDoTuChoiBGH
  );

  const updatedSuKien = await suKienRepository.getSuKienDetailById(suKienID);

  // Gửi thông báo cho người tạo sự kiện
  if (
    updatedSuKien &&
    updatedSuKien.nguoiTao &&
    updatedSuKien.nguoiTao.nguoiDungID
  ) {
    thongBaoService
      .createThongBao({
        NguoiNhanID: updatedSuKien.nguoiTao.nguoiDungID,
        NoiDungTB: `Sự kiện "[${updatedSuKien.tenSK}]" của bạn đã bị Ban Giám Hiệu từ chối. Lý do: ${payload.lyDoTuChoiBGH}`,
        DuongDanTB: `/quan-ly-su-kien/${suKienID}/chi-tiet`,
        SkLienQuanID: suKienID,
        LoaiThongBao: LoaiThongBao.SU_KIEN_BI_TU_CHOI_BGH,
      })
      .catch((err) =>
        logger.error('Failed to send BI_TU_CHOI_BGH notification:', err)
      );
  }
  return updatedSuKien;
};

/**
 * Lấy danh sách sự kiện đủ điều kiện để tạo yêu cầu phòng.
 * @param {object} params - { nguoiTaoID, donViChuTriID, searchTerm, page, limit }
 * @param {object} currentUser - Người dùng hiện tại (dùng để lọc theo quyền hoặc đơn vị nếu cần)
 * @returns {Promise<Array<SuKienForSelectResponse>>} Danh sách sự kiện phù hợp
 */
const getSuKiensForYeuCauPhongSelect = async (params, currentUser) => {
  const queryParams = { ...params };
  const userRoles = await authRepository.getVaiTroChucNangByNguoiDungID(
    currentUser.nguoiDungID
  );
  const isCBTC = userRoles.some(
    (role) => role.maVaiTro === MaVaiTro.CB_TO_CHUC_SU_KIEN
  );
  if (
    isCBTC &&
    !userRoles.some((role) => role.maVaiTro === MaVaiTro.ADMIN_HE_THONG)
  ) {
    if (!queryParams.nguoiTaoID)
      queryParams.nguoiTaoID = currentUser.nguoiDungID;
  }

  const { items, totalItems } =
    await suKienRepository.getSuKienForYeuCauPhongSelect(queryParams);
  const page = parseInt(params.page, 10) || 1;
  const limit = parseInt(params.limit, 10) || 20;
  const totalPages = Math.ceil(totalItems / limit);

  return items;
};

const SO_NGAY_TOI_DA_CHO_BGH_DUYET = 7;
/**
 * Gửi thông báo nhắc nhở BGH duyệt các sự kiện quá hạn.
 * @returns {Promise<void>}
 */
const sendRemindersForOverdueBGHApproval = async () => {
  logger.info('JOB: Checking for overdue BGH approval events...');
  const overdueEvents = await suKienRepository.findSuKienChoBGHQuaHan(
    SO_NGAY_TOI_DA_CHO_BGH_DUYET
  );

  if (overdueEvents.length === 0) {
    logger.info('JOB: No overdue BGH approval events found.');
    return;
  }

  const usersWithBGHRole = await authRepository.findUsersByRoleMa(
    MaVaiTro.BGH_DUYET_SK_TRUONG
  );
  if (!usersWithBGHRole || usersWithBGHRole.length === 0) {
    logger.warn(
      'JOB: No users with BGH_DUYET_SK_TRUONG role found to send reminders.'
    );
    return;
  }

  for (const event of overdueEvents) {
    for (const userBGH of usersWithBGHRole) {
      thongBaoService
        .createThongBao({
          NguoiNhanID: userBGH.NguoiDungID,
          NoiDungTB: `Nhắc nhở: Sự kiện "[${event.TenSK}]" (tạo bởi ${event.EmailNguoiTao || event.NguoiTaoID}) đã chờ duyệt quá ${SO_NGAY_TOI_DA_CHO_BGH_DUYET} ngày.`,
          DuongDanTB: `/admin/su-kien-cho-duyet/${event.SuKienID}`,
          SkLienQuanID: event.SuKienID,
          LoaiThongBao: LoaiThongBao.SU_KIEN_NHAC_NHO_DUYET_BGH,
        })
        .catch((err) =>
          logger.error(
            `JOB: Failed to send BGH reminder notification for SuKienID ${event.SuKienID} to UserID ${userBGH.NguoiDungID}:`,
            err
          )
        );
    }
  }
  logger.info(
    `JOB: Sent ${overdueEvents.length * usersWithBGHRole.length} BGH approval reminders.`
  );
};

/**
 * Tự động hủy các sự kiện đã đến hạn bắt đầu nhưng vẫn đang chờ BGH duyệt.
 * @returns {Promise<void>}
 */
const autoCancelOverdueBGHApprovalEvents = async () => {
  logger.info(
    'JOB: Checking for events to auto-cancel due to overdue BGH approval and start time passed...'
  );
  const eventsToCancel =
    await suKienRepository.findSuKienSapDienRaChoBGHDeHuy();

  if (eventsToCancel.length === 0) {
    logger.info('JOB: No events to auto-cancel (overdue BGH approval).');
    return;
  }

  const trangThaiHuyID = await suKienRepository.getTrangThaiSkIDByMa(
    MaTrangThaiSK.HUY_DO_QUA_HAN_XU_LY
  );
  if (!trangThaiHuyID) {
    logger.error(
      'JOB: Auto-cancel failed. HUY_DO_QUA_HAN_XU_LY status not found.'
    );
    return;
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const eventIDsToCancel = eventsToCancel.map((e) => e.SuKienID);
    await suKienRepository.updateTrangThaiNhieuSuKien(
      eventIDsToCancel,
      trangThaiHuyID,
      transaction
    );
    await transaction.commit();
    logger.info(
      `JOB: Auto-cancelled ${eventsToCancel.length} events due to overdue BGH approval.`
    );

    // Gửi thông báo cho người tạo
    for (const event of eventsToCancel) {
      thongBaoService
        .createThongBao({
          NguoiNhanID: event.NguoiTaoID,
          NoiDungTB: `Sự kiện "[${event.TenSK}]" của bạn đã bị tự động hủy do quá hạn Ban Giám Hiệu duyệt và đã đến thời gian dự kiến bắt đầu.`,
          DuongDanTB: `/quan-ly-su-kien/${event.SuKienID}/chi-tiet`,
          SkLienQuanID: event.SuKienID,
          LoaiThongBao: LoaiThongBao.SU_KIEN_TU_DONG_HUY_QUA_HAN,
        })
        .catch((err) =>
          logger.error(
            `JOB: Failed to send auto-cancel notification for SuKienID ${event.SuKienID}:`,
            err
          )
        );
    }
  } catch (error) {
    logger.error(
      'JOB: Error during auto-cancelling overdue BGH approval events, rolling back...',
      error
    );
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rbError) {
        logger.error('JOB: Error during rollback:', rbError);
      }
    }
  }
};

/**
 * Tự động cập nhật trạng thái các sự kiện đã kết thúc thành HOAN_THANH.
 * @returns {Promise<void>}
 */
const autoCompleteFinishedEvents = async () => {
  logger.info('JOB: Checking for finished events to mark as "HOAN_THANH"...');
  const eventIDsToComplete =
    await suKienRepository.findFinishedEventsToUpdateStatus();

  if (!eventIDsToComplete || eventIDsToComplete.length === 0) {
    logger.info('JOB: No finished events found to update.');
    return;
  }

  const trangThaiHoanThanhID = await suKienRepository.getTrangThaiSkIDByMa(
    MaTrangThaiSK.HOAN_THANH
  );
  if (!trangThaiHoanThanhID) {
    logger.error('JOB: Auto-complete failed. HOAN_THANH status ID not found.');
    return;
  }

  await suKienRepository.updateTrangThaiNhieuSuKien(
    eventIDsToComplete,
    trangThaiHoanThanhID
  );

  logger.info(
    `JOB: Successfully marked ${eventIDsToComplete.length} events as "HOAN_THANH". IDs: [${eventIDsToComplete.join(', ')}]`
  );

  // Gửi thông báo cho người tạo sự kiện biết sự kiện của họ đã hoàn thành.
  for (const suKienID of eventIDsToComplete) {
    const suKien = await suKienRepository.getSuKienDetailById(suKienID);
    if (suKien && suKien.nguoiTao && suKien.nguoiTao.nguoiDungID) {
      thongBaoService
        .createThongBao({
          NguoiNhanID: suKien.nguoiTao.nguoiDungID,
          NoiDungTB: `Sự kiện "[${suKien.tenSK}]" của bạn đã kết thúc và được đánh dấu hoàn thành.`,
          DuongDanTB: `/quan-ly-su-kien/${suKienID}/chi-tiet`,
          SkLienQuanID: suKienID,
          LoaiThongBao: LoaiThongBao.SU_KIEN_HOAN_THANH,
        })
        .catch((err) =>
          logger.error(
            `JOB: Failed to send HOAN_THANH notification for SuKienID ${suKienID}:`,
            err
          )
        );
    }
  }
};

/**
 * [MỚI] Lấy danh sách sự kiện đủ điều kiện để gửi lời mời.
 * @param {object} params - Tham số truy vấn từ controller
 * @returns {Promise<PaginatedSuKienCoTheMoiResponse>}
 */
const getSuKienCoTheMoi = async (params) => {
  const { items, totalItems } =
    await suKienRepository.getSuKienCoTheMoiList(params);

  const formattedItems = items.map((item) => ({
    suKienID: item.SuKienID,
    tenSK: item.TenSK,
    tgBatDauDK: item.TgBatDauDK.toISOString(),
    tgKetThucDK: item.TgKetThucDK.toISOString(),
    loaiSuKien: item.TenLoaiSK ? { tenLoaiSK: item.TenLoaiSK } : null,
    donViChuTri: { tenDonVi: item.TenDonViChuTri },
    soLuongDaMoi: item.SoLuongDaMoi,
    slThamDuDK: item.SlThamDuDK,
  }));

  const page = parseInt(params.page, 10) || 1;
  const limit = parseInt(params.limit, 10) || 10;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items: formattedItems,
    totalPages,
    currentPage: page,
    totalItems,
    pageSize: limit,
  };
};

/**
 * [MỚI] Gửi lời mời tham gia sự kiện cho một danh sách người dùng.
 * @param {number} suKienID - ID sự kiện
 * @param {MoiThamGiaPayloadItem[]} payload - Mảng các lời mời
 * @param {object} nguoiGui - Người dùng thực hiện hành động
 * @returns {Promise<GuiLoiMoiResponse>}
 */
const guiLoiMoiThamGia = async (suKienID, payload, nguoiGui) => {
  const suKien = await suKienRepository.getSuKienDetailById(suKienID);
  if (!suKien) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sự kiện không tồn tại.');
  }

  // Kiểm tra trạng thái sự kiện có cho phép mời không
  if (
    ![MaTrangThaiSK.DA_XAC_NHAN_PHONG].includes(suKien.trangThaiSK.maTrangThai)
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Sự kiện đang ở trạng thái "${suKien.trangThaiSK.tenTrangThai}", không thể gửi lời mời.`
    );
  }

  const results = [];
  const invitationsToCreate = [];
  const userIdsToValidate = payload.map((p) => p.nguoiDuocMoiID);

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    // Lấy danh sách những người đã được mời trước đó để tránh mời trùng
    const alreadyInvitedIds = await suKienRepository.getInvitedUserIdsForSuKien(
      suKienID,
      transaction
    );

    // Lấy thông tin những người dùng được mời để kiểm tra tồn tại
    const existingUsers = await nguoiDungRepository.getUsersByIds(
      userIdsToValidate,
      transaction
    ); // Cần thêm hàm này
    const existingUserIds = new Set(existingUsers.map((u) => u.NguoiDungID));

    for (const invite of payload) {
      if (!existingUserIds.has(invite.nguoiDuocMoiID)) {
        results.push({
          nguoiDuocMoiID: invite.nguoiDuocMoiID,
          status: 'error',
          message: 'Người dùng không tồn tại.',
        });
      } else if (alreadyInvitedIds.has(invite.nguoiDuocMoiID)) {
        results.push({
          nguoiDuocMoiID: invite.nguoiDuocMoiID,
          status: 'error',
          message: 'Người dùng đã được mời trước đó.',
        });
      } else {
        invitationsToCreate.push(invite);
      }
    }

    // Chỉ thực hiện INSERT nếu có lời mời hợp lệ
    if (invitationsToCreate.length > 0) {
      const createdRecords = await suKienRepository.addInvitationsToSuKien(
        suKienID,
        invitationsToCreate,
        transaction
      );

      // Map kết quả thành công
      const createdMap = new Map(
        createdRecords.map((rec) => [rec.NguoiDuocMoiID, rec.MoiThamGiaID])
      );
      invitationsToCreate.forEach((invite) => {
        results.push({
          nguoiDuocMoiID: invite.nguoiDuocMoiID,
          status: 'success',
          moiThamGiaID: createdMap.get(invite.nguoiDuocMoiID),
          message: null,
        });
      });

      // Gửi thông báo cho những người được mời thành công
      const successfulInvitesWithDetails = existingUsers.filter((u) =>
        createdMap.has(u.NguoiDungID)
      );
      for (const user of successfulInvitesWithDetails) {
        thongBaoService
          .createThongBao(
            {
              NguoiNhanID: user.NguoiDungID,
              NoiDungTB: `Bạn đã được mời tham gia sự kiện "[${suKien.tenSK}]".`,
              DuongDanTB: `/su-kien/${suKienID}/phan-hoi-moi`, // Ví dụ link
              SkLienQuanID: suKienID,
              LoaiThongBao: 'MOI_THAM_GIA_SU_KIEN', // Cần thêm vào enum
            },
            transaction
          )
          .catch((err) =>
            logger.error('Failed to send invitation notification', err)
          );
      }
    }

    await transaction.commit();

    const successCount = results.filter((r) => r.status === 'success').length;
    return {
      message: `Đã gửi lời mời thành công cho ${successCount}/${payload.length} người.`,
      results,
    };
  } catch (error) {
    if (transaction) await transaction.rollback();
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Gửi lời mời thất bại do lỗi hệ thống.'
    );
  }
};

/**
 * [MỚI] Lấy danh sách người đã được mời cho một sự kiện.
 * @param {number} suKienID
 * @param {object} params - Tham số truy vấn từ controller
 * @returns {Promise<PaginatedNguoiDuocMoiResponse>}
 */
const getDanhSachMoi = async (suKienID, params) => {
  // Kiểm tra sự kiện tồn tại
  const suKien = await suKienRepository.getSuKienDetailById(suKienID);
  if (!suKien) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sự kiện không tồn tại.');
  }

  const { items, totalItems } = await suKienRepository.getInvitedListForSuKien(
    suKienID,
    params
  );

  const formattedItems = items.map((item) => ({
    moiThamGiaID: Number(item.MoiThamGiaID),
    nguoiDuocMoi: {
      nguoiDungID: item.NguoiDungID,
      maDinhDanh: item.MaDinhDanh,
      hoTen: item.HoTen,
      email: item.Email,
      anhDaiDien: item.AnhDaiDien,
    },
    vaiTroDuKienSK: item.VaiTroDuKienSK,
    isChapNhanMoi: item.IsChapNhanMoi,
    tgPhanHoiMoi: item.TgPhanHoiMoi ? item.TgPhanHoiMoi.toISOString() : null,
    ghiChuMoi: item.GhiChuMoi,
  }));

  const page = parseInt(params.page, 10) || 1;
  const limit = parseInt(params.limit, 10) || 10;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items: formattedItems,
    totalPages,
    currentPage: page,
    totalItems,
    pageSize: limit,
  };
};

/**
 * [MỚI] Thu hồi/Xóa một lời mời đã gửi.
 * @param {number} moiThamGiaID - ID của lời mời
 * @param {object} currentUser - Người dùng thực hiện hành động
 * @returns {Promise<{message: string}>}
 */
const thuHoiLoiMoi = async (moiThamGiaID, currentUser) => {
  const invitation =
    await suKienRepository.getInvitationForDeletionCheck(moiThamGiaID);

  if (!invitation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lời mời không tồn tại.');
  }

  // Logic kiểm tra quyền hạn (ví dụ)
  // Cho phép Admin hoặc người tạo sự kiện gốc thu hồi.
  // Có thể mở rộng cho người trong đơn vị chủ trì, ...
  const userRoles = await authRepository.getVaiTroChucNangByNguoiDungID(
    currentUser.nguoiDungID
  );
  const isAdmin = userRoles.some(
    (role) => role.maVaiTro === MaVaiTro.ADMIN_HE_THONG
  );
  const isEventCreator =
    invitation.SuKien_NguoiTaoID === currentUser.nguoiDungID;

  if (!isAdmin && !isEventCreator) {
    // Cần thêm logic kiểm tra nếu người dùng thuộc phòng CTSV
    const isCTSV = userRoles.some(
      (role) => role.maVaiTro === MaVaiTro.CONG_TAC_SINH_VIEN
    );
    if (!isCTSV) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Bạn không có quyền thu hồi lời mời này.'
      );
    }
  }

  // Logic nghiệp vụ: Chỉ cho phép thu hồi nếu người được mời chưa phản hồi.
  if (invitation.IsChapNhanMoi !== null) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Không thể thu hồi lời mời đã được phản hồi.'
    );
  }

  const rowsAffected =
    await suKienRepository.deleteInvitationById(moiThamGiaID);
  if (rowsAffected === 0) {
    // Trường hợp hiếm, có thể do race condition
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Thu hồi lời mời thất bại.'
    );
  }

  logger.info(
    `User ${currentUser.nguoiDungID} revoked invitation ID: ${moiThamGiaID}`
  );
  return { message: 'Đã thu hồi lời mời thành công.' };
};

/**
 * [MỚI] Gửi lời mời hàng loạt dựa trên danh sách hoặc tiêu chí.
 * @param {number} suKienID
 * @param {GuiLoiMoiHangLoatPayload} payload
 * @param {object} nguoiGui
 * @returns {Promise<GuiLoiMoiResponse>}
 */
const guiLoiMoiHangLoat = async (suKienID, payload, nguoiGui) => {
  const {
    loaiDoiTuongMoi,
    tieuChiMoi,
    danhSachNguoiDungIDs,
    vaiTroDuKienSK,
    ghiChuMoiChung,
    loaiTruNguoiDungIDs,
  } = payload;
  console.log('guiLoiMoiHangLoat payload:', payload);

  const suKien = await suKienRepository.getSuKienDetailById(suKienID);
  if (!suKien) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sự kiện không tồn tại.');
  }
  if (
    ![MaTrangThaiSK.DA_XAC_NHAN_PHONG].includes(suKien.trangThaiSK.maTrangThai)
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Sự kiện không ở trạng thái cho phép mời.`
    );
  }

  let targetUserIds = [];
  if (loaiDoiTuongMoi === 'DANH_SACH_CU_THE') {
    if (!danhSachNguoiDungIDs || danhSachNguoiDungIDs.length === 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Danh sách người dùng cụ thể không được để trống.'
      );
    }
    targetUserIds = danhSachNguoiDungIDs;
  } else if (loaiDoiTuongMoi === 'THEO_TIEU_CHI') {
    if (!tieuChiMoi) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Tiêu chí mời không được để trống.'
      );
    }
    const usersFound = await nguoiDungRepository.findUsersByCriteria(
      tieuChiMoi,
      loaiTruNguoiDungIDs
    );
    targetUserIds = usersFound.map((u) => u.NguoiDungID);
    console.log('Users found by criteria:', usersFound);
  } else {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Loại đối tượng mời không hợp lệ.'
    );
  }

  if (targetUserIds.length === 0) {
    return {
      message:
        'Không tìm thấy người dùng nào phù hợp với tiêu chí để gửi lời mời.',
      results: [],
    };
  }

  // Xử lý logic mời như cũ, nhưng với danh sách targetUserIds đã được xác định
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const alreadyInvitedIds = await suKienRepository.getInvitedUserIdsForSuKien(
      suKienID,
      transaction
    );

    const invitationsToCreate = targetUserIds
      .filter((id) => !alreadyInvitedIds.has(id)) // Lọc những người chưa được mời
      .map((id) => ({
        nguoiDuocMoiID: id,
        vaiTroDuKienSK,
        ghiChuMoi: ghiChuMoiChung,
      }));

    if (invitationsToCreate.length === 0) {
      await transaction.commit(); // Vẫn commit vì không có lỗi
      return {
        message: 'Tất cả người dùng trong danh sách đã được mời trước đó.',
        results: [],
      };
    }

    if (invitationsToCreate.length > 0) {
      const createdRecords = await suKienRepository.addInvitationsToSuKien(
        suKienID,
        invitationsToCreate,
        transaction
      );

      const createdMap = new Map(
        createdRecords.map((rec) => [rec.NguoiDuocMoiID, rec.MoiThamGiaID])
      );
      const successfulInvitesWithDetails =
        await nguoiDungRepository.getUsersByIds(
          Array.from(createdMap.keys()),
          transaction
        );

      await transaction.commit();

      for (const user of successfulInvitesWithDetails) {
        thongBaoService
          .createThongBao({
            NguoiNhanID: user.NguoiDungID,
            NoiDungTB: `Bạn đã được mời tham gia sự kiện "[${suKien.tenSK}]".`,
            DuongDanTB: `/my-invitations`,
            SkLienQuanID: suKienID,
            LoaiThongBao: 'MOI_THAM_GIA_SU_KIEN',
          })
          .catch((err) =>
            logger.error(
              `Failed to send in-app notification to ${user.Email}`,
              err
            )
          );

        // 2. Gửi email mời
        const loiMoiInfo = invitationsToCreate.find(
          (inv) => inv.nguoiDuocMoiID === user.NguoiDungID
        );
        emailService
          .sendEventInvitationEmail(
            user.Email,
            { hoTen: user.HoTen },
            {
              tenSK: suKien.tenSK,
              donViChuTri: suKien.donViChuTri,

              thoiGianBatDau: format(
                new Date(suKien.tgBatDauDK),
                'HH:mm dd/MM/yyyy'
              ),
              thoiGianKetThuc: format(
                new Date(suKien.tgKetThucDK),
                'HH:mm dd/MM/yyyy'
              ),
              diaDiem: suKien.diaDiemToChucDaXep || 'Chưa xác định',
            },
            loiMoiInfo || {}
          )
          .catch((err) =>
            logger.error(
              `Failed to send invitation email to ${user.Email}`,
              err
            )
          );
      }
      return {
        message: `Đã gửi lời mời thành công cho ${createdRecords.length} người.`,
        soLuongMoiThanhCong: createdRecords.length,
        soLuongMoiLoi: targetUserIds.length - createdRecords.length,
        chiTietLoi: targetUserIds
          .filter(
            (id) => !invitationsToCreate.some((i) => i.nguoiDuocMoiID === id)
          )
          .map((id) => ({ nguoiDungID: id, lyDo: 'Đã được mời trước đó.' })),
      };
    }
    await transaction.commit(); // Commit nếu không có gì để tạo
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Gửi lời mời hàng loạt thất bại: ${error.message}`
    );
  }
};

/**
 * [MỚI] Lấy danh sách lời mời của người dùng hiện tại.
 * @param {number} nguoiDungID
 * @param {object} params - Tham số truy vấn
 * @returns {Promise<PaginatedLoiMoiSuKienResponse>}
 */
const getMyInvitations = async (nguoiDungID, params) => {
  const { items, totalItems } = await suKienRepository.getMyInvitations(
    nguoiDungID,
    params
  );

  const formattedItems = items.map((item) => ({
    moiThamGiaID: Number(item.MoiThamGiaID),
    suKien: {
      suKienID: item.SuKienID,
      tenSK: item.TenSK,
      tgBatDauDK: item.TgBatDauDK.toISOString(),
      tgKetThucDK: item.TgKetThucDK.toISOString(),
      diaDiemDaXep: item.DiaDiemDaXep,
      loaiSuKien: item.TenLoaiSK ? { tenLoaiSK: item.TenLoaiSK } : null,
      donViChuTri: { tenDonVi: item.TenDonViChuTri },
    },
    vaiTroDuKienSK: item.VaiTroDuKienSK,
    ghiChuMoi: item.GhiChuMoi,
    isChapNhanMoi: item.IsChapNhanMoi,
    tgMoi: null, // CSDL không có trường này, sẽ cần thêm nếu FE yêu cầu
    tgPhanHoiMoi: item.TgPhanHoiMoi ? item.TgPhanHoiMoi.toISOString() : null,
    nguoiGuiMoi: item.HoTenNguoiGuiMoi
      ? {
          hoTen: item.HoTenNguoiGuiMoi,
          donViCongTac: 'Phòng Công tác Sinh viên', // Tạm hardcode, có thể lấy động sau
        }
      : null,
  }));

  const page = parseInt(params.page, 10) || 1;
  const limit = parseInt(params.limit, 10) || 10;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items: formattedItems,
    totalPages,
    currentPage: page,
    totalItems,
    pageSize: limit,
  };
};

/**
 * [MỚI] Người dùng phản hồi một lời mời tham gia sự kiện.
 * @param {number} moiThamGiaID
 * @param {PhanHoiLoiMoiPayload} payload - { chapNhan, lyDoTuChoi }
 * @param {object} currentUser - Người dùng đang thực hiện phản hồi
 * @returns {Promise<PhanHoiLoiMoiResponse>}
 */
const phanHoiLoiMoi = async (moiThamGiaID, payload, currentUser) => {
  const { chapNhan, lyDoTuChoi } = payload;

  // 1. Lấy thông tin lời mời để kiểm tra
  const invitation =
    await suKienRepository.getInvitationForDeletionCheck(moiThamGiaID); // Dùng lại hàm check xóa vì nó có đủ thông tin cần
  if (!invitation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lời mời không tồn tại.');
  }

  // 2. Kiểm tra quyền: Người dùng phải là người được mời
  const moiMoi = await suKienRepository.getMoiMoi(moiThamGiaID);
  if (moiMoi.NguoiDuocMoiID !== currentUser.nguoiDungID) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Bạn không có quyền phản hồi lời mời này.'
    );
  }

  // 3. Kiểm tra trạng thái: Lời mời phải chưa được phản hồi
  if (invitation.IsChapNhanMoi !== null) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Bạn đã phản hồi lời mời này trước đó.'
    );
  }

  // 4. Kiểm tra logic nghiệp vụ: Sự kiện có còn cho phép phản hồi không (chưa kết thúc)
  const suKien = await suKienRepository.getSuKienDetailById(
    invitation.SuKienID
  );
  if (!suKien || new Date(suKien.tgKetThucDK) < new Date()) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Không thể phản hồi vì sự kiện đã kết thúc.'
    );
  }

  // 5. Cập nhật CSDL
  const updatedInvitation = await suKienRepository.updateInvitationResponse(
    moiThamGiaID,
    chapNhan,
    chapNhan ? null : lyDoTuChoi
  );
  if (!updatedInvitation) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Ghi nhận phản hồi thất bại.'
    );
  }

  // (Tùy chọn) Gửi thông báo cho người mời (CTSV)
  // ...

  logger.info(
    `User ${currentUser.nguoiDungID} responded to invitation ID ${moiThamGiaID} with: ${chapNhan}`
  );

  return {
    message: 'Phản hồi của bạn đã được ghi nhận.',
    loiMoiCapNhat: {
      moiThamGiaID: Number(updatedInvitation.MoiThamGiaID),
      isChapNhanMoi: updatedInvitation.IsChapNhanMoi,
      tgPhanHoiMoi: updatedInvitation.TgPhanHoiMoi.toISOString(),
    },
  };
};

/**
 * [MỚI] Lấy danh sách sự kiện đã tham gia của người dùng.
 */
const getMyAttendedEvents = async (nguoiDungID, params) => {
  const { items, totalItems } = await suKienRepository.getMyAttendedEvents(
    nguoiDungID,
    params
  );

  const formattedItems = items.map((item) => {
    const isEventFinished =
      item.MaTrangThaiSK === MaTrangThaiSK.HOAN_THANH ||
      new Date(item.tgKetThuc) < new Date();
    const hasRated = !!item.DanhGiaSkID;

    return {
      suKienID: item.SuKienID,
      tenSK: item.TenSK,
      tgBatDau: item.tgBatDau.toISOString(),
      tgKetThuc: item.tgKetThuc.toISOString(),
      diaDiemDaXep: item.DiaDiemDaXep,
      loaiSuKien: item.TenLoaiSK ? { tenLoaiSK: item.TenLoaiSK } : null,
      donViChuTri: { tenDonVi: item.TenDonViChuTri },
      trangThaiSuKien: {
        maTrangThai: item.MaTrangThaiSK,
        tenTrangThai: item.TenTrangThaiSK,
      },
      isDaChapNhanMoi: item.IsChapNhanMoi,
      danhGiaCuaToi: hasRated
        ? {
            danhGiaSkID: Number(item.DanhGiaSkID),
            diemNoiDung: item.DiemNoiDung,
            diemToChuc: item.DiemToChuc,
            diemDiaDiem: item.DiemDiaDiem,
            yKienDongGop: item.YKienDongGop,
            tgDanhGia: item.TgDanhGia.toISOString(),
          }
        : null,
      coTheDanhGia: isEventFinished && !hasRated,
    };
  });

  const page = parseInt(params.page, 10) || 1;
  const limit = parseInt(params.limit, 10) || 10;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items: formattedItems,
    totalPages,
    currentPage: page,
    totalItems,
    pageSize: limit,
  };
};

export const suKienService = {
  getSuKienList,
  getSuKienDetail,
  updateSuKienTrangThai,
  getPublicSuKienList,
  getPublicSuKienDetail,
  createSuKienService,
  updateSuKienService,
  duyetSuKienByBGH,
  tuChoiSuKienByBGH,
  getSuKiensForYeuCauPhongSelect,
  sendRemindersForOverdueBGHApproval,
  autoCancelOverdueBGHApprovalEvents,
  autoCompleteFinishedEvents,
  getSuKienCoTheMoi,
  guiLoiMoiThamGia,
  guiLoiMoiHangLoat,
  getDanhSachMoi,
  thuHoiLoiMoi,
  getMyInvitations,
  phanHoiLoiMoi,
  getMyAttendedEvents,
};
