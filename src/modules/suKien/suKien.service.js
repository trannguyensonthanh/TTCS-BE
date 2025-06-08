// src/modules/suKien/suKien.service.js
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
import sql from 'mssql';
/**
 * Lấy danh sách sự kiện với phân trang và bộ lọc
 * @param {object} params - GetSuKienParams
 * @returns {Promise<PaginatedSuKienResponse>}
 */
const getSuKienList = async (params) => {
  const { items, totalItems } =
    await suKienRepository.getSuKienListWithPagination(params);

  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 10;
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

  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 9;
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
    nguoiTaoID: nguoiTaoID,
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
      const trangThaiChoDuyetBGH_ID =
        await suKienRepository.getTrangThaiSkIDByMa(
          MaTrangThaiSK.CHO_DUYET_BGH,
          transaction
        );
      if (!trangThaiChoDuyetBGH_ID)
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Lỗi cấu hình trạng thái.'
        );

      await suKienRepository.updateSuKienTrangThai(
        suKienID,
        trangThaiChoDuyetBGH_ID,
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
  let queryParams = { ...params };
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
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 20;
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
};
