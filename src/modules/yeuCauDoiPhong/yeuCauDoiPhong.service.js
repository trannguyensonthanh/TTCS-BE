// src/modules/yeuCauDoiPhong/yeuCauDoiPhong.service.js
import { yeuCauDoiPhongRepository } from './yeuCauDoiPhong.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import { authRepository } from '../auth/auth.repository.js'; // Để lấy vai trò

const getYeuCauDoiPhongs = async (params, currentUser) => {
  let modifiedParams = { ...params };
  // const userRoles = await authRepository.getVaiTroChucNangByNguoiDungID(currentUser.nguoiDungID);
  // const isCSVC = userRoles.some(role => role.maVaiTro === MaVaiTro.QUAN_LY_CSVC);
  // const isAdmin = userRoles.some(role => role.maVaiTro === MaVaiTro.ADMIN_HE_THONG);

  // if (!isAdmin && !isCSVC) {
  //   modifiedParams.nguoiYeuCauID = currentUser.nguoiDungID;
  // }
  // Phân quyền chi tiết hơn có thể cần dựa trên đơn vị của người dùng nếu họ là Trưởng Khoa/CLB,...

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

const getYeuCauDoiPhongDetail = async (ycDoiPhongID, currentUser) => {
  const yeuCau =
    await yeuCauDoiPhongRepository.getYeuCauDoiPhongDetailById(ycDoiPhongID);
  if (!yeuCau) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Yêu cầu đổi phòng không tồn tại.'
    );
  }
  // Logic phân quyền xem chi tiết
  // if (!isAdmin && !isCSVC && yeuCau.nguoiYeuCau.nguoiDungID !== currentUser.nguoiDungID) {
  //   throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền xem chi tiết yêu cầu này.');
  // }
  return yeuCau;
};

/**
 * Tạo mới yêu cầu đổi phòng
 * @param {object} payload - CreateYeuCauDoiPhongPayload
 * @param {object} nguoiYeuCau - Thông tin người dùng thực hiện
 * @returns {Promise<YeuCauDoiPhongDetailResponse>}
 */
const createYeuCauDoiPhong = async (payload, nguoiYeuCau) => {
  const { ycMuonPhongCtID, datPhongID_Cu, lyDoDoiPhong, ycPhongMoi_LoaiID } =
    payload;

  // 1. Kiểm tra điều kiện tiên quyết
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

  // Kiểm tra quyền: người yêu cầu đổi phòng phải là người tạo yêu cầu phòng gốc hoặc người tạo sự kiện gốc
  // (Logic này có thể cần điều chỉnh tùy theo quy định của bạn)
  if (
    preRequisites.yeuCauPhongNguoiTaoID !== nguoiYeuCau.nguoiDungID &&
    preRequisites.suKienNguoiTaoID !== nguoiYeuCau.nguoiDungID
  ) {
    // Hoặc kiểm tra xem người dùng có vai trò CB_TO_CHUC_SU_KIEN cho DonViChuTri của sự kiện không
    // const suKienDetail = await suKienRepository.getSuKienDetailById(preRequisites.suKienID);
    // const userRoles = await authRepository.getVaiTroChucNangByNguoiDungID(nguoiYeuCau.nguoiDungID);
    // const isCBTCForEventUnit = userRoles.some(
    //    role => role.maVaiTro === MaVaiTro.CB_TO_CHUC_SU_KIEN && role.donViThucThi?.donViID === suKienDetail?.donViChuTri.donViID
    // );
    // if(!isCBTCForEventUnit) {
    //      throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền tạo yêu cầu đổi phòng cho yêu cầu này.');
    // }
    console.warn(
      `User ${nguoiYeuCau.nguoiDungID} is creating change request for YC created by ${preRequisites.yeuCauPhongNguoiTaoID} / SK created by ${preRequisites.suKienNguoiTaoID}`
    );
  }

  // TODO: Thêm các kiểm tra nghiệp vụ khác nếu cần:
  // - Kiểm tra thời gian còn lại trước sự kiện có cho phép đổi không (ví dụ: trước 1 tuần)
  // - Kiểm tra số lần đã yêu cầu đổi phòng cho YcMuonPhongCtID này (nếu có giới hạn)

  // 2. Validate LoaiPhongYcID (nếu có)
  if (ycPhongMoi_LoaiID) {
    const loaiPhong =
      await loaiPhongRepository.getLoaiPhongById(ycPhongMoi_LoaiID);
    if (!loaiPhong /*|| !loaiPhong.IsActive */) {
      // Giả sử LoaiPhong có IsActive
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Loại phòng mới yêu cầu (ID: ${ycPhongMoi_LoaiID}) không hợp lệ.`
      );
    }
  }

  // 3. Lấy ID trạng thái ban đầu cho yêu cầu đổi phòng
  const trangThaiChoDuyetID = await suKienRepository.getTrangThaiSkIDByMa(
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

  // 4. Tạo bản ghi YeuCauDoiPhong
  const newYcDoiPhongID =
    await yeuCauDoiPhongRepository.createYeuCauDoiPhongRecord({
      ...payload,
      nguoiYeuCauID: nguoiYeuCau.nguoiDungID,
      trangThaiYcDoiPID: trangThaiChoDuyetID,
    });
  logger.info(`New YeuCauDoiPhong created with ID: ${newYcDoiPhongID}`);

  // 5. TODO: Cập nhật trạng thái của SuKien hoặc YeuCauMuonPhong (Header) nếu cần
  // Ví dụ: SuKien.TrangThaiSkID -> 'DANG_CHO_DUYET_DOI_PHONG' (cần thêm mã trạng thái này)
  // Hoặc YeuCauMuonPhong.TrangThaiChungID -> một trạng thái tương ứng.
  // Hiện tại, chúng ta chưa thay đổi trạng thái của sự kiện/yêu cầu phòng gốc khi có yêu cầu đổi.

  // 6. Gửi thông báo cho QUAN_LY_CSVC
  const usersCSVC = await authRepository.findUsersByRoleMa(
    MaVaiTro.QUAN_LY_CSVC
  );
  const suKienInfo = await suKienRepository.getSuKienDetailById(
    preRequisites.SuKienID
  ); // Lấy tên sự kiện
  if (usersCSVC && usersCSVC.length > 0) {
    usersCSVC.forEach((userCSVC) => {
      thongBaoService
        .createThongBao({
          NguoiNhanID: userCSVC.NguoiDungID,
          NoiDungTB: `Có yêu cầu đổi phòng mới cho sự kiện "[${suKienInfo?.tenSK || `SK_ID: ${preRequisites.SuKienID}`}]" (YC Đổi ID: ${newYcDoiPhongID}) đang chờ xử lý.`,
          DuongDanTB: `/admin/yeu-cau-doi-phong/${newYcDoiPhongID}`,
          YcLienQuanID: newYcDoiPhongID, // ID của YeuCauDoiPhong
          LoaiYcLienQuan: 'YEUCAUDOIPHONG',
          // LoaiThongBao: LoaiThongBao.YC_DOI_PHONG_MOI_CHO_CSVC, // Cần thêm loại thông báo này
        })
        .catch((err) =>
          logger.error('Failed to send YC_DOI_PHONG_MOI notification:', err)
        );
    });
  }

  // 7. Trả về chi tiết yêu cầu đổi phòng vừa tạo
  return yeuCauDoiPhongRepository.getYeuCauDoiPhongDetailById(newYcDoiPhongID);
};

/**
 * CSVC xử lý yêu cầu đổi phòng
 * @param {number} ycDoiPhongID
 * @param {object} payload - XuLyYeuCauDoiPhongPayload
 * @param {object} nguoiXuLy - Thông tin người dùng CSVC
 * @returns {Promise<YeuCauDoiPhongDetailResponse>}
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
      // Kiểm tra phòng mới có tồn tại không
      const phongMoiExists = await yeuCauMuonPhongRepository.checkPhongExists(
        phongMoiID,
        transaction
      ); // Dùng lại hàm
      if (!phongMoiExists) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Phòng mới (ID: ${phongMoiID}) không tồn tại.`
        );
      }
      // Kiểm tra phòng mới có sẵn không (trong khoảng thời gian của yêu cầu gốc)
      const isAvailable =
        await yeuCauMuonPhongRepository.checkPhongAvailability(
          phongMoiID,
          new Date(yeuCauDoi.TgMuonDkGoc),
          new Date(yeuCauDoi.TgTraDkGoc),
          transaction,
          yeuCauDoi.DatPhongID_Cu // Bỏ qua phòng cũ khi kiểm tra
        );
      if (!isAvailable) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Phòng mới (ID: ${phongMoiID}) không sẵn sàng trong khoảng thời gian yêu cầu.`
        );
      }

      // Tạo bản ghi ChiTietDatPhong mới cho phòng mới này và YcMuonPhongCtID gốc
      // QUAN TRỌNG: YcMuonPhongCtID gốc vẫn là "chủ sở hữu" của việc đặt phòng,
      // YeuCauDoiPhong chỉ là một "request" để thay đổi việc đặt phòng đó.
      // Chúng ta sẽ tạo một bản ghi ChiTietDatPhong mới và cập nhật DatPhongID_Moi trong YeuCauDoiPhong.
      // Bản ghi ChiTietDatPhong cũ (DatPhongID_Cu) sẽ không còn được coi là phòng hiện tại của YcMuonPhongCtID đó nữa.
      datPhongIDMoi = await yeuCauMuonPhongRepository.createChiTietDatPhong(
        yeuCauDoi.YcMuonPhongCtID, // Chi tiết yêu cầu phòng gốc
        phongMoiID,
        new Date(yeuCauDoi.TgMuonDkGoc),
        new Date(yeuCauDoi.TgTraDkGoc),
        transaction
      );
      logger.debug(
        `New ChiTietDatPhong created with ID: ${datPhongIDMoi} for YcMuonPhongCtID: ${yeuCauDoi.YcMuonPhongCtID}`
      );

      // "Giải phóng" phòng cũ (DatPhongID_Cu) - Hiện tại chỉ log, không tác động trực tiếp
      await yeuCauDoiPhongRepository.markChiTietDatPhongCuAsChanged(
        yeuCauDoi.DatPhongID_Cu,
        transaction
      );

      trangThaiMoiID = await suKienRepository.getTrangThaiSkIDByMa(
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
      trangThaiMoiID = await suKienRepository.getTrangThaiSkIDByMa(
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

    // Cập nhật YeuCauDoiPhong
    await yeuCauDoiPhongRepository.updateYeuCauDoiPhongAfterProcessing(
      ycDoiPhongID,
      trangThaiMoiID,
      datPhongIDMoi, // Sẽ là NULL nếu từ chối
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

    // Gửi thông báo cho người tạo yêu cầu đổi phòng
    const nguoiTaoYeuCauDoiPhongID = yeuCauDoi.NguoiYeuCauID; // Người tạo YCDP
    const suKienInfo = await suKienRepository.getSuKienDetailById(
      yeuCauDoi.SuKienID
    ); // Lấy tên sự kiện

    let noiDungTB = `Yêu cầu đổi phòng (ID: ${ycDoiPhongID}) cho sự kiện "[${suKienInfo?.tenSK || `SK_ID: ${yeuCauDoi.SuKienID}`}]" `;
    noiDungTB +=
      hanhDong === 'DUYET'
        ? `đã được duyệt.`
        : `đã bị từ chối. ${lyDoTuChoiDoiCSVC ? `Lý do: ${lyDoTuChoiDoiCSVC}` : ''}`;

    thongBaoService
      .createThongBao({
        NguoiNhanID: nguoiTaoYeuCauDoiPhongID,
        NoiDungTB: noiDungTB,
        DuongDanLienQuan: `/yeu-cau-doi-phong/${ycDoiPhongID}/chi-tiet`, // Ví dụ
        YcLienQuanID: ycDoiPhongID,
        LoaiYcLienQuan: 'YEUCAUDOIPHONG',
        // LoaiThongBao: hanhDong === 'DUYET' ? LoaiThongBao.YC_DOI_PHONG_DA_DUYET : LoaiThongBao.YC_DOI_PHONG_BI_TU_CHOI, // Cần thêm
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
    if (transaction && transaction.rolledBack === false && transaction.active) {
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
 * @param {number} ycDoiPhongID
 * @param {object} nguoiHuy - Thông tin người dùng thực hiện (từ req.user)
 * @returns {Promise<{ message: string }>}
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

  // Kiểm tra quyền: Chỉ người tạo yêu cầu mới được hủy
  if (yeuCauDoi.NguoiYeuCauID !== nguoiHuy.nguoiDungID) {
    // Có thể thêm quyền cho ADMIN_HE_THONG nếu muốn
    // const userRoles = await authRepository.getVaiTroChucNangByNguoiDungID(nguoiHuy.nguoiDungID);
    // const isAdmin = userRoles.some(r => r.maVaiTro === MaVaiTro.ADMIN_HE_THONG);
    // if(!isAdmin) {
    // throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền hủy yêu cầu đổi phòng này.');
    // }
    // Tạm thời chỉ cho người tạo
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Bạn không phải là người tạo yêu cầu này để thực hiện hủy.'
    );
  }

  // Kiểm tra trạng thái có cho phép hủy không
  if (
    yeuCauDoi.MaTrangThaiHienTai !==
    MaTrangThaiYeuCauDoiPhong.CHO_DUYET_DOI_PHONG
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Không thể hủy yêu cầu đổi phòng khi đang ở trạng thái "${yeuCauDoi.MaTrangThaiHienTai}". Chỉ có thể hủy khi "Chờ duyệt".`
    );
  }

  // Lấy ID trạng thái "Đã hủy bởi người tạo"
  const trangThaiDaHuyID = await suKienRepository.getTrangThaiSkIDByMa(
    MaTrangThaiYeuCauDoiPhong.DA_HUY_YEU_CAU_DOI, // Mã này cần được thêm vào enum và CSDL
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

  // TODO: Gửi thông báo cho QUAN_LY_CSVC biết yêu cầu đã bị hủy (nếu cần)
  // const usersCSVC = await authRepository.findUsersByRoleMa(MaVaiTro.QUAN_LY_CSVC);
  // const suKienInfo = await suKienRepository.getSuKienDetailById(yeuCauDoi.SuKienID);
  // if (usersCSVC && usersCSVC.length > 0) {
  //   usersCSVC.forEach(userCSVC => {
  //     thongBaoService.createThongBao({
  //       NguoiNhanID: userCSVC.NguoiDungID,
  //       NoiDungTB: `Yêu cầu đổi phòng (ID: ${ycDoiPhongID}) cho sự kiện "[${suKienInfo?.tenSK}]" đã bị người dùng hủy.`,
  //       DuongDanLienQuan: `/admin/yeu-cau-doi-phong/${ycDoiPhongID}`,
  //       YcLienQuanID: ycDoiPhongID, LoaiYcLienQuan: 'YEUCAUDOIPHONG_HUY',
  //       // LoaiThongBao: LoaiThongBao.YC_DOI_PHONG_DA_HUY_USER, // Cần thêm
  //     }).catch(err => logger.error('Failed to send YC_DOI_PHONG_DA_HUY_USER notification:', err));
  //   });
  // }

  return { message: 'Yêu cầu đổi phòng đã được hủy thành công.' };
};

export const yeuCauDoiPhongService = {
  getYeuCauDoiPhongs,
  getYeuCauDoiPhongDetail,
  createYeuCauDoiPhong,
  xuLyYeuCauDoiPhong,
  huyYeuCauDoiPhongByUser,
};
