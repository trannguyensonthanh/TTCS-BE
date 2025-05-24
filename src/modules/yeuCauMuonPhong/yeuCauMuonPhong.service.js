// src/modules/yeuCauMuonPhong/yeuCauMuonPhong.service.js
import { yeuCauMuonPhongRepository } from './yeuCauMuonPhong.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import { authRepository } from '../auth/auth.repository.js'; // Để lấy vai trò
import LoaiThongBao from '../../enums/loaiThongBao.enum.js';

/**
 * Lấy danh sách YeuCauMuonPhong
 */
const getYeuCauMuonPhongs = async (params, currentUser) => {
  // Logic phân quyền xem danh sách
  const userRoles = await authRepository.getVaiTroChucNangByNguoiDungID(
    currentUser.nguoiDungID
  );
  const isCSVC = userRoles.some(
    (role) => role.maVaiTro === MaVaiTro.QUAN_LY_CSVC
  );
  const isAdmin = userRoles.some(
    (role) => role.maVaiTro === MaVaiTro.ADMIN_HE_THONG
  );

  let modifiedParams = { ...params };
  if (!isAdmin && !isCSVC) {
    // Nếu không phải admin hoặc CSVC, chỉ cho xem yêu cầu của chính họ
    // Hoặc nếu là Trưởng Khoa/CLB/Bí thư Đoàn, có thể cho xem của đơn vị họ (cần thêm logic này)
    modifiedParams.nguoiYeuCauID = currentUser.nguoiDungID;
  }

  const { items, totalItems } =
    await yeuCauMuonPhongRepository.getYeuCauMuonPhongListWithPagination(
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
 * Lấy chi tiết YeuCauMuonPhong
 */
const getYeuCauMuonPhongDetail = async (ycMuonPhongID, currentUser) => {
  const yeuCau =
    await yeuCauMuonPhongRepository.getYeuCauMuonPhongDetailById(ycMuonPhongID);
  if (!yeuCau) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Yêu cầu mượn phòng không tồn tại.'
    );
  }

  // Logic phân quyền xem chi tiết (tương tự như xem danh sách)
  // const userRoles = await authRepository.getVaiTroChucNangByNguoiDungID(currentUser.nguoiDungID);
  // const isCSVC = userRoles.some(role => role.maVaiTro === MaVaiTro.QUAN_LY_CSVC);
  // const isAdmin = userRoles.some(role => role.maVaiTro === MaVaiTro.ADMIN_HE_THONG);
  // if (!isAdmin && !isCSVC && yeuCau.nguoiYeuCau.nguoiDungID !== currentUser.nguoiDungID) {
  //   throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền xem chi tiết yêu cầu này.');
  // }
  // Logic phân quyền có thể phức tạp hơn, tùy theo yêu cầu (VD: Trưởng Khoa xem của Khoa mình)

  return yeuCau;
};

/**
 * Tạo mới YeuCauMuonPhong và các chi tiết của nó
 * @param {object} payload - CreateYeuCauMuonPhongPayload
 * @param {object} nguoiYeuCau - Thông tin người dùng thực hiện (từ req.user)
 * @returns {Promise<YeuCauMuonPhongDetailResponse>}
 */
const createYeuCauMuonPhong = async (payload, nguoiYeuCau) => {
  const { suKienID, ghiChuChungYc, chiTietYeuCau } = payload;

  // 1. Kiểm tra Sự kiện có tồn tại và ở trạng thái cho phép không (DA_DUYET_BGH)
  const trangThaiSKHienTai =
    await yeuCauMuonPhongRepository.getSuKienTrangThai(suKienID);
  if (!trangThaiSKHienTai) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sự kiện không tồn tại.');
  }
  if (trangThaiSKHienTai !== MaTrangThaiSK.DA_DUYET_BGH) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Sự kiện không ở trạng thái "Đã duyệt BGH" (Trạng thái hiện tại: ${trangThaiSKHienTai}). Không thể tạo yêu cầu mượn phòng.`
    );
  }

  // 2. Validate chiTietYeuCau (ví dụ: LoaiPhongYcID có tồn tại không) - có thể làm sâu hơn
  for (const detail of chiTietYeuCau) {
    if (detail.loaiPhongYcID) {
      // const loaiPhong = await loaiPhongRepository.getLoaiPhongById(detail.loaiPhongYcID); // Giả sử có hàm này
      // if (!loaiPhong) {
      //   throw new ApiError(httpStatus.BAD_REQUEST, `Loại phòng yêu cầu ID ${detail.loaiPhongYcID} không hợp lệ.`);
      // }
      console.log(
        `TODO: Validate LoaiPhongYcID ${detail.loaiPhongYcID} if it exists.`
      );
    }
    if (new Date(detail.tgTraDk) <= new Date(detail.tgMuonDk)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Thời gian trả phòng dự kiến (${detail.tgTraDk}) phải sau thời gian mượn dự kiến (${detail.tgMuonDk}) cho một trong các chi tiết.`
      );
    }
  }

  // 3. Lấy ID trạng thái cần thiết
  const trangThaiChungID_ChoXuLy = await suKienRepository.getTrangThaiSkIDByMa(
    MaTrangThaiYeuCauPhong.YCCP_CHO_XU_LY,
    'TrangThaiYeuCauPhong',
    'TrangThaiYcpID',
    'MaTrangThai'
  );
  const trangThaiCtID_ChoDuyet = await suKienRepository.getTrangThaiSkIDByMa(
    MaTrangThaiYeuCauPhong.YCCPCT_CHO_DUYET,
    'TrangThaiYeuCauPhong',
    'TrangThaiYcpID',
    'MaTrangThai'
  );
  const trangThaiSK_ChoDuyetPhong = await suKienRepository.getTrangThaiSkIDByMa(
    MaTrangThaiSK.CHO_DUYET_PHONG
  );

  if (
    !trangThaiChungID_ChoXuLy ||
    !trangThaiCtID_ChoDuyet ||
    !trangThaiSK_ChoDuyetPhong
  ) {
    logger.error(
      'Lỗi cấu hình: Không tìm thấy mã trạng thái cần thiết cho việc tạo yêu cầu mượn phòng.'
    );
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Lỗi hệ thống khi xử lý trạng thái yêu cầu.'
    );
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    logger.debug(
      `Transaction started for creating YeuCauMuonPhong for SuKienID: ${suKienID}`
    );

    // 4. Tạo YeuCauMuonPhong (Header)
    const ycMuonPhongID =
      await yeuCauMuonPhongRepository.createYeuCauMuonPhongHeader(
        {
          suKienID,
          nguoiYeuCauID: nguoiYeuCau.nguoiDungID,
          ghiChuChungYc,
          trangThaiChungID: trangThaiChungID_ChoXuLy,
        },
        transaction
      );
    logger.debug(`YeuCauMuonPhong header created with ID: ${ycMuonPhongID}`);

    // 5. Tạo các YcMuonPhongChiTiet (Detail)
    for (const detail of chiTietYeuCau) {
      await yeuCauMuonPhongRepository.createYcMuonPhongDetail(
        {
          ...detail,
          ycMuonPhongID,
          trangThaiCtID: trangThaiCtID_ChoDuyet,
        },
        transaction
      );
    }
    logger.debug(
      `YcMuonPhongChiTiet records created for YcMuonPhongID: ${ycMuonPhongID}`
    );

    // 6. Cập nhật trạng thái SuKien thành CHO_DUYET_PHONG
    await suKienRepository.updateSuKienTrangThai(
      suKienID,
      trangThaiSK_ChoDuyetPhong,
      transaction
    );
    logger.debug(`SuKienID: ${suKienID} status updated to CHO_DUYET_PHONG`);

    await transaction.commit();
    logger.info(`Transaction committed for YcMuonPhongID: ${ycMuonPhongID}`);

    // 7. Gửi thông báo cho QUAN_LY_CSVC
    const suKienInfo = await suKienRepository.getSuKienDetailById(suKienID); // Lấy tên sự kiện
    const usersCSVC = await authRepository.findUsersByRoleMa(
      MaVaiTro.QUAN_LY_CSVC
    );
    if (usersCSVC && usersCSVC.length > 0) {
      usersCSVC.forEach((userCSVC) => {
        thongBaoService
          .createThongBao({
            NguoiNhanID: userCSVC.NguoiDungID,
            NoiDungTB: `Có yêu cầu mượn phòng mới cho sự kiện "[${suKienInfo?.tenSK || `ID: ${suKienID}`}]" đang chờ xử lý.`,
            DuongDanTB: `/admin/yeu-cau-phong/${ycMuonPhongID}`, // Ví dụ link admin
            YcLienQuanID: ycMuonPhongID,
            LoaiYcLienQuan: 'YEUCAUMUONPHONG',
            LoaiThongBao: LoaiThongBao.YC_PHONG_MOI_CHO_CSVC,
          })
          .catch((err) =>
            logger.error(
              'Failed to send YC_PHONG_MOI_CHO_CSVC notification:',
              err
            )
          );
      });
    }

    // 8. Trả về chi tiết yêu cầu vừa tạo
    return yeuCauMuonPhongRepository.getYeuCauMuonPhongDetailById(
      ycMuonPhongID
    );
  } catch (error) {
    logger.error(
      `Error during YeuCauMuonPhong creation transaction for SuKienID: ${suKienID}, rolling back...`,
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
      'Tạo yêu cầu mượn phòng thất bại do lỗi hệ thống.'
    );
  }
};

/**
 * CSVC xử lý một chi tiết yêu cầu mượn phòng (Duyệt hoặc Từ chối)
 * @param {number} ycMuonPhongCtID
 * @param {object} payload - XuLyYcChiTietPayload { hanhDong, phongDuocCap?, ghiChuCSVC? }
 * @param {object} nguoiXuLy - Thông tin người dùng CSVC (từ req.user)
 * @returns {Promise<YeuCauMuonPhongDetailResponse>} Chi tiết YeuCauMuonPhong đã cập nhật
 */
const xuLyChiTietYeuCau = async (ycMuonPhongCtID, payload, nguoiXuLy) => {
  const { hanhDong, phongDuocCap, ghiChuCSVC } = payload;

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    logger.debug(
      `Transaction started for processing YcMuonPhongCtID: ${ycMuonPhongCtID}`
    );

    const chiTietYeuCau =
      await yeuCauMuonPhongRepository.getYcMuonPhongChiTietForProcessing(
        ycMuonPhongCtID,
        transaction
      );
    if (!chiTietYeuCau) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Chi tiết yêu cầu mượn phòng không tồn tại.'
      );
    }
    if (
      chiTietYeuCau.MaTrangThaiChiTietHienTai !==
      MaTrangThaiYeuCauPhong.YCCPCT_CHO_DUYET
    ) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Chi tiết yêu cầu này không ở trạng thái "Chờ duyệt" (Hiện tại: ${chiTietYeuCau.MaTrangThaiChiTietHienTai}).`
      );
    }

    let trangThaiCtMoiID;
    const ycMuonPhongID = chiTietYeuCau.YcMuonPhongID;
    const suKienID = chiTietYeuCau.SuKienID;

    if (hanhDong === 'DUYET') {
      if (!phongDuocCap || phongDuocCap.length === 0) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Cần cung cấp thông tin phòng được cấp khi duyệt.'
        );
      }
      if (phongDuocCap.length > chiTietYeuCau.SlPhongNhomNay) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Số lượng phòng được cấp (${phongDuocCap.length}) vượt quá số lượng yêu cầu (${chiTietYeuCau.SlPhongNhomNay}).`
        );
      }

      // Kiểm tra phòng có tồn tại và sẵn sàng không
      for (const phongInfo of phongDuocCap) {
        const phongExists = await yeuCauMuonPhongRepository.checkPhongExists(
          phongInfo.phongID,
          transaction
        );
        if (!phongExists) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Phòng ID ${phongInfo.phongID} không tồn tại.`
          );
        }
        const isAvailable =
          await yeuCauMuonPhongRepository.checkPhongAvailability(
            phongInfo.phongID,
            new Date(chiTietYeuCau.TgMuonDk),
            new Date(chiTietYeuCau.TgTraDk),
            transaction
          );
        if (!isAvailable) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Phòng ID ${phongInfo.phongID} không sẵn sàng trong khoảng thời gian yêu cầu.`
          );
        }
      }

      // Tạo bản ghi ChiTietDatPhong
      for (const phongInfo of phongDuocCap) {
        await yeuCauMuonPhongRepository.createChiTietDatPhong(
          ycMuonPhongCtID,
          phongInfo.phongID,
          new Date(chiTietYeuCau.TgMuonDk), // Lấy thời gian từ yêu cầu chi tiết
          new Date(chiTietYeuCau.TgTraDk),
          transaction
        );
      }
      trangThaiCtMoiID = await suKienRepository.getTrangThaiSkIDByMa(
        MaTrangThaiYeuCauPhong.YCCPCT_DA_XEP_PHONG,
        'TrangThaiYeuCauPhong',
        'TrangThaiYcpID',
        'MaTrangThai',
        transaction
      );
    } else if (hanhDong === 'TU_CHOI') {
      if (!ghiChuCSVC) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Cần cung cấp lý do/ghi chú khi từ chối yêu cầu chi tiết.'
        );
      }
      trangThaiCtMoiID = await suKienRepository.getTrangThaiSkIDByMa(
        MaTrangThaiYeuCauPhong.YCCPCT_KHONG_PHU_HOP,
        'TrangThaiYeuCauPhong',
        'TrangThaiYcpID',
        'MaTrangThai',
        transaction
      );
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Hành động không hợp lệ.');
    }

    if (!trangThaiCtMoiID) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi cấu hình: Không tìm thấy mã trạng thái chi tiết yêu cầu phòng.'
      );
    }

    // Cập nhật trạng thái và ghi chú cho YcMuonPhongChiTiet
    await yeuCauMuonPhongRepository.updateYcMuonPhongChiTietStatus(
      ycMuonPhongCtID,
      trangThaiCtMoiID,
      ghiChuCSVC,
      transaction
    );
    logger.debug(`YcMuonPhongCtID: ${ycMuonPhongCtID} status updated.`);

    // Kiểm tra và cập nhật trạng thái của YeuCauMuonPhong (Header)
    const statusCounts =
      await yeuCauMuonPhongRepository.countYcMuonPhongChiTietStatuses(
        ycMuonPhongID,
        transaction
      );
    let trangThaiChungMoiID;
    if (statusCounts.ChoDuyetCount > 0) {
      trangThaiChungMoiID = await suKienRepository.getTrangThaiSkIDByMa(
        MaTrangThaiYeuCauPhong.YCCP_DANG_XU_LY,
        'TrangThaiYeuCauPhong',
        'TrangThaiYcpID',
        'MaTrangThai',
        transaction
      );
    } else if (
      statusCounts.DaXepPhongCount > 0 &&
      statusCounts.KhongPhuHopCount > 0
    ) {
      trangThaiChungMoiID = await suKienRepository.getTrangThaiSkIDByMa(
        MaTrangThaiYeuCauPhong.YCCP_DA_XU_LY_MOT_PHAN,
        'TrangThaiYeuCauPhong',
        'TrangThaiYcpID',
        'MaTrangThai',
        transaction
      );
    } else if (
      statusCounts.DaXepPhongCount > 0 &&
      statusCounts.KhongPhuHopCount === 0
    ) {
      trangThaiChungMoiID = await suKienRepository.getTrangThaiSkIDByMa(
        MaTrangThaiYeuCauPhong.YCCP_HOAN_TAT_DUYET,
        'TrangThaiYeuCauPhong',
        'TrangThaiYcpID',
        'MaTrangThai',
        transaction
      );
    } else {
      // Tất cả bị từ chối hoặc các trường hợp khác
      trangThaiChungMoiID = await suKienRepository.getTrangThaiSkIDByMa(
        MaTrangThaiYeuCauPhong.YCCP_TU_CHOI_TOAN_BO,
        'TrangThaiYeuCauPhong',
        'TrangThaiYcpID',
        'MaTrangThai',
        transaction
      );
    }

    if (!trangThaiChungMoiID)
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi cấu hình trạng thái chung YCCP.'
      );
    await yeuCauMuonPhongRepository.updateYeuCauMuonPhongHeaderStatus(
      ycMuonPhongID,
      trangThaiChungMoiID,
      nguoiXuLy.nguoiDungID,
      transaction
    );
    logger.debug(`YeuCauMuonPhongID: ${ycMuonPhongID} header status updated.`);

    // Cập nhật trạng thái sự kiện nếu tất cả chi tiết đã được xử lý và có phòng
    const finalStatusCounts =
      await yeuCauMuonPhongRepository.countYcMuonPhongChiTietStatuses(
        ycMuonPhongID,
        transaction
      ); // Đếm lại sau khi cập nhật header
    if (finalStatusCounts.ChoDuyetCount === 0) {
      // Tất cả chi tiết đã được xử lý
      if (finalStatusCounts.DaXepPhongCount > 0) {
        const trangThaiSK_DaXNPhong =
          await suKienRepository.getTrangThaiSkIDByMa(
            MaTrangThaiSK.DA_XAC_NHAN_PHONG,
            null,
            null,
            null,
            transaction
          );
        if (trangThaiSK_DaXNPhong)
          await suKienRepository.updateSuKienTrangThai(
            suKienID,
            trangThaiSK_DaXNPhong,
            transaction
          );
        logger.debug(
          `SuKienID: ${suKienID} status updated to DA_XAC_NHAN_PHONG.`
        );
      } else {
        // Tất cả chi tiết bị từ chối hoặc không phù hợp
        const trangThaiSK_PhongBiTuChoi =
          await suKienRepository.getTrangThaiSkIDByMa(
            MaTrangThaiSK.PHONG_BI_TU_CHOI,
            null,
            null,
            null,
            transaction
          );
        if (trangThaiSK_PhongBiTuChoi)
          await suKienRepository.updateSuKienTrangThai(
            suKienID,
            trangThaiSK_PhongBiTuChoi,
            transaction
          );
        logger.debug(
          `SuKienID: ${suKienID} status updated to PHONG_BI_TU_CHOI.`
        );
      }
    }

    await transaction.commit();
    logger.info(
      `Transaction committed for processing YcMuonPhongCtID: ${ycMuonPhongCtID}`
    );

    // Gửi thông báo cho người tạo yêu cầu phòng
    const yeuCauHeader =
      await yeuCauMuonPhongRepository.getYeuCauMuonPhongDetailById(
        ycMuonPhongID
      ); // Lấy thông tin người yêu cầu
    if (yeuCauHeader && yeuCauHeader.nguoiYeuCau) {
      let noiDungTB = `Chi tiết yêu cầu phòng (ID: ${ycMuonPhongCtID}) cho sự kiện "[${yeuCauHeader.suKien.tenSK}]" `;
      noiDungTB +=
        hanhDong === 'DUYET'
          ? `đã được duyệt và xếp phòng.`
          : `đã bị từ chối. Lý do: ${ghiChuCSVC || 'Không có'}`;
      thongBaoService
        .createThongBao({
          NguoiNhanID: yeuCauHeader.nguoiYeuCau.nguoiDungID,
          NoiDungTB: noiDungTB,
          DuongDanLienQuan: `/yeu-cau-muon-phong/${ycMuonPhongID}`,
          YcLienQuanID: ycMuonPhongID,
          LoaiYcLienQuan: 'YEUCAUMUONPHONG',
          LoaiThongBao:
            hanhDong === 'DUYET'
              ? LoaiThongBao.YC_PHONG_DA_DUYET_CSVC
              : LoaiThongBao.YC_PHONG_BI_TU_CHOI_CSVC,
        })
        .catch((err) =>
          logger.error('Failed to send YC_PHONG_XU_LY notification:', err)
        );
    }

    return yeuCauMuonPhongRepository.getYeuCauMuonPhongDetailById(
      ycMuonPhongID
    );
  } catch (error) {
    logger.error(
      `Error during processing YcMuonPhongCtID: ${ycMuonPhongCtID}, rolling back...`,
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
      'Xử lý chi tiết yêu cầu mượn phòng thất bại.'
    );
  }
};

/**
 * Hủy toàn bộ YeuCauMuonPhong bởi người tạo (nếu chưa được CSVC xử lý)
 * @param {number} ycMuonPhongID
 * @param {object} nguoiHuy - Thông tin người dùng thực hiện (từ req.user)
 * @returns {Promise<YeuCauMuonPhongDetailResponse>} Chi tiết YeuCauMuonPhong đã cập nhật
 */
const huyYeuCauMuonPhongByUser = async (ycMuonPhongID, nguoiHuy) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    logger.debug(
      `Transaction started for cancelling YeuCauMuonPhongID: ${ycMuonPhongID}`
    );

    const yeuCauHeader =
      await yeuCauMuonPhongRepository.getYeuCauMuonPhongHeaderForCancel(
        ycMuonPhongID,
        transaction
      );
    if (!yeuCauHeader) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Yêu cầu mượn phòng không tồn tại.'
      );
    }

    // Kiểm tra quyền hủy: Chỉ người tạo yêu cầu mới được hủy
    if (yeuCauHeader.NguoiYeuCauID !== nguoiHuy.nguoiDungID) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Bạn không phải là người tạo yêu cầu này để thực hiện hủy.'
      );
    }

    // Kiểm tra trạng thái của YeuCauMuonPhong (Header) có cho phép hủy không
    if (
      yeuCauHeader.MaTrangThaiChungHienTai !==
      MaTrangThaiYeuCauPhong.YCCP_CHO_XU_LY
    ) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Không thể hủy yêu cầu mượn phòng khi đang ở trạng thái "${yeuCauHeader.MaTrangThaiChungHienTai}". Chỉ có thể hủy khi "Chờ xử lý".`
      );
    }

    // Lấy ID các trạng thái cần thiết
    const trangThaiHeaderDaHuyID = await suKienRepository.getTrangThaiSkIDByMa(
      MaTrangThaiYeuCauPhong.YCCP_DA_HUY_BOI_NGUOI_TAO,
      'TrangThaiYeuCauPhong',
      'TrangThaiYcpID',
      'MaTrangThai',
      transaction
    );
    const trangThaiChiTietDaHuyID = await suKienRepository.getTrangThaiSkIDByMa(
      MaTrangThaiYeuCauPhong.YCCPCT_DA_HUY,
      'TrangThaiYeuCauPhong',
      'TrangThaiYcpID',
      'MaTrangThai',
      transaction
    );
    const trangThaiSK_DaDuyetBGH_ID =
      await suKienRepository.getTrangThaiSkIDByMa(
        MaTrangThaiSK.DA_DUYET_BGH,
        null,
        null,
        null,
        transaction
      ); // Dùng hàm getTrangThaiSkIDByMa từ suKienRepo

    if (
      !trangThaiHeaderDaHuyID ||
      !trangThaiChiTietDaHuyID ||
      !trangThaiSK_DaDuyetBGH_ID
    ) {
      logger.error(
        'Lỗi cấu hình: Không tìm thấy mã trạng thái cần thiết cho việc hủy yêu cầu phòng.'
      );
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi hệ thống khi xử lý trạng thái hủy yêu cầu.'
      );
    }

    // 1. Cập nhật trạng thái của YeuCauMuonPhong (Header)
    await yeuCauMuonPhongRepository.updateYeuCauMuonPhongHeaderStatus(
      ycMuonPhongID,
      trangThaiHeaderDaHuyID,
      nguoiHuy.nguoiDungID, // Ghi nhận người hủy (có thể không cần nếu chỉ người tạo được hủy)
      transaction
    );
    logger.debug(
      `YeuCauMuonPhongID: ${ycMuonPhongID} header status updated to DA_HUY_BOI_NGUOI_TAO.`
    );

    // 2. Cập nhật trạng thái của tất cả YcMuonPhongChiTiet liên quan
    await yeuCauMuonPhongRepository.updateAllChiTietOfYeuCauToHuy(
      ycMuonPhongID,
      trangThaiChiTietDaHuyID,
      transaction
    );
    logger.debug(
      `All YcMuonPhongChiTiet for YcMuonPhongID: ${ycMuonPhongID} status updated to DA_HUY.`
    );

    // 3. Cập nhật trạng thái của SuKien liên quan quay lại DA_DUYET_BGH
    await suKienRepository.updateSuKienTrangThai(
      yeuCauHeader.SuKienID,
      trangThaiSK_DaDuyetBGH_ID,
      transaction
    );
    logger.debug(
      `SuKienID: ${yeuCauHeader.SuKienID} status updated back to DA_DUYET_BGH.`
    );

    await transaction.commit();
    logger.info(
      `Transaction committed for cancelling YcMuonPhongID: ${ycMuonPhongID}`
    );

    // Gửi thông báo (nếu cần, ví dụ cho CSVC biết yêu cầu đã bị hủy)
    // ...

    return yeuCauMuonPhongRepository.getYeuCauMuonPhongDetailById(
      ycMuonPhongID
    );
  } catch (error) {
    logger.error(
      `Error during cancelling YeuCauMuonPhongID: ${ycMuonPhongID}, rolling back...`,
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
      'Hủy yêu cầu mượn phòng thất bại do lỗi hệ thống.'
    );
  }
};

export const yeuCauMuonPhongService = {
  getYeuCauMuonPhongs,
  getYeuCauMuonPhongDetail,
  createYeuCauMuonPhong,
  xuLyChiTietYeuCau,
  huyYeuCauMuonPhongByUser,
};
