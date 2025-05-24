// src/modules/yeuCauHuySK/yeuCauHuySK.service.js
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
// import { authRepository } from '../auth/auth.repository.js'; // Nếu cần kiểm tra vai trò admin

/**
 * Tạo yêu cầu hủy sự kiện
 * @param {number} suKienID
 * @param {string} lyDoHuy
 * @param {object} nguoiYeuCau - Thông tin người dùng thực hiện (từ req.user)
 * @returns {Promise<object>} Thông tin sự kiện đã được cập nhật trạng thái
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
    // Nếu cần chặt chẽ hơn, kiểm tra vai trò ADMIN ở đây
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
  const trangThaiYcHuySkID_ChoDuyet =
    await yeuCauHuySKRepository.getTrangThaiIDByMa(
      MaTrangThaiYeuCauHuySK.CHO_DUYET_HUY_BGH,
      'TrangThaiYeuCauHuySK',
      'TrangThaiYcHuySkID',
      'MaTrangThai'
    );
  if (!trangThaiYcHuySkID_ChoDuyet) {
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
    trangThaiYcHuySkID_ChoDuyet
  );

  // Cập nhật trạng thái của SuKien thành "Chờ duyệt hủy sau duyệt"
  const trangThaiSK_ChoDuyetHuy =
    await yeuCauHuySKRepository.getTrangThaiIDByMa(
      MaTrangThaiSK.CHO_DUYET_HUY_SAU_DUYET,
      'TrangThaiSK',
      'TrangThaiSkID',
      'MaTrangThai'
    );
  if (!trangThaiSK_ChoDuyetHuy) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Lỗi cấu hình: Không tìm thấy trạng thái sự kiện.'
    );
  }
  await yeuCauHuySKRepository.updateSuKienTrangThai(
    suKienID,
    trangThaiSK_ChoDuyetHuy
  );

  // Trả về thông tin chi tiết sự kiện đã được cập nhật trạng thái
  const suKienUpdated = await suKienRepository.getSuKienDetailById(suKienID); // Dùng lại hàm từ suKienRepository
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
          DuongDanTB: `/admin/yeu-cau-huy-cho-duyet/${suKienID}`, // Ví dụ link admin (ID của YeuCauHuySK có thể tốt hơn)
          SkLienQuanID: suKienID, // Hoặc YcHuySkID nếu có
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

export const yeuCauHuySKService = {
  createYeuCauHuySK,
};
