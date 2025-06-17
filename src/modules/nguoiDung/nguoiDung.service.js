// src/modules/nguoiDung/nguoiDung.service.js
import { nguoiDungRepository } from './nguoiDung.repository.js';
import { authRepository } from '../auth/auth.repository.js'; // Để lấy vai trò chức năng
import { hashPassword, comparePassword } from '../../utils/password.util.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import errorMessages from '../../constants/errorMessages.js';
import logger from '../../utils/logger.util.js';
import { vaiTroHeThongRepository } from '../vaiTroHeThong/vaiTroHeThong.repository.js';
import { donViRepository } from '../donVi/donVi.repository.js';
import { lopHocRepository } from '../lopHoc/lopHoc.repository.js';
import { getPool } from '../../utils/database.js';
import sql from 'mssql'; // Sử dụng mssql để quản lý transaction

const getNguoiDungList = async (params) => {
  const { items, totalItems } =
    await nguoiDungRepository.getNguoiDungListWithPagination(params);
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 10;
  const totalPages = Math.ceil(totalItems / limit);
  return {
    items, // items đã được map trong repository
    totalPages,
    currentPage: page,
    totalItems,
    pageSize: limit,
  };
};

/**
 * Lấy thông tin chi tiết hồ sơ của người dùng hiện tại.
 * @param {number} nguoiDungID
 * @returns {Promise<object>} UserProfileResponse
 * @throws {ApiError} Nếu không tìm thấy người dùng
 */
const getMyProfile = async (nguoiDungID) => {
  const nguoiDungVaTaiKhoan =
    await nguoiDungRepository.getNguoiDungAndTaiKhoanById(nguoiDungID);
  if (!nguoiDungVaTaiKhoan) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Không tìm thấy thông tin người dùng.'
    );
  }

  const nguoiDungFullResponse = {
    nguoiDungID: nguoiDungVaTaiKhoan.NguoiDungID,
    maDinhDanh: nguoiDungVaTaiKhoan.MaDinhDanh,
    hoTen: nguoiDungVaTaiKhoan.HoTen,
    email: nguoiDungVaTaiKhoan.Email,
    soDienThoai: nguoiDungVaTaiKhoan.SoDienThoai,
    anhDaiDien: nguoiDungVaTaiKhoan.AnhDaiDien,
    ngayTao: new Date(nguoiDungVaTaiKhoan.NgayTao).toISOString(),
    isActive: nguoiDungVaTaiKhoan.IsActive,
  };

  let thongTinSvChiTiet = null;
  const svData =
    await nguoiDungRepository.getThongTinSinhVienByNguoiDungID(nguoiDungID);
  if (svData) {
    thongTinSvChiTiet = {
      maSinhVien: nguoiDungFullResponse.maDinhDanh,
      lop: svData.lop,
      nganhHoc: svData.nganhHoc,
      chuyenNganh: svData.chuyenNganh,
      khoaQuanLy: svData.khoaQuanLy,
      khoaHoc: svData.khoaHoc,
      heDaoTao: svData.heDaoTao,
      ngayNhapHoc: svData.ngayNhapHoc,
      trangThaiHocTap: svData.trangThaiHocTap,
    };
  }

  let thongTinGvChiTiet = null;
  const gvData =
    await nguoiDungRepository.getThongTinGiangVienByNguoiDungID(nguoiDungID);
  if (gvData) {
    thongTinGvChiTiet = {
      maGiangVien: nguoiDungFullResponse.maDinhDanh,
      donViCongTac: gvData.donViCongTac,
      hocVi: gvData.hocVi,
      hocHam: gvData.hocHam,
      chucDanhGD: gvData.chucDanhGD,
      chuyenMonChinh: gvData.chuyenMonChinh,
    };
  }

  // Lấy danh sách vai trò chức năng
  const vaiTroChucNang =
    await authRepository.getVaiTroChucNangByNguoiDungID(nguoiDungID);
  console.log(`Vai trò chức năng: ${JSON.stringify(vaiTroChucNang)}`);
  const formattedVaiTroChucNang = vaiTroChucNang.map((vt) => ({
    ganVaiTroID: vt.ganVaiTroID,
    vaiTroID: vt.vaiTroID,
    maVaiTro: vt.maVaiTro,
    tenVaiTro: vt.tenVaiTro,
    donViThucThi: vt.donViThucThi,
  }));
  console.log(`Vai trò chức năng: ${JSON.stringify(formattedVaiTroChucNang)}`);
  // Lấy thông tin tài khoản
  const taiKhoan =
    await nguoiDungRepository.getTaiKhoanInfoByNguoiDungID(nguoiDungID);

  return {
    nguoiDung: nguoiDungFullResponse,
    thongTinSinhVien: thongTinSvChiTiet || null,
    thongTinGiangVien: thongTinGvChiTiet || null,
    vaiTroChucNang: formattedVaiTroChucNang,
    taiKhoan: taiKhoan || null,
  };
};

/**
 * Đổi mật khẩu cho người dùng hiện tại.
 * @param {number} nguoiDungID
 * @param {string} matKhauHienTai
 * @param {string} matKhauMoi
 * @returns {Promise<{message: string}>}
 * @throws {ApiError} Nếu tài khoản không tồn tại hoặc mật khẩu hiện tại sai
 */
const changeMyPassword = async (nguoiDungID, matKhauHienTai, matKhauMoi) => {
  const taiKhoan =
    await nguoiDungRepository.getNguoiDungAndTaiKhoanById(nguoiDungID);
  if (!taiKhoan) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Không tìm thấy tài khoản người dùng.'
    );
  }

  const isPasswordMatch = await comparePassword(
    matKhauHienTai,
    taiKhoan.MatKhauHash
  );
  if (!isPasswordMatch) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Mật khẩu hiện tại không chính xác.'
    );
  }
  const newMatKhauHash = await hashPassword(matKhauMoi);
  await nguoiDungRepository.updatePasswordByNguoiDungID(
    nguoiDungID,
    newMatKhauHash
  );

  logger.info(`Password changed successfully for NguoiDungID: ${nguoiDungID}`);

  return { message: 'Đổi mật khẩu thành công.' };
};

/**
 * Lấy chi tiết người dùng cho admin theo ID.
 * @param {number} targetNguoiDungID
 * @returns {Promise<object>} UserProfileResponse
 */
const getNguoiDungDetailForAdmin = async (targetNguoiDungID) => {
  return getMyProfile(targetNguoiDungID);
};

/**
 * Admin tạo mới người dùng, tài khoản, hồ sơ và gán vai trò.
 * @param {object} payload - CreateNguoiDungPayload
 * @returns {Promise<object>} UserProfileResponse
 * @throws {ApiError} Nếu dữ liệu không hợp lệ hoặc lỗi hệ thống
 */
const createNguoiDungByAdmin = async (payload) => {
  const {
    hoTen,
    email,
    maDinhDanh,
    soDienThoai,
    anhDaiDien,
    isActiveNguoiDung = true,
    matKhau,
    trangThaiTk = 'Active',
    thongTinSinhVien,
    thongTinGiangVien,
    vaiTroChucNang,
    ngaySinh,
  } = payload;

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    logger.debug('Transaction started for adminCreateNguoiDung');

    // 1. Kiểm tra Email và MaDinhDanh (là MaSV/MaGV/MaNV) đã tồn tại chưa
    if (!maDinhDanh) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Mã định danh (Mã SV/GV/NV) là bắt buộc.'
      );
    }
    const existingUsers =
      await nguoiDungRepository.checkNguoiDungExistsByEmailOrMaDinhDanh(
        email,
        maDinhDanh,
        null,
        transaction
      );
    if (existingUsers && existingUsers.length > 0) {
      existingUsers.forEach((user) => {
        if (user.Email.toLowerCase() === email.toLowerCase()) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Email "${email}" đã được sử dụng.`
          );
        }
        if (
          user.MaDinhDanh &&
          user.MaDinhDanh.toLowerCase() === maDinhDanh.toLowerCase()
        ) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Mã định danh "${maDinhDanh}" đã tồn tại.`
          );
        }
      });
    }

    // 2. Validate các FKs (LopID, DonViCongTacID, VaiTroID, DonViID cho vai trò)
    if (thongTinSinhVien && thongTinSinhVien.lopID) {
      const lop = await lopHocRepository.getLopHocById(
        thongTinSinhVien.lopID,
        transaction
      ); // Cần hàm này
      if (!lop)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Lớp ID ${thongTinSinhVien.lopID} không tồn tại.`
        );
      logger.info(
        `TODO: Validate LopID ${thongTinSinhVien.lopID} in createNguoiDungByAdmin`
      );
    }
    if (thongTinGiangVien && thongTinGiangVien.donViCongTacID) {
      const donVi = await donViRepository.getDonViById(
        thongTinGiangVien.donViCongTacID,
        transaction
      ); // Cần hàm này
      if (!donVi)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Đơn vị công tác ID ${thongTinGiangVien.donViCongTacID} không tồn tại.`
        );
      logger.info(
        `TODO: Validate DonViCongTacID ${thongTinGiangVien.donViCongTacID} in createNguoiDungByAdmin`
      );
    }
    if (vaiTroChucNang && vaiTroChucNang.length > 0) {
      for (const vt of vaiTroChucNang) {
        const vaiTro = await vaiTroHeThongRepository.getVaiTroHeThongById(
          vt.vaiTroID,
          transaction
        ); // Cần hàm này
        if (!vaiTro)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Vai trò ID ${vt.vaiTroID} không tồn tại.`
          );
        if (vt.donViID) {
          const donViVT = await donViRepository.getDonViById(
            vt.donViID,
            transaction
          );
          if (!donViVT)
            throw new ApiError(
              httpStatus.BAD_REQUEST,
              `Đơn vị thực thi ID ${vt.donViID} cho vai trò không tồn tại.`
            );
        }
        logger.info(
          `TODO: Validate VaiTroID ${vt.vaiTroID} and DonViID ${vt.donViID} in createNguoiDungByAdmin`
        );
      }
    }
    // 3. Tạo NguoiDung
    const nguoiDungID = await nguoiDungRepository.createNguoiDungRecord(
      {
        hoTen,
        email,
        maDinhDanh,
        soDienThoai,
        anhDaiDien,
        isActiveNguoiDung,
        ngaySinh,
      },
      transaction
    );
    logger.debug(`NguoiDung created with ID: ${nguoiDungID}`);

    // 4. Tạo TaiKhoan
    const hashedPassword = await hashPassword(matKhau);
    await nguoiDungRepository.createTaiKhoanRecord(
      { nguoiDungID, matKhauHash: hashedPassword, trangThaiTk },
      transaction
    );
    logger.debug(`TaiKhoan created for NguoiDungID: ${nguoiDungID}`);

    // 5. Tạo ThongTinSinhVien
    if (thongTinSinhVien) {
      await nguoiDungRepository.createThongTinSinhVienRecord(
        nguoiDungID,
        thongTinSinhVien,
        transaction
      );
      logger.debug(`ThongTinSinhVien created for NguoiDungID: ${nguoiDungID}`);
    }

    // 6. Tạo ThongTinGiangVien
    if (thongTinGiangVien) {
      await nguoiDungRepository.createThongTinGiangVienRecord(
        nguoiDungID,
        thongTinGiangVien,
        transaction
      );
      logger.debug(`ThongTinGiangVien created for NguoiDungID: ${nguoiDungID}`);
    }

    // 7. Gán VaiTroChucNang
    if (vaiTroChucNang && vaiTroChucNang.length > 0) {
      for (const vt of vaiTroChucNang) {
        await nguoiDungRepository.assignVaiTroChucNangToNguoiDung(
          nguoiDungID,
          vt,
          transaction
        );
      }
      logger.debug(`Functional roles assigned for NguoiDungID: ${nguoiDungID}`);
    }

    await transaction.commit();
    logger.info(
      `Transaction committed for adminCreateNguoiDung, NguoiDungID: ${nguoiDungID}`
    );

    // 8. Trả về UserProfileResponse
    return getMyProfile(nguoiDungID); // Dùng lại hàm getMyProfile để lấy thông tin đầy đủ
  } catch (error) {
    logger.error(
      'Error during adminCreateNguoiDung transaction, rolling back...',
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
      'Tạo người dùng thất bại do lỗi hệ thống.'
    );
  }
};

/**
 * Admin cập nhật thông tin người dùng.
 * @param {number} nguoiDungId
 * @param {object} updatePayload - UpdateNguoiDungAdminPayload
 * @returns {Promise<object>} UserProfileResponse
 * @throws {ApiError} Nếu dữ liệu không hợp lệ hoặc lỗi hệ thống
 */
const updateNguoiDungByAdmin = async (nguoiDungId, updatePayload) => {
  const currentUserData =
    await nguoiDungRepository.getNguoiDungAndTaiKhoanById(nguoiDungId);
  if (!currentUserData) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Người dùng không tồn tại.');
  }

  const {
    thongTinSinhVien,
    thongTinGiangVien,
    matKhau,
    email,
    maDinhDanh,
    ...nguoiDungUpdateData // Các trường còn lại cho bảng NguoiDung
  } = updatePayload;

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    logger.debug(
      `Transaction started for adminUpdateNguoiDung ID: ${nguoiDungId}`
    );

    const taiKhoanUpdateData = { trangThaiTk: updatePayload.trangThaiTk };
    console.log(
      'email.toLowerCase() !== currentUserData.Email.toLowerCase()',
      email,
      currentUserData.Email
    );
    // 1. Kiểm tra unique cho Email và MaDinhDanh nếu thay đổi
    if (email && email.toLowerCase() !== currentUserData.Email.toLowerCase()) {
      const existingEmail =
        await nguoiDungRepository.checkNguoiDungExistsByEmailOrMaDinhDanh(
          email,
          null,
          nguoiDungId,
          transaction
        );
      if (
        existingEmail &&
        existingEmail.find((u) => u.Email.toLowerCase() === email.toLowerCase())
      ) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Email "${email}" đã được sử dụng.`
        );
      }
      nguoiDungUpdateData.email = email;
    }
    if (
      maDinhDanh &&
      maDinhDanh.toLowerCase() !==
        (currentUserData.MaDinhDanh || '').toLowerCase()
    ) {
      const existingMaDinhDanh =
        await nguoiDungRepository.checkNguoiDungExistsByEmailOrMaDinhDanh(
          null,
          maDinhDanh,
          nguoiDungId,
          transaction
        );
      if (
        existingMaDinhDanh &&
        existingMaDinhDanh.find(
          (u) =>
            u.MaDinhDanh &&
            u.MaDinhDanh.toLowerCase() === maDinhDanh.toLowerCase()
        )
      ) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Mã định danh "${maDinhDanh}" đã tồn tại.`
        );
      }
      nguoiDungUpdateData.maDinhDanh = maDinhDanh;
    }

    // 2. Validate các FKs trong thongTinSinhVien/thongTinGiangVien nếu được cập nhật
    if (thongTinSinhVien && typeof thongTinSinhVien === 'object') {
      if (thongTinSinhVien.lopID) {
        const lop = await lopHocRepository.getLopHocById(
          thongTinSinhVien.lopID,
          transaction
        );
        if (!lop) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Lớp ID ${thongTinSinhVien.lopID} không tồn tại.`
          );
        }
      }
    }
    if (thongTinGiangVien && typeof thongTinGiangVien === 'object') {
      if (thongTinGiangVien.donViCongTacID) {
        const donVi = await donViRepository.getDonViById(
          thongTinGiangVien.donViCongTacID,
          transaction
        );
        if (!donVi) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Đơn vị công tác ID ${thongTinGiangVien.donViCongTacID} không tồn tại.`
          );
        }
      }
    }

    // 3. Xử lý mật khẩu nếu được cung cấp
    if (matKhau) {
      taiKhoanUpdateData.matKhauHash = await hashPassword(matKhau);
    }

    // Cập nhật NguoiDung
    if (Object.keys(nguoiDungUpdateData).length > 0) {
      await nguoiDungRepository.updateNguoiDungRecord(
        nguoiDungId,
        nguoiDungUpdateData,
        transaction
      );
    }
    // Cập nhật TaiKhoan
    if (
      Object.keys(taiKhoanUpdateData).length > 0 &&
      (taiKhoanUpdateData.trangThaiTk || taiKhoanUpdateData.matKhauHash)
    ) {
      await nguoiDungRepository.updateTaiKhoanRecord(
        nguoiDungId,
        taiKhoanUpdateData,
        transaction
      );
    }
    // Cập nhật hoặc Xóa ThongTinSinhVien
    if (updatePayload.hasOwnProperty('thongTinSinhVien')) {
      await nguoiDungRepository.upsertOrDeleteThongTinSinhVien(
        nguoiDungId,
        thongTinSinhVien,
        transaction
      );
    }
    // Cập nhật hoặc Xóa ThongTinGiangVien
    if (updatePayload.hasOwnProperty('thongTinGiangVien')) {
      await nguoiDungRepository.upsertOrDeleteThongTinGiangVien(
        nguoiDungId,
        thongTinGiangVien,
        transaction
      );
    }

    await transaction.commit();
    logger.info(
      `Transaction committed for adminUpdateNguoiDung ID: ${nguoiDungId}`
    );

    return getMyProfile(nguoiDungId);
  } catch (error) {
    logger.error(
      `Error during adminUpdateNguoiDung transaction for ID: ${nguoiDungId}, rolling back...`,
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
      'Cập nhật người dùng thất bại do lỗi hệ thống.'
    );
  }
};

/**
 * Admin cập nhật trạng thái hoạt động của người dùng và/hoặc trạng thái tài khoản.
 * @param {number} nguoiDungId
 * @param {object} payload - UpdateUserAccountStatusPayload
 * @returns {Promise<object>} Thông tin người dùng sau khi cập nhật
 * @throws {ApiError} Nếu người dùng không tồn tại hoặc lỗi hệ thống
 */
const updateUserAccountStatusByAdmin = async (nguoiDungId, payload) => {
  const { isActiveNguoiDung, trangThaiTaiKhoan } = payload;

  const nguoiDung =
    await nguoiDungRepository.getNguoiDungAndTaiKhoanById(nguoiDungId);
  if (!nguoiDung) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Người dùng không tồn tại.');
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    logger.debug(
      `Transaction started for updateUserAccountStatus ID: ${nguoiDungId}`
    );

    if (isActiveNguoiDung !== undefined) {
      await nguoiDungRepository.updateNguoiDungRecord(
        nguoiDungId,
        { isActiveNguoiDung },
        transaction
      );
      logger.debug(`NguoiDung.IsActive updated for ID: ${nguoiDungId}`);
    }
    if (trangThaiTaiKhoan !== undefined) {
      await nguoiDungRepository.updateTaiKhoanRecord(
        nguoiDungId,
        { trangThaiTk: trangThaiTaiKhoan },
        transaction
      );
      logger.debug(`TaiKhoan.TrangThaiTk updated for ID: ${nguoiDungId}`);
    }

    await transaction.commit();
    logger.info(
      `Transaction committed for updateUserAccountStatus ID: ${nguoiDungId}`
    );

    // Lấy lại thông tin NguoiDung cơ bản để trả về
    const updatedNguoiDungInfo =
      await nguoiDungRepository.getNguoiDungAndTaiKhoanById(nguoiDungId);
    return {
      nguoiDungID: updatedNguoiDungInfo.NguoiDungID,
      maDinhDanh: updatedNguoiDungInfo.MaDinhDanh,
      hoTen: updatedNguoiDungInfo.HoTen,
      email: updatedNguoiDungInfo.Email,
      soDienThoai: updatedNguoiDungInfo.SoDienThoai,
      anhDaiDien: updatedNguoiDungInfo.AnhDaiDien,
      ngayTao: new Date(updatedNguoiDungInfo.NgayTao).toISOString(),
      isActive: updatedNguoiDungInfo.IsActive,
      trangThaiTaiKhoan: updatedNguoiDungInfo.TrangThaiTk, // Lấy từ TaiKhoan
    };
  } catch (error) {
    logger.error(
      `Error during updateUserAccountStatus transaction for ID: ${nguoiDungId}, rolling back...`,
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
      'Cập nhật trạng thái tài khoản người dùng thất bại.'
    );
  }
};

/**
 * Admin gán vai trò chức năng cho người dùng.
 * @param {number} nguoiDungId
 * @param {object} payload - AssignFunctionalRolePayload
 * @returns {Promise<object>} Bản ghi NguoiDung_VaiTro vừa tạo (đã map)
 * @throws {ApiError} Nếu dữ liệu không hợp lệ hoặc trùng lặp
 */
const assignFunctionalRoleToUser = async (nguoiDungId, payload) => {
  // 1. Kiểm tra NguoiDung có tồn tại không
  const nguoiDung =
    await nguoiDungRepository.getNguoiDungAndTaiKhoanById(nguoiDungId);
  if (!nguoiDung) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Người dùng không tồn tại.');
  }

  // 2. Kiểm tra VaiTroID có tồn tại không
  const vaiTro = await vaiTroHeThongRepository.getVaiTroHeThongById(
    payload.vaiTroID
  );
  if (!vaiTro) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Vai trò với ID "${payload.vaiTroID}" không tồn tại.`
    );
  }

  // 2.1. Ràng buộc nghiệp vụ: Giảng viên KHÔNG được gán các vai trò CLB, CSVC, CB tổ chức sự kiện
  const khongChoGV = ['TRUONG_CLB', 'QUAN_LY_CSVC', 'CB_TO_CHUC_SU_KIEN'];
  const khongChoSV = [
    'ADMIN_HE_THONG',
    'BGH_DUYET_SK_TRUONG',
    'QUAN_LY_CSVC',
    'BI_THU_DOAN',
    'CB_TO_CHUC_SU_KIEN',
    'TRUONG_KHOA',
  ];
  const khongChoNVKhac = ['BGH_DUYET_SK_TRUONG', 'BI_THU_DOAN'];
  // Kiểm tra loại người dùng
  const thongTinGV =
    await nguoiDungRepository.getThongTinGiangVienByNguoiDungID(nguoiDungId);
  const thongTinSV =
    await nguoiDungRepository.getThongTinSinhVienByNguoiDungID(nguoiDungId);
  if (thongTinGV && khongChoGV.includes(vaiTro.maVaiTro)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Giảng viên không thể được gán vai trò Trưởng CLB, Quản lý CSVC hoặc Cán bộ tổ chức sự kiện.'
    );
  }
  if (thongTinSV && khongChoSV.includes(vaiTro.maVaiTro)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Sinh viên không thể được gán các vai trò quản trị hệ thống, BGH, quản lý CSVC, bí thư đoàn, cán bộ tổ chức sự kiện, trưởng khoa.'
    );
  }
  if (!thongTinGV && !thongTinSV && khongChoNVKhac.includes(vaiTro.maVaiTro)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Nhân viên không thể được gán vai trò BGH duyệt sự kiện trường hoặc Bí thư đoàn.'
    );
  }

  // 3. Kiểm tra DonViID (nếu có) có tồn tại không
  if (payload.donViID) {
    const donVi = await donViRepository.getDonViById(payload.donViID);
    if (!donVi) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Đơn vị thực thi với ID "${payload.donViID}" không tồn tại.`
      );
    }
    if (vaiTro.maVaiTro === 'TRUONG_KHOA' && donVi.loaiDonVi !== 'KHOA') {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Vai trò TRƯỞNG KHOA chỉ có thể gán cho đơn vị loại KHOA.'
      );
    }
  }

  // 4. Xử lý NgayBatDau (nếu không có thì là ngày hiện tại)
  const ngayBatDauToSave = payload.ngayBatDau
    ? new Date(payload.ngayBatDau)
    : new Date();
  const ngayKetThucToSave = payload.ngayKetThuc
    ? new Date(payload.ngayKetThuc)
    : null;

  if (ngayKetThucToSave && ngayKetThucToSave < ngayBatDauToSave) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Ngày kết thúc không thể trước ngày bắt đầu.'
    );
  }

  // 5. Kiểm tra xem người dùng đã có vai trò nào còn hiệu lực chưa (chỉ cho phép 1 role duy nhất)
  const currentRoles =
    await nguoiDungRepository.getCurrentActiveRolesOfUser(nguoiDungId);
  if (currentRoles && currentRoles.length > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Mỗi cá nhân chỉ được gán 1 vai trò chức năng còn hiệu lực tại một thời điểm.'
    );
  }

  // 6. Kiểm tra xem gán vai trò này đã tồn tại và còn hiệu lực chưa (để tránh trùng lặp theo UNIQUE constraint)
  const isAlreadyAssignedAndActive =
    await nguoiDungRepository.checkExistingNguoiDungVaiTro(
      nguoiDungId,
      payload.vaiTroID,
      payload.donViID,
      ngayBatDauToSave // Truyền ngày bắt đầu để check UNIQUE theo (NguoiDungID, VaiTroID, DonViID, NgayBatDau)
    );
  if (isAlreadyAssignedAndActive) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Người dùng đã được gán vai trò này tại đơn vị này với ngày bắt đầu tương tự và vai trò đó vẫn còn hiệu lực.'
    );
  }

  const assignedRoleData =
    await nguoiDungRepository.assignVaiTroChucNangToNguoiDung(nguoiDungId, {
      ...payload,
      ngayBatDau: ngayBatDauToSave,
      ngayKetThuc: ngayKetThucToSave,
    });
  logger.info(
    `Functional role ${payload.vaiTroID} assigned to NguoiDungID: ${nguoiDungId}`
  );
  console.log(
    '-------------------------------->assignedRoleData',
    assignedRoleData
  );
  return {
    // ganVaiTroID: assignedRoleData.GanVaiTroID,
    // vaiTroID: vaiTro.vaiTroID,
    // maVaiTro: vaiTro.maVaiTro,
    // tenVaiTro: vaiTro.tenVaiTro,
    // donViThucThi: payload.donViID
    //   ? await donViRepository.getDonViById(payload.donViID).then((dv) =>
    //       dv
    //         ? {
    //             donViID: dv.donViID,
    //             tenDonVi: dv.tenDonVi,
    //             maDonVi: dv.maDonVi,
    //             loaiDonVi: dv.loaiDonVi,
    //           }
    //         : null
    //     )
    //   : null,
    // ngayBatDau: assignedRoleData.NgayBatDau
    //   ? new Date(assignedRoleData.NgayBatDau).toISOString().split('T')[0]
    //   : null,
    // ngayKetThuc: assignedRoleData.NgayKetThuc
    //   ? new Date(assignedRoleData.NgayKetThuc).toISOString().split('T')[0]
    //   : null,
    // ghi chú GanVT: assignedRoleData.GhiChuGanVT,
  };
};

/**
 * Admin cập nhật thông tin gán vai trò chức năng.
 * @param {number} ganVaiTroID
 * @param {object} payload - UpdateAssignedFunctionalRolePayload
 * @returns {Promise<object>} Bản ghi NguoiDung_VaiTro đã cập nhật (đã map)
 * @throws {ApiError} Nếu dữ liệu không hợp lệ hoặc lỗi hệ thống
 */
const updateAssignedFunctionalRole = async (ganVaiTroID, payload) => {
  const currentAssignment =
    await nguoiDungRepository.getNguoiDungVaiTroByGanID(ganVaiTroID);
  if (!currentAssignment) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Bản ghi gán vai trò không tồn tại.'
    );
  }

  const { donViID, ngayBatDau, ngayKetThuc, ghiChuGanVT } = payload;

  // Validate DonViID nếu được cung cấp và thay đổi
  if (donViID !== undefined && donViID !== currentAssignment.DonViID) {
    if (donViID !== null) {
      const donVi = await donViRepository.getDonViById(donViID);
      if (!donVi) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Đơn vị thực thi với ID "${donViID}" không tồn tại.`
        );
      }
      // Kiểm tra xem vai trò này có phù hợp với loại đơn vị mới không
      const vaiTro = await vaiTroHeThongRepository.getVaiTroHeThongById(
        currentAssignment.VaiTroID
      );
      if (
        vaiTro &&
        vaiTro.maVaiTro === 'TRUONG_KHOA' &&
        donVi.loaiDonVi !== 'KHOA'
      ) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Vai trò TRƯỞNG KHOA chỉ có thể gán cho đơn vị loại KHOA.'
        );
      }
    }
  }

  const ngayBatDauToSave = ngayBatDau
    ? new Date(ngayBatDau)
    : currentAssignment.NgayBatDau;
  const ngayKetThucToSave =
    ngayKetThuc !== undefined
      ? ngayKetThuc
        ? new Date(ngayKetThuc)
        : null
      : currentAssignment.NgayKetThuc;

  if (
    ngayKetThucToSave &&
    ngayBatDauToSave &&
    ngayKetThucToSave < ngayBatDauToSave
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Ngày kết thúc không thể trước ngày bắt đầu.'
    );
  }

  // Kiểm tra tính duy nhất nếu DonViID hoặc NgayBatDau thay đổi
  const finalDonViID =
    donViID !== undefined ? donViID : currentAssignment.DonViID;
  const finalNgayBatDau = ngayBatDau
    ? new Date(ngayBatDau)
    : new Date(currentAssignment.NgayBatDau);

  if (
    (donViID !== undefined && donViID !== currentAssignment.DonViID) ||
    (ngayBatDau &&
      new Date(ngayBatDau).getTime() !==
        new Date(currentAssignment.NgayBatDau).getTime())
  ) {
    const isDuplicate = await nguoiDungRepository.checkExistingNguoiDungVaiTro(
      currentAssignment.NguoiDungID,
      currentAssignment.VaiTroID,
      finalDonViID,
      finalNgayBatDau
    );
    // Phải loại trừ chính bản ghi đang sửa nếu checkExistingNguoiDungVaiTro không có tham số exclude
    // Hiện tại checkExistingNguoiDungVaiTro không có exclude nên nếu không có thay đổi key thì sẽ báo trùng chính nó
    // Cần sửa checkExistingNguoiDungVaiTro để nhận excludeGanVaiTroID
    // Tạm thời, nếu các key chính không đổi thì không cần check unique lại ở đây.
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const updatedAssignmentRaw =
      await nguoiDungRepository.updateNguoiDungVaiTroByGanID(
        ganVaiTroID,
        {
          donViID,
          ngayBatDau: ngayBatDauToSave,
          ngayKetThuc: ngayKetThucToSave,
          ghiChuGanVT,
        },
        transaction
      );
    await transaction.commit();
    logger.info(
      `NguoiDung_VaiTro record updated for GanVaiTroID: ${ganVaiTroID}`
    );

    if (!updatedAssignmentRaw) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Cập nhật gán vai trò thất bại.'
      );
    }

    // Lấy lại thông tin đầy đủ để trả về
    const vaiTroInfo = await vaiTroHeThongRepository.getVaiTroHeThongById(
      updatedAssignmentRaw.VaiTroID
    );
    const donViInfo = updatedAssignmentRaw.DonViID
      ? await donViRepository.getDonViById(updatedAssignmentRaw.DonViID)
      : null;

    return {
      ganVaiTroID: updatedAssignmentRaw.GanVaiTroID,
      vaiTroID: vaiTroInfo.vaiTroID,
      maVaiTro: vaiTroInfo.maVaiTro,
      tenVaiTro: vaiTroInfo.tenVaiTro,
      donViThucThi: donViInfo
        ? {
            donViID: donViInfo.donViID,
            tenDonVi: donViInfo.tenDonVi,
            maDonVi: donViInfo.maDonVi,
            loaiDonVi: donViInfo.loaiDonVi,
          }
        : null,
      ngayBatDau: updatedAssignmentRaw.NgayBatDau
        ? new Date(updatedAssignmentRaw.NgayBatDau).toISOString().split('T')[0]
        : null,
      ngayKetThuc: updatedAssignmentRaw.NgayKetThuc
        ? new Date(updatedAssignmentRaw.NgayKetThuc).toISOString().split('T')[0]
        : null,
      ghiChuGanVT: updatedAssignmentRaw.GhiChuGanVT,
    };
  } catch (error) {
    logger.error(
      `Error during updateAssignedFunctionalRole transaction for GanVaiTroID: ${ganVaiTroID}, rolling back...`,
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
      'Cập nhật gán vai trò thất bại.'
    );
  }
};

/**
 * Admin gỡ bỏ một vai trò chức năng đã gán cho người dùng.
 * @param {number} ganVaiTroID
 * @returns {Promise<void>}
 * @throws {ApiError} Nếu bản ghi không tồn tại
 */
const removeAssignedFunctionalRole = async (ganVaiTroID) => {
  // 1. Kiểm tra bản ghi gán vai trò có tồn tại không
  const existingAssignment =
    await nguoiDungRepository.getNguoiDungVaiTroByGanID(ganVaiTroID);
  if (!existingAssignment) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Bản ghi gán vai trò không tồn tại.'
    );
  }

  const rowsAffected =
    await nguoiDungRepository.deleteNguoiDungVaiTroByGanID(ganVaiTroID);

  if (rowsAffected === 0) {
    logger.warn(
      `Attempted to delete NguoiDung_VaiTro GanVaiTroID: ${ganVaiTroID} but no rows were affected.`
    );
  }
  logger.info(
    `NguoiDung_VaiTro record deleted for GanVaiTroID: ${ganVaiTroID}`
  );
};

/**
 * Import hàng loạt người dùng.
 * @param {Array<object>} usersToImport - Danh sách người dùng cần import
 * @returns {Promise<object>} Kết quả import (tổng số, thành công, lỗi, chi tiết)
 */
const importUsersBatch = async (usersToImport) => {
  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalError = 0;
  const results = [];
  const pool = await getPool();

  for (const userRow of usersToImport) {
    totalProcessed++;
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();
      logger.debug(`Transaction started for importing user: ${userRow.email}`);

      // 1. Kiểm tra Email và MaDinhDanh (là MaSV/GV/MaNV) đã tồn tại chưa
      const existingUsers =
        await nguoiDungRepository.checkNguoiDungExistsByEmailOrMaDinhDanh(
          userRow.email,
          userRow.maDinhDanh,
          null,
          transaction
        ); // Thêm transaction
      if (existingUsers && existingUsers.length > 0) {
        let conflictField = '';
        if (
          existingUsers.some(
            (u) => u.Email.toLowerCase() === userRow.email.toLowerCase()
          )
        )
          conflictField = 'Email';
        else if (
          existingUsers.some(
            (u) =>
              u.MaDinhDanh &&
              u.MaDinhDanh.toLowerCase() === userRow.maDinhDanh.toLowerCase()
          )
        )
          conflictField = 'Mã định danh';

        throw new Error(
          `${conflictField} "${conflictField === 'Email' ? userRow.email : userRow.maDinhDanh}" đã tồn tại.`
        );
      }

      // 2. Tạo NguoiDung
      const nguoiDungID = await nguoiDungRepository.createNguoiDungRecord(
        {
          hoTen: userRow.hoTen,
          email: userRow.email,
          maDinhDanh: userRow.maDinhDanh,
          soDienThoai: userRow.soDienThoai,
          anhDaiDien: null,
          isActiveNguoiDung: true,
          ngaySinh: userRow.ngaySinh ? new Date(userRow.ngaySinh) : null,
        },
        transaction
      );

      // 3. Tạo TaiKhoan
      const hashedPassword = await hashPassword(userRow.matKhau);
      await nguoiDungRepository.createTaiKhoanRecord(
        {
          nguoiDungID,
          matKhauHash: hashedPassword,
          // Salt đã được bỏ
          trangThaiTk: 'Active',
        },
        transaction
      );

      // 4. Tạo ThongTinSinhVien hoặc ThongTinGiangVien
      if (userRow.loaiNguoiDung === 'SINH_VIEN') {
        if (!userRow.donViID)
          throw new Error('LopID là bắt buộc cho sinh viên.');
        const lop = await lopHocRepository.getLopHocById(
          userRow.donViID,
          transaction
        ); // Cần hàm này có transaction
        if (!lop) throw new Error(`Lớp ID ${userRow.donViID} không tồn tại.`);
        logger.info(
          `TODO: Validate LopID ${userRow.donViID} in import for SV ${userRow.maDinhDanh}`
        );

        await nguoiDungRepository.createThongTinSinhVienRecord(
          nguoiDungID,
          {
            lopID: userRow.donViID,
            khoaHoc: userRow.khoaHoc,
            heDaoTao: userRow.heDaoTao,
            ngayNhapHoc: userRow.ngayNhapHoc,
            trangThaiHocTap: userRow.trangThaiHocTap || 'Đang học',
          },
          transaction
        );
      } else if (userRow.loaiNguoiDung === 'GIANG_VIEN') {
        if (!userRow.donViID)
          throw new Error('DonViCongTacID là bắt buộc cho giảng viên.');
        // const donViCongTac = await donViRepository.getDonViById(userRow.donViID, transaction); // Cần hàm này có transaction
        // if (!donViCongTac) throw new Error(`Đơn vị công tác ID ${userRow.donViID} không tồn tại.`);
        logger.info(
          `TODO: Validate DonViCongTacID ${userRow.donViID} in import for GV ${userRow.maDinhDanh}`
        );

        await nguoiDungRepository.createThongTinGiangVienRecord(
          nguoiDungID,
          {
            donViCongTacID: userRow.donViID,
            hocVi: userRow.hocVi,
            hocHam: userRow.hocHam,
            chucDanhGD: userRow.chucDanhGD,
            chuyenMonChinh: userRow.chuyenMonChinh,
          },
          transaction
        );
      }

      await transaction.commit();
      logger.info(
        `User imported successfully: ${userRow.email} (NguoiDungID: ${nguoiDungID})`
      );
      results.push({ email: userRow.email, status: 'success', nguoiDungID });
      totalSuccess++;
    } catch (error) {
      logger.error(`Error importing user ${userRow.email}:`, error.message);
      if (transaction) {
        try {
          await transaction.rollback();
          logger.info(`Transaction rolled back for user: ${userRow.email}`);
        } catch (rbError) {
          logger.error(
            'Error during transaction rollback for import:',
            rbError
          );
        }
      }
      results.push({
        email: userRow.email,
        status: 'error',
        message: error.message,
      });
      totalError++;
    }
  }

  return {
    totalProcessed,
    totalSuccess,
    totalError,
    results,
    summaryMessage: `Đã xử lý ${totalProcessed} người dùng. Thành công: ${totalSuccess}, Lỗi: ${totalError}.`,
  };
};

export const nguoiDungService = {
  getMyProfile,
  changeMyPassword,
  getNguoiDungList,
  getNguoiDungDetailForAdmin,
  createNguoiDungByAdmin,
  updateNguoiDungByAdmin,
  updateUserAccountStatusByAdmin,
  assignFunctionalRoleToUser,
  updateAssignedFunctionalRole,
  removeAssignedFunctionalRole,
  importUsersBatch,
};
