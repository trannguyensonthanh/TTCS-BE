// src/modules/yeuCauDoiPhong/yeuCauDoiPhong.service.js
import { yeuCauDoiPhongRepository } from './yeuCauDoiPhong.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import { authRepository } from '../auth/auth.repository.js';
import { loaiPhongRepository } from '../danhMuc/loaiPhong.repository.js';
import LoaiThongBao from '../../enums/loaiThongBao.enum.js';
import { suKienRepository } from '../suKien/suKien.repository.js';
import MaTrangThaiYeuCauDoiPhong from '../../enums/maTrangThaiYeuCauDoiPhong.enum.js';
import logger from '../../utils/logger.util.js';
import { getPool } from '../../utils/database.js';
import sql from 'mssql';
import { yeuCauMuonPhongRepository } from '../yeuCauMuonPhong/yeuCauMuonPhong.repository.js';
import { thongBaoService } from '../thongBao/thongBao.service.js';

/**
 * Lấy danh sách yêu cầu đổi phòng có phân trang
 * @param {object} params - Tham số truy vấn (page, limit, filter...)
 * @param {object} currentUser - Thông tin người dùng hiện tại
 * @returns {Promise<{items: Array, totalPages: number, currentPage: number, totalItems: number, pageSize: number}>}
 * @throws {ApiError} Nếu có lỗi truy vấn dữ liệu
 */
const getYeuCauDoiPhongs = async (params, currentUser) => {
  let modifiedParams = { ...params };
  const { items, totalItems } =
    await yeuCauDoiPhongRepository.getYeuCauDoiPhongListWithPagination(
      modifiedParams,
      currentUser
    );
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
 * Lấy chi tiết một yêu cầu đổi phòng theo ID
 * @param {number} ycDoiPhongID - ID yêu cầu đổi phòng
 * @param {object} currentUser - Thông tin người dùng hiện tại
 * @returns {Promise<object>} Thông tin chi tiết yêu cầu đổi phòng
 * @throws {ApiError} Nếu không tìm thấy hoặc không có quyền truy cập
 */
const getYeuCauDoiPhongDetail = async (ycDoiPhongID, currentUser) => {
  const yeuCau =
    await yeuCauDoiPhongRepository.getYeuCauDoiPhongDetailById(ycDoiPhongID);
  if (!yeuCau) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Yêu cầu đổi phòng không tồn tại.'
    );
  }
  return yeuCau;
};

/**
 * Tạo mới yêu cầu đổi phòng
 * @param {object} payload - Dữ liệu tạo yêu cầu đổi phòng
 * @param {object} nguoiYeuCau - Thông tin người dùng thực hiện
 * @returns {Promise<object>} Thông tin chi tiết yêu cầu đổi phòng vừa tạo
 * @throws {ApiError} Nếu dữ liệu đầu vào không hợp lệ hoặc lỗi nghiệp vụ
 */
const createYeuCauDoiPhong = async (payload, nguoiYeuCau) => {
  const { ycMuonPhongCtID, datPhongID_Cu, lyDoDoiPhong, ycPhongMoi_LoaiID } =
    payload;
  const preRequisites =
    await yeuCauDoiPhongRepository.validateYcĐoiPhongPreRequisites(
      ycMuonPhongCtID,
      datPhongID_Cu,
      nguoiYeuCau.nguoiDungID
    );
  if (!preRequisites || !preRequisites.datPhongID_Cu_Valid) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Thông tin chi tiết yêu cầu phòng gốc hoặc phòng hiện tại không hợp lệ.'
    );
  }
  if (
    preRequisites.yeuCauPhongNguoiTaoID !== nguoiYeuCau.nguoiDungID &&
    preRequisites.suKienNguoiTaoID !== nguoiYeuCau.nguoiDungID
  ) {
    console.warn(
      `User ${nguoiYeuCau.nguoiDungID} is creating change request for YC created by ${preRequisites.yeuCauPhongNguoiTaoID} / SK created by ${preRequisites.suKienNguoiTaoID}`
    );
  }
  if (ycPhongMoi_LoaiID) {
    const loaiPhong =
      await loaiPhongRepository.getLoaiPhongById(ycPhongMoi_LoaiID);
    if (!loaiPhong) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Loại phòng mới yêu cầu (ID: ${ycPhongMoi_LoaiID}) không hợp lệ.`
      );
    }
  }
  const trangThaiChoDuyetID = await suKienRepository.getTrangThaiIDByMaGeneric(
    MaTrangThaiYeuCauDoiPhong.CHO_DUYET_DOI_PHONG,
    'TrangThaiYeuCauDoiPhong',
    'TrangThaiYcDoiPID',
    'MaTrangThai'
  );
  if (!trangThaiChoDuyetID) {
    logger.error(
      'Lỗi cấu hình: Không tìm thấy mã trạng thái CHO_DUYET_DOI_PHONG.'
    );
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Lỗi hệ thống khi xử lý trạng thái yêu cầu đổi phòng.'
    );
  }
  const newYcDoiPhongID =
    await yeuCauDoiPhongRepository.createYeuCauDoiPhongRecord({
      ...payload,
      nguoiYeuCauID: nguoiYeuCau.nguoiDungID,
      trangThaiYcDoiPID: trangThaiChoDuyetID,
    });
  logger.info(`New YeuCauDoiPhong created with ID: ${newYcDoiPhongID}`);
  const usersCSVC = await authRepository.findUsersByRoleMa(
    MaVaiTro.QUAN_LY_CSVC
  );
  const suKienInfo = await suKienRepository.getSuKienDetailById(
    preRequisites.SuKienID
  );
  if (usersCSVC && usersCSVC.length > 0) {
    usersCSVC.forEach((userCSVC) => {
      thongBaoService
        .createThongBao({
          NguoiNhanID: userCSVC.NguoiDungID,
          NoiDungTB: `Có yêu cầu đổi phòng mới cho sự kiện "[${suKienInfo?.tenSK || `SK_ID: ${preRequisites.SuKienID}`}] (YC Đổi ID: ${newYcDoiPhongID}) đang chờ xử lý.`,
          DuongDanTB: `/admin/yeu-cau-doi-phong/${newYcDoiPhongID}`,
          YcLienQuanID: newYcDoiPhongID,
          LoaiYcLienQuan: 'YEUCAUDOIPHONG',
          LoaiThongBao: LoaiThongBao.YC_DOI_PHONG_MOI_CHO_CSVC,
        })
        .catch((err) =>
          logger.error('Failed to send YC_DOI_PHONG_MOI notification:', err)
        );
    });
  }
  return yeuCauDoiPhongRepository.getYeuCauDoiPhongDetailById(newYcDoiPhongID);
};

/**
 * CSVC xử lý yêu cầu đổi phòng (duyệt hoặc từ chối)
 * @param {number} ycDoiPhongID - ID yêu cầu đổi phòng
 * @param {object} payload - Dữ liệu xử lý (hành động, phòng mới, ghi chú, lý do từ chối)
 * @param {object} nguoiXuLy - Thông tin người dùng CSVC xử lý
 * @returns {Promise<object>} Thông tin chi tiết yêu cầu đổi phòng sau xử lý
 * @throws {ApiError} Nếu trạng thái không hợp lệ, phòng không tồn tại, hoặc lỗi nghiệp vụ
 */
const xuLyYeuCauDoiPhong = async (ycDoiPhongID, payload, nguoiXuLy) => {
  const { hanhDong, phongMoiID, ghiChuCSVC, lyDoTuChoiDoiCSVC } = payload;
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    logger.debug(
      `Transaction started for processing YcDoiPhongID: ${ycDoiPhongID}`
    );
    const yeuCauDoi =
      await yeuCauDoiPhongRepository.getYeuCauDoiPhongForProcessing(
        ycDoiPhongID,
        transaction
      );
    if (!yeuCauDoi) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Yêu cầu đổi phòng không tồn tại.'
      );
    }
    if (
      yeuCauDoi.MaTrangThaiHienTai !==
      MaTrangThaiYeuCauDoiPhong.CHO_DUYET_DOI_PHONG
    ) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Yêu cầu đổi phòng không ở trạng thái "Chờ duyệt". Trạng thái hiện tại: ${yeuCauDoi.MaTrangThaiHienTai}`
      );
    }
    let trangThaiMoiID;
    let datPhongIDMoi = null;
    if (hanhDong === 'DUYET') {
      if (!phongMoiID) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Cần cung cấp ID phòng mới khi duyệt.'
        );
      }
      const phongMoiExists = await yeuCauMuonPhongRepository.checkPhongExists(
        phongMoiID,
        transaction
      );
      if (!phongMoiExists) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Phòng mới (ID: ${phongMoiID}) không tồn tại.`
        );
      }
      const isAvailable =
        await yeuCauMuonPhongRepository.checkPhongAvailability(
          phongMoiID,
          new Date(yeuCauDoi.TgMuonDkGoc),
          new Date(yeuCauDoi.TgTraDkGoc),
          transaction,
          yeuCauDoi.DatPhongID_Cu
        );
      if (!isAvailable) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Phòng mới (ID: ${phongMoiID}) không sẵn sàng trong khoảng thời gian yêu cầu.`
        );
      }
      datPhongIDMoi = await yeuCauMuonPhongRepository.createChiTietDatPhong(
        yeuCauDoi.YcMuonPhongCtID,
        phongMoiID,
        new Date(yeuCauDoi.TgMuonDkGoc),
        new Date(yeuCauDoi.TgTraDkGoc),
        transaction
      );
      logger.debug(
        `New ChiTietDatPhong created with ID: ${datPhongIDMoi} for YcMuonPhongCtID: ${yeuCauDoi.YcMuonPhongCtID}`
      );
      trangThaiMoiID = await suKienRepository.getTrangThaiIDByMaGeneric(
        MaTrangThaiYeuCauDoiPhong.DA_DUYET_DOI_PHONG,
        'TrangThaiYeuCauDoiPhong',
        'TrangThaiYcDoiPID',
        'MaTrangThai',
        transaction
      );
    } else if (hanhDong === 'TU_CHOI') {
      if (!lyDoTuChoiDoiCSVC) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Cần cung cấp lý do khi từ chối yêu cầu đổi phòng.'
        );
      }
      trangThaiMoiID = await suKienRepository.getTrangThaiIDByMaGeneric(
        MaTrangThaiYeuCauDoiPhong.TU_CHOI_DOI_PHONG,
        'TrangThaiYeuCauDoiPhong',
        'TrangThaiYcDoiPID',
        'MaTrangThai',
        transaction
      );
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Hành động không hợp lệ.');
    }
    if (!trangThaiMoiID)
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi cấu hình trạng thái yêu cầu đổi phòng.'
      );
    await yeuCauDoiPhongRepository.updateYeuCauDoiPhongAfterProcessing(
      ycDoiPhongID,
      trangThaiMoiID,
      datPhongIDMoi,
      nguoiXuLy.nguoiDungID,
      lyDoTuChoiDoiCSVC,
      ghiChuCSVC,
      transaction
    );
    logger.debug(`YeuCauDoiPhongID: ${ycDoiPhongID} status updated.`);
    await transaction.commit();
    logger.info(
      `Transaction committed for processing YcDoiPhongID: ${ycDoiPhongID}`
    );
    const nguoiTaoYeuCauDoiPhongID = yeuCauDoi.NguoiYeuCauID;
    const suKienInfo = await suKienRepository.getSuKienDetailById(
      yeuCauDoi.SuKienID
    );
    let noiDungTB = `Yêu cầu đổi phòng (ID: ${ycDoiPhongID}) cho sự kiện "[${suKienInfo?.tenSK || `SK_ID: ${yeuCauDoi.SuKienID}`}] `;
    noiDungTB +=
      hanhDong === 'DUYET'
        ? `đã được duyệt.`
        : `đã bị từ chối. ${lyDoTuChoiDoiCSVC ? `Lý do: ${lyDoTuChoiDoiCSVC}` : ''}`;
    thongBaoService
      .createThongBao({
        NguoiNhanID: nguoiTaoYeuCauDoiPhongID,
        NoiDungTB: noiDungTB,
        DuongDanTB: `/yeu-cau-doi-phong/${ycDoiPhongID}/chi-tiet`,
        YcLienQuanID: ycDoiPhongID,
        LoaiYcLienQuan: 'YEUCAUDOIPHONG',
        LoaiThongBao:
          hanhDong === 'DUYET'
            ? LoaiThongBao.YC_DOI_PHONG_DA_DUYET
            : LoaiThongBao.YC_DOI_PHONG_BI_TU_CHOI,
      })
      .catch((err) =>
        logger.error('Failed to send YC_DOI_PHONG_XU_LY notification:', err)
      );
    return yeuCauDoiPhongRepository.getYeuCauDoiPhongDetailById(ycDoiPhongID);
  } catch (error) {
    logger.error(
      `Error during processing YcDoiPhongID: ${ycDoiPhongID}, rolling back...`,
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
      'Xử lý yêu cầu đổi phòng thất bại.'
    );
  }
};

/**
 * Người dùng hủy yêu cầu đổi phòng của họ (nếu chưa được CSVC xử lý)
 * @param {number} ycDoiPhongID - ID yêu cầu đổi phòng
 * @param {object} nguoiHuy - Thông tin người dùng thực hiện (từ req.user)
 * @returns {Promise<{ message: string }>} Thông báo kết quả hủy
 * @throws {ApiError} Nếu không có quyền hoặc trạng thái không hợp lệ
 */
const huyYeuCauDoiPhongByUser = async (ycDoiPhongID, nguoiHuy) => {
  const yeuCauDoi =
    await yeuCauDoiPhongRepository.getYeuCauDoiPhongForUserCancel(ycDoiPhongID);
  if (!yeuCauDoi) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Yêu cầu đổi phòng không tồn tại.'
    );
  }
  if (yeuCauDoi.NguoiYeuCauID !== nguoiHuy.nguoiDungID) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Bạn không phải là người tạo yêu cầu này để thực hiện hủy.'
    );
  }
  if (
    yeuCauDoi.MaTrangThaiHienTai !==
    MaTrangThaiYeuCauDoiPhong.CHO_DUYET_DOI_PHONG
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Không thể hủy yêu cầu đổi phòng khi đang ở trạng thái "${yeuCauDoi.MaTrangThaiHienTai}". Chỉ có thể hủy khi "Chờ duyệt".`
    );
  }
  const trangThaiDaHuyID = await suKienRepository.getTrangThaiIDByMaGeneric(
    MaTrangThaiYeuCauDoiPhong.DA_HUY_YEU_CAU_DOI,
    'TrangThaiYeuCauDoiPhong',
    'TrangThaiYcDoiPID',
    'MaTrangThai'
  );
  if (!trangThaiDaHuyID) {
    logger.error(
      'Lỗi cấu hình: Không tìm thấy mã trạng thái DA_HUY_YEU_CAU_DOI.'
    );
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Lỗi hệ thống khi xử lý trạng thái hủy yêu cầu đổi phòng.'
    );
  }
  await yeuCauDoiPhongRepository.updateUserCancelYeuCauDoiPhong(
    ycDoiPhongID,
    trangThaiDaHuyID
  );
  logger.info(
    `YeuCauDoiPhongID: ${ycDoiPhongID} cancelled by user ${nguoiHuy.nguoiDungID}.`
  );
  return { message: 'Yêu cầu đổi phòng đã được hủy thành công.' };
};

export const yeuCauDoiPhongService = {
  getYeuCauDoiPhongs,
  getYeuCauDoiPhongDetail,
  createYeuCauDoiPhong,
  xuLyYeuCauDoiPhong,
  huyYeuCauDoiPhongByUser,
};
