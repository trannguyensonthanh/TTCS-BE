// src/modules/yeuCauMuonPhong/yeuCauMuonPhong.service.js
import sql from 'mssql';
import { yeuCauMuonPhongRepository } from './yeuCauMuonPhong.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import { authRepository } from '../auth/auth.repository.js'; // Để lấy vai trò
import LoaiThongBao from '../../enums/loaiThongBao.enum.js';
import MaTrangThaiSK from '../../enums/maTrangThaiSK.enum.js';
import { suKienRepository } from '../suKien/suKien.repository.js';
import MaTrangThaiYeuCauPhong from '../../enums/maTrangThaiYeuCauPhong.enum.js';
import { getPool } from '../../utils/database.js';
import logger from '../../utils/logger.util.js';
import { thongBaoService } from '../thongBao/thongBao.service.js';

/**
 * Lấy danh sách yêu cầu mượn phòng (có phân trang, phân quyền)
 * Đầu vào: params (object chứa searchTerm, trangThaiChungMa, suKienID, nguoiYeuCauID, donViYeuCauID, tuNgayYeuCau, denNgayYeuCau, page, limit, sortBy, sortOrder), currentUser (object)
 * Đầu ra: object { items, totalPages, currentPage, totalItems, pageSize }
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

  const modifiedParams = { ...params };
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
 * Lấy chi tiết một yêu cầu mượn phòng
 * Đầu vào: ycMuonPhongID (number), currentUser (object)
 * Đầu ra: object chi tiết yêu cầu mượn phòng
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
 * Tạo mới yêu cầu mượn phòng và các chi tiết của nó
 * Đầu vào: payload (object), nguoiYeuCau (object)
 * Đầu ra: object chi tiết yêu cầu mượn phòng vừa tạo
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

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    logger.debug(
      `Transaction started for creating YeuCauMuonPhong for SuKienID: ${suKienID}`
    );

    // 3. Lấy ID trạng thái cần thiết
    const trangThaiChungIdChoXuLy =
      await suKienRepository.getTrangThaiIDByMaGeneric(
        MaTrangThaiYeuCauPhong.YCCP_CHO_XU_LY,
        'TrangThaiYeuCauPhong',
        'TrangThaiYcpID',
        'MaTrangThai',
        transaction
      );
    const trangThaiCtIdChoDuyet =
      await suKienRepository.getTrangThaiIDByMaGeneric(
        MaTrangThaiYeuCauPhong.YCCPCT_CHO_DUYET,
        'TrangThaiYeuCauPhong',
        'TrangThaiYcpID',
        'MaTrangThai',
        transaction
      );
    const trangThaiSkChoDuyetPhong =
      await suKienRepository.getTrangThaiSkIDByMa(
        MaTrangThaiSK.CHO_DUYET_PHONG,
        transaction
      );
    logger.debug('Trang Thai IDs retrieved for creation:', {
      trangThaiChungIdChoXuLy,
      trangThaiCtIdChoDuyet,
      trangThaiSkChoDuyetPhong,
    });

    if (
      !trangThaiChungIdChoXuLy ||
      !trangThaiCtIdChoDuyet ||
      !trangThaiSkChoDuyetPhong
    ) {
      logger.error(
        'Lỗi cấu hình: Không tìm thấy mã trạng thái cần thiết cho việc tạo yêu cầu mượn phòng.'
      );
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi hệ thống khi xử lý trạng thái yêu cầu.'
      );
    }

    // 4. Tạo YeuCauMuonPhong (Header)
    const ycMuonPhongID =
      await yeuCauMuonPhongRepository.createYeuCauMuonPhongHeader(
        {
          suKienID,
          nguoiYeuCauID: nguoiYeuCau.nguoiDungID,
          ghiChuChungYc,
          trangThaiChungID: trangThaiChungIdChoXuLy,
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
          trangThaiCtID: trangThaiCtIdChoDuyet,
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
      trangThaiSkChoDuyetPhong,
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
      'Tạo yêu cầu mượn phòng thất bại do lỗi hệ thống.'
    );
  }
};

/**
 * CSVC xử lý một chi tiết yêu cầu mượn phòng (Duyệt hoặc Từ chối)
 * Đầu vào: ycMuonPhongCtID (number), payload (object: hanhDong, phongDuocCap?, ghiChuCSVC?), nguoiXuLy (object)
 * Đầu ra: object chi tiết yêu cầu mượn phòng đã cập nhật
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
    // if (
    //   chiTietYeuCau.MaTrangThaiChiTietHienTai !==
    //   MaTrangThaiYeuCauPhong.YCCPCT_CHO_DUYET
    // ) {
    //   throw new ApiError(
    //     httpStatus.BAD_REQUEST,
    //     `Chi tiết yêu cầu này không ở trạng thái "Chờ duyệt" (Hiện tại: ${chiTietYeuCau.MaTrangThaiChiTietHienTai}).`
    //   );
    // }

    // Kiểm tra trạng thái hợp lệ cho từng hành động
    if (hanhDong === 'DUYET') {
      if (
        chiTietYeuCau.MaTrangThaiChiTietHienTai !==
        MaTrangThaiYeuCauPhong.YCCPCT_CHO_DUYET
      ) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Chỉ được duyệt khi chi tiết ở trạng thái "Chờ duyệt" (Hiện tại: ${chiTietYeuCau.MaTrangThaiChiTietHienTai}).`
        );
      }
    } else if (hanhDong === 'TU_CHOI') {
      if (
        chiTietYeuCau.MaTrangThaiChiTietHienTai !==
          MaTrangThaiYeuCauPhong.YCCPCT_CHO_DUYET &&
        chiTietYeuCau.MaTrangThaiChiTietHienTai !==
          MaTrangThaiYeuCauPhong.CSVC_YEU_CAU_CHINH_SUA_CT
      ) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Chỉ được từ chối khi chi tiết ở trạng thái "Chờ duyệt" hoặc "CSVC yêu cầu chỉnh sửa" (Hiện tại: ${chiTietYeuCau.MaTrangThaiChiTietHienTai}).`
        );
      }
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Hành động không hợp lệ.');
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
      trangThaiCtMoiID = await suKienRepository.getTrangThaiIDByMaGeneric(
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
      trangThaiCtMoiID = await suKienRepository.getTrangThaiIDByMaGeneric(
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
      trangThaiChungMoiID = await suKienRepository.getTrangThaiIDByMaGeneric(
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
      trangThaiChungMoiID = await suKienRepository.getTrangThaiIDByMaGeneric(
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
      trangThaiChungMoiID = await suKienRepository.getTrangThaiIDByMaGeneric(
        MaTrangThaiYeuCauPhong.YCCP_HOAN_TAT_DUYET,
        'TrangThaiYeuCauPhong',
        'TrangThaiYcpID',
        'MaTrangThai',
        transaction
      );
    } else {
      // Tất cả bị từ chối hoặc các trường hợp khác
      trangThaiChungMoiID = await suKienRepository.getTrangThaiIDByMaGeneric(
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
        const trangThaiSkDaXNPhong =
          await suKienRepository.getTrangThaiIDByMaGeneric(
            MaTrangThaiSK.DA_XAC_NHAN_PHONG,
            'TrangThaiSK',
            'TrangThaiSkID',
            'MaTrangThai',
            transaction
          );
        if (trangThaiSkDaXNPhong)
          await suKienRepository.updateSuKienTrangThai(
            suKienID,
            trangThaiSkDaXNPhong,
            transaction
          );
        logger.debug(
          `SuKienID: ${suKienID} status updated to DA_XAC_NHAN_PHONG.`
        );
      } else {
        // Tất cả chi tiết bị từ chối hoặc không phù hợp
        const trangThaiSkPhongBiTuChoi =
          await suKienRepository.getTrangThaiSkIDByMa(
            MaTrangThaiSK.PHONG_BI_TU_CHOI,
            transaction
          );
        if (trangThaiSkPhongBiTuChoi)
          await suKienRepository.updateSuKienTrangThai(
            suKienID,
            trangThaiSkPhongBiTuChoi,
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
          DuongDanTB: `/yeu-cau-muon-phong/${ycMuonPhongID}`,
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
      'Xử lý chi tiết yêu cầu mượn phòng thất bại.'
    );
  }
};

/**
 * Hủy toàn bộ yêu cầu mượn phòng bởi người tạo (nếu chưa được CSVC xử lý)
 * Đầu vào: ycMuonPhongID (number), nguoiHuy (object)
 * Đầu ra: object chi tiết yêu cầu mượn phòng đã cập nhật
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
    const trangThaiHeaderDaHuyID =
      await suKienRepository.getTrangThaiIDByMaGeneric(
        MaTrangThaiYeuCauPhong.YCCP_DA_HUY_BOI_NGUOI_TAO,
        'TrangThaiYeuCauPhong',
        'TrangThaiYcpID',
        'MaTrangThai',
        transaction
      );
    const trangThaiChiTietDaHuyID =
      await suKienRepository.getTrangThaiIDByMaGeneric(
        MaTrangThaiYeuCauPhong.YCCPCT_DA_HUY,
        'TrangThaiYeuCauPhong',
        'TrangThaiYcpID',
        'MaTrangThai',
        transaction
      );
    const trangThaiSkDaDuyetBGHId = await suKienRepository.getTrangThaiSkIDByMa(
      MaTrangThaiSK.DA_DUYET_BGH,
      transaction
    ); // Dùng hàm getTrangThaiSkIDByMa từ suKienRepo

    if (
      !trangThaiHeaderDaHuyID ||
      !trangThaiChiTietDaHuyID ||
      !trangThaiSkDaDuyetBGHId
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
      trangThaiSkDaDuyetBGHId,
      transaction
    );
    logger.debug(
      `SuKienID: ${yeuCauHeader.SuKienID} status updated back to DA_DUYET_BGH.`
    );

    await transaction.commit();
    logger.info(
      `Transaction committed for cancelling YcMuonPhongID: ${ycMuonPhongID}`
    );

    return yeuCauMuonPhongRepository.getYeuCauMuonPhongDetailById(
      ycMuonPhongID
    );
  } catch (error) {
    logger.error(
      `Error during cancelling YeuCauMuonPhongID: ${ycMuonPhongID}, rolling back...`,
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
      'Hủy yêu cầu mượn phòng thất bại do lỗi hệ thống.'
    );
  }
};

const SO_NGAY_TOI_DA_CHO_CSVC_XU_LY_PHONG = 3;

/**
 * Gửi thông báo nhắc nhở CSVC xử lý các yêu cầu phòng quá hạn
 * Đầu vào: không
 * Đầu ra: không (thực hiện gửi thông báo cho các user CSVC)
 */
const sendRemindersForOverdueCSVCProcessing = async () => {
  logger.info('JOB: Checking for overdue CSVC room request processing...');
  const overdueRequests =
    await yeuCauMuonPhongRepository.findYeuCauPhongChoCSVCQuaHan(
      SO_NGAY_TOI_DA_CHO_CSVC_XU_LY_PHONG
    );

  if (overdueRequests.length === 0) {
    logger.info('JOB: No overdue CSVC room requests found.');
    return;
  }

  const usersCSVC = await authRepository.findUsersByRoleMa(
    MaVaiTro.QUAN_LY_CSVC
  );
  if (!usersCSVC || usersCSVC.length === 0) {
    logger.warn(
      'JOB: No users with QUAN_LY_CSVC role found to send reminders.'
    );
    return;
  }

  for (const request of overdueRequests) {
    for (const user of usersCSVC) {
      thongBaoService
        .createThongBao({
          NguoiNhanID: user.NguoiDungID,
          NoiDungTB: `Nhắc nhở: Yêu cầu mượn phòng cho sự kiện "[${request.TenSK}]" (YC ID: ${request.YcMuonPhongID}, tạo bởi ${request.EmailNguoiYeuCau || request.NguoiYeuCauID}) đã chờ xử lý quá ${SO_NGAY_TOI_DA_CHO_CSVC_XU_LY_PHONG} ngày.`,
          DuongDanTB: `/admin/yeu-cau-phong/${request.YcMuonPhongID}`,
          YcLienQuanID: request.YcMuonPhongID,
          LoaiYcLienQuan: 'YEUCAUMUONPHONG',
          LoaiThongBao: LoaiThongBao.YC_PHONG_NHAC_NHO_DUYET_CSVC, // Cần thêm loại này
        })
        .catch((err) =>
          logger.error(
            `JOB: Failed to send CSVC reminder for YcMuonPhongID ${request.YcMuonPhongID} to UserID ${user.NguoiDungID}:`,
            err
          )
        );
    }
  }
  logger.info(
    `JOB: Sent ${overdueRequests.length * usersCSVC.length} CSVC processing reminders.`
  );
};

/**
 * Tự động hủy các sự kiện đã đến hạn bắt đầu nhưng vẫn chưa có phòng hoặc YC phòng chưa được xử lý
 * Đầu vào: không
 * Đầu ra: không (thực hiện cập nhật trạng thái và gửi thông báo)
 */
const autoCancelOverdueRoomAssignmentEvents = async () => {
  logger.info(
    'JOB: Checking for events to auto-cancel due to overdue room assignment and start time passed...'
  );
  const eventsToCancel =
    await yeuCauMuonPhongRepository.findSuKienQuaHanXepPhongDeHuy();

  if (eventsToCancel.length === 0) {
    logger.info('JOB: No events to auto-cancel (overdue room assignment).');
    return;
  }

  const trangThaiSKHuyID = await suKienRepository.getTrangThaiSkIDByMa(
    MaTrangThaiSK.HUY_DO_QUA_HAN_XU_LY
  );
  const trangThaiYCPHuyID = await suKienRepository.getTrangThaiIDByMaGeneric(
    MaTrangThaiYeuCauPhong.YCCP_TU_DONG_HUY,
    'TrangThaiYeuCauPhong',
    'TrangThaiYcpID',
    'MaTrangThai'
  ); // Nếu có

  if (!trangThaiSKHuyID) {
    logger.error(
      'JOB: Auto-cancel room assignment failed. HUY_DO_QUA_HAN_XU_LY status for SuKien not found.'
    );
    return;
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    for (const event of eventsToCancel) {
      await suKienRepository.updateSuKienTrangThai(
        event.SuKienID,
        trangThaiSKHuyID,
        transaction
      );
      // Nếu YeuCauMuonPhong tồn tại và có trạng thái phù hợp, cũng có thể cập nhật trạng thái của nó
      if (event.YcMuonPhongID) {
        await yeuCauMuonPhongRepository.updateYeuCauMuonPhongHeaderStatusForAutoCancel(
          event.YcMuonPhongID,
          trangThaiYCPHuyID,
          transaction
        );
        logger.info(
          `JOB: SuKienID ${event.SuKienID} also had YcMuonPhongID ${event.YcMuonPhongID} which might need status update if YCCP_TU_DONG_HUY is defined.`
        );
      }
    }
    await transaction.commit();
    logger.info(
      `JOB: Auto-cancelled ${eventsToCancel.length} events due to overdue room assignment.`
    );

    // Gửi thông báo cho người tạo sự kiện
    for (const event of eventsToCancel) {
      thongBaoService
        .createThongBao({
          NguoiNhanID: event.NguoiTaoID_SK,
          NoiDungTB: `Sự kiện "[${event.TenSK}]" của bạn đã bị tự động hủy do quá hạn xếp phòng và đã đến thời gian dự kiến bắt đầu.`,
          DuongDanTB: `/quan-ly-su-kien/${event.SuKienID}/chi-tiet`,
          SkLienQuanID: event.SuKienID,
          LoaiThongBao: LoaiThongBao.SU_KIEN_TU_DONG_HUY_QUA_HAN, // Có thể dùng chung loại thông báo
        })
        .catch((err) =>
          logger.error(
            `JOB: Failed to send auto-cancel (room) notification for SuKienID ${event.SuKienID}:`,
            err
          )
        );
    }
  } catch (error) {
    logger.error(
      'JOB: Error during auto-cancelling overdue room assignment events, rolling back...',
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
 * Người dùng cập nhật toàn bộ yêu cầu mượn phòng (header và các chi tiết)
 * Đầu vào: ycMuonPhongID (number), payload (object), nguoiThucHien (object)
 * Đầu ra: object chi tiết yêu cầu mượn phòng đã cập nhật
 */
const updateYeuCauMuonPhongByUser = async (
  ycMuonPhongID,
  payload,
  nguoiThucHien
) => {
  const { ghiChuChungYc, chiTietYeuCau, ghiChuPhanHoiChoCSVC } = payload;

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

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
    if (yeuCauHeader.NguoiYeuCauID !== nguoiThucHien.nguoiDungID) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Bạn không có quyền cập nhật yêu cầu này.'
      );
    }

    // 1. Cập nhật YeuCauMuonPhong (Header) nếu có
    if (ghiChuChungYc !== undefined) {
      await yeuCauMuonPhongRepository.updateYeuCauMuonPhongHeaderInfo(
        ycMuonPhongID,
        { ghiChuChungYc },
        transaction
      );
    }

    // 2. Lấy tất cả chi tiết cũ từ DB
    const chiTietCu = await yeuCauMuonPhongRepository.getAllChiTietByHeaderID(
      ycMuonPhongID,
      transaction
    );
    const chiTietCuMap = new Map(
      chiTietCu.map((item) => [item.YcMuonPhongCtID, item])
    );
    const chiTietMoiIDs = new Set(
      chiTietYeuCau.map((item) => item.ycMuonPhongCtID).filter((id) => id)
    );

    // 3. Xác định các chi tiết cần xóa
    const chiTietCanXoaIDs = [];
    for (const [id, itemCu] of chiTietCuMap.entries()) {
      if (!chiTietMoiIDs.has(id)) {
        // Chỉ xóa nếu nó đang ở trạng thái cho phép xóa (chờ duyệt, yc chỉnh sửa)
        const trangThaiChoPhepXoa = [
          MaTrangThaiYeuCauPhong.YCCPCT_CHO_DUYET,
          MaTrangThaiYeuCauPhong.CSVC_YEU_CAU_CHINH_SUA_CT,
        ];
        if (trangThaiChoPhepXoa.includes(itemCu.MaTrangThai)) {
          // So sánh MÃ với MÃ
          chiTietCanXoaIDs.push(id);
        } else {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Không thể xóa hạng mục ID ${id} vì đã được CSVC xử lý.`
          );
        }
      }
    }
    if (chiTietCanXoaIDs.length > 0) {
      await yeuCauMuonPhongRepository.deleteYcMuonPhongChiTietByIds(
        chiTietCanXoaIDs,
        transaction
      );
    }

    const trangThaiChoDuyetID =
      await suKienRepository.getTrangThaiIDByMaGeneric(
        MaTrangThaiYeuCauPhong.YCCPCT_CHO_DUYET,
        'TrangThaiYeuCauPhong',
        'TrangThaiYcpID',
        'MaTrangThai',

        transaction
      );

    // 4. Lặp qua payload để cập nhật hoặc tạo mới
    for (const detail of chiTietYeuCau) {
      if (detail.ycMuonPhongCtID && chiTietCuMap.has(detail.ycMuonPhongCtID)) {
        // Cập nhật chi tiết cũ
        const itemCu = chiTietCuMap.get(detail.ycMuonPhongCtID);
        logger.debug(
          `Updating existing detail ID ${detail.ycMuonPhongCtID} with new data: ${JSON.stringify(
            detail
          )}`
        );
        logger.debug('itemCu:', itemCu);
        const trangThaiChoPhepSua = [
          MaTrangThaiYeuCauPhong.YCCPCT_CHO_DUYET,
          MaTrangThaiYeuCauPhong.CSVC_YEU_CAU_CHINH_SUA_CT,
        ];
        if (!trangThaiChoPhepSua.includes(itemCu.MaTrangThai)) {
          // So sánh MÃ với MÃ
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Không thể sửa hạng mục ID ${detail.ycMuonPhongCtID} vì đã được CSVC xử lý.`
          );
        }
        await yeuCauMuonPhongRepository.updateYcMuonPhongChiTietRecord(
          detail.ycMuonPhongCtID,
          { ...detail, trangThaiCtIDMoi: trangThaiChoDuyetID },
          transaction
        );
      } else {
        // Tạo chi tiết mới
        await yeuCauMuonPhongRepository.createYcMuonPhongDetail(
          { ...detail, ycMuonPhongID, trangThaiCtID: trangThaiChoDuyetID },
          transaction
        );
      }
    }

    // 5. Cập nhật lại trạng thái chung của Yêu cầu Header
    // (Logic này có thể phức tạp, tạm thời chuyển nó về CHO_XỬ_LÝ nếu nó đang ở trạng thái cần chỉnh sửa)
    const trangThaiHeaderChoXuLyID =
      await suKienRepository.getTrangThaiIDByMaGeneric(
        MaTrangThaiYeuCauPhong.YCCP_CHO_XU_LY,
        'TrangThaiYeuCauPhong',
        'TrangThaiYcpID',
        'MaTrangThai',

        transaction
      );
    await yeuCauMuonPhongRepository.updateYeuCauMuonPhongHeaderStatus(
      ycMuonPhongID,
      trangThaiHeaderChoXuLyID,
      nguoiThucHien.nguoiDungID,
      transaction
    );

    await transaction.commit();

    // Gửi thông báo cho CSVC (nếu cần)
    if (ghiChuPhanHoiChoCSVC) {
      const usersCSVC = await authRepository.findUsersByRoleMa(
        MaVaiTro.QUAN_LY_CSVC
      );
      const suKienInfo = await suKienRepository.getSuKienDetailById(
        yeuCauHeader.SuKienID
      );
      if (usersCSVC && usersCSVC.length > 0 && suKienInfo) {
        usersCSVC.forEach((userCSVC) => {
          thongBaoService
            .createThongBao({
              NguoiNhanID: userCSVC.NguoiDungID,
              NoiDungTB: `Người dùng đã cập nhật yêu cầu mượn phòng cho sự kiện "[${suKienInfo.tenSK}]" và gửi phản hồi: ${ghiChuPhanHoiChoCSVC}`,
              DuongDanTB: `/admin/yeu-cau-phong/${ycMuonPhongID}`,
              YcLienQuanID: ycMuonPhongID,
              LoaiYcLienQuan: 'YEUCAUMUONPHONG',
              LoaiThongBao: LoaiThongBao.YC_PHONG_DA_CHINH_SUA_CHO_CSVC,
            })
            .catch((err) =>
              logger.error(
                'Failed to send YC_PHONG_DA_CHINH_SUA_CHO_CSVC notification:',
                err
              )
            );
        });
      }
    }

    return yeuCauMuonPhongRepository.getYeuCauMuonPhongDetailById(
      ycMuonPhongID
    );
  } catch (error) {
    // rollback transaction if needed
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rbErr) {
        logger.error('Error rolling back transaction:', rbErr);
      }
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Cập nhật yêu cầu thất bại.'
    );
  }
};

export const yeuCauMuonPhongService = {
  getYeuCauMuonPhongs,
  getYeuCauMuonPhongDetail,
  createYeuCauMuonPhong,
  xuLyChiTietYeuCau,
  huyYeuCauMuonPhongByUser,
  sendRemindersForOverdueCSVCProcessing,
  autoCancelOverdueRoomAssignmentEvents,
  updateYeuCauMuonPhongByUser,
};
