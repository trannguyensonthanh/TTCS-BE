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
  // Có thể thêm logic kiểm tra quyền xem sự kiện ở đây nếu cần
  // (ví dụ: nếu sự kiện không công khai, người dùng hiện tại có nằm trong danh sách mời/đơn vị tham gia không)
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
    // Sử dụng enum
    if (suKienHienTai.NguoiTaoID !== nguoiThucHien.nguoiDungID) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Bạn không phải là người tạo sự kiện này để thực hiện hành động tự hủy.'
      );
    }
    if (suKienHienTai.MaTrangThaiHienTai !== MaTrangThaiSK.CHO_DUYET_BGH) {
      // Sử dụng enum
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Không thể tự hủy sự kiện khi đang ở trạng thái "${suKienHienTai.MaTrangThaiHienTai}". Chỉ có thể tự hủy khi đang "${MaTrangThaiSK.CHO_DUYET_BGH}".`
      );
    }
    if (!lyDo) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Cần cung cấp lý do khi tự hủy sự kiện.'
      );
    }
  } else {
    // Ví dụ kiểm tra quyền admin
    const userRoles = await authRepository.getVaiTroChucNangByNguoiDungID(
      nguoiThucHien.nguoiDungID
    ); // Giả sử hàm này tồn tại trong authRepository
    const isAdmin = userRoles.some(
      (r) => r.maVaiTro === MaVaiTro.ADMIN_HE_THONG
    ); // Sử dụng enum
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
  const limit = parseInt(params.limit) || 9; // Default limit cho public có thể khác
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
    // Lỗi ở đây có thể do sự kiện không tồn tại HOẶC không công khai
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Sự kiện không tồn tại hoặc không được phép truy cập công khai.'
    );
  }
  // Có thể lược bớt một số thông tin nhạy cảm khỏi 'suKien' trước khi trả về nếu cần
  // Ví dụ: không trả về nguoiDuyetBGH, lyDoTuChoiBGH cho public API
  // const publicDetail = { ...suKien };
  // delete publicDetail.nguoiDuyetBGH;
  // delete publicDetail.lyDoTuChoiBGH;
  // return publicDetail;
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
    suKienDataToCreate.loaiSuKienID = null; // Hoặc gán một loại mặc định nếu có
  }

  // 2. Lấy ID trạng thái ban đầu
  const trangThaiBanDauID = await suKienRepository.getTrangThaiSkIDByMa(
    MaTrangThaiSK.CHO_DUYET_BGH
  );
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
    tgBatDauThucTe: null, // Mặc định khi mới tạo
    tgKetThucThucTe: null, // Mặc định khi mới tạo
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

    // Truyền transaction vào các hàm repository
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

    // Sau khi commit thành công, lấy lại thông tin chi tiết đầy đủ để trả về
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
    ); // Cần tạo hàm này
    if (usersWithBGHRole && usersWithBGHRole.length > 0) {
      usersWithBGHRole.forEach((userBGH) => {
        thongBaoService
          .createThongBao({
            NguoiNhanID: userBGH.NguoiDungID, // Giả sử hàm findUsersByRoleMa trả về mảng user có NguoiDungID
            NoiDungTB: `Có sự kiện mới "[${chiTietSuKienVuaTao.tenSK}]" đang chờ Ban Giám Hiệu duyệt.`,
            DuongDanTB: `/admin/su-kien-cho-duyet/${chiTietSuKienVuaTao.suKienID}`, // Ví dụ link admin
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
    if (transaction && transaction.rolledBack === false && transaction.active) {
      // Kiểm tra trạng thái transaction trước khi rollback
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

const updateSuKienService = async (suKienID, updateBody, nguoiThucHienID) => {
  const suKienHienTai = await suKienRepository.getSuKienDetailById(suKienID);
  if (!suKienHienTai) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Sự kiện không tồn tại.');
  }
  // Kiểm tra quyền sửa (ví dụ: chỉ người tạo hoặc admin)
  if (
    suKienHienTai.nguoiTao.nguoiDungID !==
    nguoiThucHienID /* && !isAdmin(nguoiThucHienID) */
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Bạn không có quyền sửa sự kiện này.'
    );
  }
  // Kiểm tra trạng thái có cho phép sửa không (ví dụ: không cho sửa khi đã hoàn thành/hủy)
  // ...

  // Validate LoaiSuKienID nếu được cập nhật
  if (
    updateBody.loaiSuKienID &&
    updateBody.loaiSuKienID !== suKienHienTai.loaiSuKien?.loaiSuKienID
  ) {
    const loaiSK = await loaiSuKienRepository.getLoaiSKById(
      updateBody.loaiSuKienID
    );
    if (!loaiSK || !loaiSK.IsActive) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Loại sự kiện mới không hợp lệ hoặc không hoạt động.'
      );
    }
  }

  const updatedSuKienRaw = await suKienRepository.updateSuKienById(
    suKienID,
    updateBody
  );
  if (!updatedSuKienRaw) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Cập nhật sự kiện thất bại.'
    );
  }
  // Lấy lại thông tin chi tiết đầy đủ
  return suKienRepository.getSuKienDetailById(updatedSuKienRaw.SuKienID);
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

  if (suKien.MaTrangThaiHienTaiSK !== MaTrangThaiSK.CHO_DUYET_BGH) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Sự kiện không ở trạng thái "Chờ duyệt BGH". Trạng thái hiện tại: ${suKien.MaTrangThaiHienTaiSK}`
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
    payload.ghiChuBGH // Sẽ không lưu nếu không có cột GhiChuBGH
    // Không có LyDoTuChoi khi duyệt
  );

  const updatedSuKien = await suKienRepository.getSuKienDetailById(suKienID); // Lấy chi tiết để có TenSK

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
        DuongDanTB: `/quan-ly-su-kien/${suKienID}/chi-tiet`, // Ví dụ link frontend
        SkLienQuanID: suKienID,
        LoaiThongBao: LoaiThongBao.SU_KIEN_DA_DUYET_BGH,
      })
      .catch((err) =>
        logger.error('Failed to send DA_DUYET_BGH notification:', err)
      ); // Bắt lỗi để không ảnh hưởng luồng chính
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

  if (suKien.MaTrangThaiHienTaiSK !== MaTrangThaiSK.CHO_DUYET_BGH) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Sự kiện không ở trạng thái "Chờ duyệt BGH". Trạng thái hiện tại: ${suKien.MaTrangThaiHienTaiSK}`
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
    null, // Không có ghi chú khi duyệt
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
 * Lấy danh sách sự kiện đủ điều kiện để tạo yêu cầu phòng
 * @param {object} params - { nguoiTaoID, donViChuTriID, searchTerm, page, limit }
 * @param {object} currentUser - Người dùng hiện tại (để có thể lọc theo đơn vị của họ nếu cần)
 * @returns {Promise<PaginatedResponse<SuKienForSelectResponse>>}
 */
const getSuKiensForYeuCauPhongSelect = async (params, currentUser) => {
  let queryParams = { ...params };
  // Logic phân quyền có thể được thêm ở đây nếu CBTC chỉ được chọn sự kiện của họ/đơn vị họ
  // Ví dụ:
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
    // Thêm logic lọc theo donViChuTriID của CBTC nếu cần
  }

  const { items, totalItems } =
    await suKienRepository.getSuKienForYeuCauPhongSelect(queryParams);
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 20;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items,
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
};
