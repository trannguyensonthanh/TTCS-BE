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
import MaVaiTro from '../../enums/maVaiTro.enum.js';

/**
 * [SỬA ĐỔI - KHẮC PHỤC] Lấy danh sách người dùng với phân trang và "làm giàu" dữ liệu.
 * Đảm bảo cấu trúc trả về cho mỗi item giống hệt với getMyProfile.
 */
const getNguoiDungList = async (params) => {
  const { items: baseUsers, totalItems } =
    await nguoiDungRepository.getNguoiDungListWithPagination(params);

  if (baseUsers.length === 0) {
    return {
      items: [],
      totalPages: 0,
      currentPage: 1,
      totalItems: 0,
      pageSize: params.limit || 10,
    };
  }

  // "Làm giàu" dữ liệu cho mỗi người dùng
  const enrichedUsers = await Promise.all(
    baseUsers.map(async (user) => {
      // Lấy tất cả thông tin chi tiết cho mỗi người dùng, tương tự như getMyProfile
      const [thongTinSV, thongTinGV, vaiTroChucNang, donViCongTac] =
        await Promise.all([
          nguoiDungRepository.getThongTinSinhVienByNguoiDungID(
            user.NguoiDungID
          ),
          nguoiDungRepository.getThongTinGiangVienByNguoiDungID(
            user.NguoiDungID
          ),
          authRepository.getVaiTroChucNangByNguoiDungID(user.NguoiDungID), // Đã lọc ở repo
          nguoiDungRepository.getDonViCongTacByNguoiDungID(user.NguoiDungID),
        ]);

      // Gắn đơn vị công tác vào thông tin giảng viên
      if (thongTinGV && donViCongTac) {
        thongTinGV.donViCongTac = donViCongTac;
      }
      console.log('donViCongTac', donViCongTac);
      // Xác định các trường hiển thị chung
      let loaiNguoiDungHienThi = 'Nhân viên';
      let donViCongTacChinh = null;
      if (thongTinSV) {
        loaiNguoiDungHienThi = 'Sinh viên';
        donViCongTacChinh = thongTinSV.lop?.tenLop || null;
      } else if (thongTinGV) {
        loaiNguoiDungHienThi = 'Giảng viên';
        donViCongTacChinh = donViCongTac?.tenDonVi || null;
      } else {
        donViCongTacChinh = donViCongTac?.tenDonVi || null;
      }

      // Trả về object với cấu trúc đầy đủ
      return {
        // Thông tin cơ bản
        nguoiDungID: user.NguoiDungID,
        maDinhDanh: user.MaDinhDanh,
        hoTen: user.HoTen,
        email: user.Email,
        soDienThoai: user.SoDienThoai,
        anhDaiDien: user.AnhDaiDien,
        isActive: user.IsActive,
        ngaySinh: user.NgaySinh ? new Date(user.NgaySinh).toISOString() : null,
        ngayTao: new Date(user.NgayTao).toISOString(),

        // Thông tin tóm tắt để hiển thị trên danh sách
        loaiNguoiDungHienThi,
        donViCongTacChinh,
        trangThaiTaiKhoan: user.TrangThaiTk,

        // <<<< KHÔI PHỤC CÁC TRƯỜNG CHI TIẾT >>>>
        thongTinSinhVien: thongTinSV || null,
        thongTinGiangVien: thongTinGV || null,
        vaiTroChucNang: vaiTroChucNang || [],
      };
    })
  );

  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 10;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items: enrichedUsers,
    totalPages,
    currentPage: page,
    totalItems,
    pageSize: limit,
  };
};
/**
 * [SỬA ĐỔI] Lấy thông tin chi tiết hồ sơ của người dùng.
 */
const getMyProfile = async (nguoiDungID) => {
  const [
    nguoiDungVaTaiKhoan,
    thongTinSV,
    thongTinGV,
    vaiTroChucNang,
    donViCongTac,
  ] = await Promise.all([
    nguoiDungRepository.getNguoiDungAndTaiKhoanById(nguoiDungID),
    nguoiDungRepository.getThongTinSinhVienByNguoiDungID(nguoiDungID),
    nguoiDungRepository.getThongTinGiangVienByNguoiDungID(nguoiDungID),
    authRepository.getVaiTroChucNangByNguoiDungID(nguoiDungID), // Chỉ lấy vai trò chức năng
    nguoiDungRepository.getDonViCongTacByNguoiDungID(nguoiDungID),
  ]);

  if (!nguoiDungVaTaiKhoan) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Không tìm thấy thông tin người dùng.'
    );
  }

  // Gắn donViCongTac vào thongTinGV nếu là giảng viên
  if (thongTinGV) {
    thongTinGV.donViCongTac = donViCongTac;
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
    ngaySinh: nguoiDungVaTaiKhoan.NgaySinh
      ? new Date(nguoiDungVaTaiKhoan.NgaySinh).toISOString()
      : null,
  };

  const taiKhoan = {
    trangThaiTk: nguoiDungVaTaiKhoan.TrangThaiTk,
    lanDangNhapCuoi: nguoiDungVaTaiKhoan.LanDangNhapCuoi
      ? new Date(nguoiDungVaTaiKhoan.LanDangNhapCuoi).toISOString()
      : null,
    ngayTaoTk: nguoiDungVaTaiKhoan.NgayTaoTk
      ? new Date(nguoiDungVaTaiKhoan.NgayTaoTk).toISOString()
      : null,
  };

  return {
    nguoiDung: nguoiDungFullResponse,
    thongTinSinhVien: thongTinSV,
    thongTinGiangVien: thongTinGV,
    vaiTroChucNang: vaiTroChucNang,
    taiKhoan: taiKhoan,
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
    loaiNguoiDung,
    thongTinSinhVien,
    thongTinGiangVien,
    donViCongTacID,
    vaiTroChucNang,
    ...nguoiDungData
  } = payload;

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1. Kiểm tra Email và MaDinhDanh
    const existingUsers =
      await nguoiDungRepository.checkNguoiDungExistsByEmailOrMaDinhDanh(
        nguoiDungData.email,
        nguoiDungData.maDinhDanh,
        null,
        transaction
      );
    if (existingUsers && existingUsers.length > 0) {
      // Logic kiểm tra và ném lỗi nếu trùng
      if (
        existingUsers.some(
          (u) => u.Email.toLowerCase() === nguoiDungData.email.toLowerCase()
        )
      ) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Email "${nguoiDungData.email}" đã tồn tại.`
        );
      }
      if (
        existingUsers.some(
          (u) =>
            u.MaDinhDanh &&
            u.MaDinhDanh.toLowerCase() ===
              nguoiDungData.maDinhDanh.toLowerCase()
        )
      ) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Mã định danh "${nguoiDungData.maDinhDanh}" đã tồn tại.`
        );
      }
    }

    // 2. Tạo NguoiDung
    const nguoiDungID = await nguoiDungRepository.createNguoiDungRecord(
      nguoiDungData,
      transaction
    );

    // 3. Tạo TaiKhoan
    const hashedPassword = await hashPassword(nguoiDungData.matKhau);
    await nguoiDungRepository.createTaiKhoanRecord(
      {
        nguoiDungID,
        matKhauHash: hashedPassword,
        trangThaiTk: nguoiDungData.trangThaiTk || 'Active',
      },
      transaction
    );

    // 4. Tạo thông tin chi tiết (SV/GV) và gán vai trò THANH_VIEN_DON_VI
    if (loaiNguoiDung === 'SINH_VIEN' && thongTinSinhVien) {
      // Validate LopID
      const lop = await lopHocRepository.getLopHocById(
        thongTinSinhVien.lopID,
        transaction
      );
      if (!lop)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Lớp ID ${thongTinSinhVien.lopID} không tồn tại.`
        );
      await nguoiDungRepository.createThongTinSinhVienRecord(
        nguoiDungID,
        thongTinSinhVien,
        transaction
      );
    } else if (
      loaiNguoiDung === 'GIANG_VIEN' ||
      loaiNguoiDung === 'NHAN_VIEN_KHAC'
    ) {
      if (!donViCongTacID) {
        // Kiểm tra donViCongTacID ở cấp cao nhất
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'donViCongTacID là bắt buộc cho Giảng viên/Nhân viên.'
        );
      }
      const donVi = await donViRepository.getDonViById(
        donViCongTacID,
        transaction
      );
      if (!donVi)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Đơn vị công tác ID ${donViCongTacID} không tồn tại.`
        );

      // Nếu là giảng viên thì tạo thêm thông tin chuyên môn
      if (loaiNguoiDung === 'GIANG_VIEN' && thongTinGiangVien) {
        // Hàm createThongTinGiangVienRecord đã được sửa để không nhận donViCongTacID
        await nguoiDungRepository.createThongTinGiangVienRecord(
          nguoiDungID,
          thongTinGiangVien,
          transaction
        );
        logger.debug(
          `ThongTinGiangVien created for NguoiDungID: ${nguoiDungID}`
        );
      }

      // Gán vai trò THANH_VIEN_DON_VI cho cả Giảng viên và Nhân viên khác
      const thanhVienRole = await vaiTroHeThongRepository.getVaiTroHeThongByMa(
        MaVaiTro.THANH_VIEN_DON_VI,
        transaction
      );
      if (!thanhVienRole)
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Lỗi cấu hình: không tìm thấy vai trò thành viên.'
        );

      await nguoiDungRepository.upsertNguoiDungVaiTro(
        nguoiDungID,
        {
          vaiTroID: thanhVienRole.VaiTroID,
          donViID: donViCongTacID, // Sử dụng donViCongTacID từ payload
          ngayBatDau: new Date(),
        },
        transaction
      );
      logger.debug(
        `THANH_VIEN_DON_VI role assigned for NguoiDungID: ${nguoiDungID}`
      );
    }

    // 5. Gán các vai trò chức năng khác (nếu có)
    if (vaiTroChucNang && vaiTroChucNang.length > 0) {
      for (const vt of vaiTroChucNang) {
        // Validate VaiTroID và DonViID
        const vaiTroExists = await vaiTroHeThongRepository.getVaiTroHeThongById(
          vt.vaiTroID,
          transaction
        );
        if (!vaiTroExists)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Vai trò ID ${vt.vaiTroID} không tồn tại.`
          );
        if (vt.donViID) {
          const donViExists = await donViRepository.getDonViById(
            vt.donViID,
            transaction
          );
          if (!donViExists)
            throw new ApiError(
              httpStatus.BAD_REQUEST,
              `Đơn vị ID ${vt.donViID} không tồn tại.`
            );
        }
        await nguoiDungRepository.assignVaiTroChucNangToNguoiDung(
          nguoiDungID,
          vt,
          transaction
        );
      }
    }

    await transaction.commit();

    // Trả về profile đầy đủ
    return getMyProfile(nguoiDungID);
  } catch (error) {
    if (transaction) await transaction.rollback();
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Tạo người dùng thất bại do lỗi hệ thống.'
    );
  }
};
/**
 * [SỬA ĐỔI] Admin cập nhật thông tin người dùng.
 * Xử lý logic phức tạp khi thay đổi loại người dùng.
 * @param {number} nguoiDungId
 * @param {object} updatePayload - UpdateNguoiDungAdminPayload
 * @returns {Promise<object>} UserProfileResponse
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
    donViCongTacID,
    matKhau,
    email,
    maDinhDanh,
    trangThaiTk,
    ...nguoiDungUpdateData
  } = updatePayload;

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    // 1. Kiểm tra unique cho Email và MaDinhDanh nếu có thay đổi
    if (email && email.toLowerCase() !== currentUserData.Email.toLowerCase()) {
      const existing =
        await nguoiDungRepository.checkNguoiDungExistsByEmailOrMaDinhDanh(
          email,
          null,
          nguoiDungId,
          transaction
        );
      if (existing.length > 0)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Email "${email}" đã tồn tại.`
        );
    }
    if (
      maDinhDanh &&
      maDinhDanh.toLowerCase() !==
        (currentUserData.MaDinhDanh || '').toLowerCase()
    ) {
      const existing =
        await nguoiDungRepository.checkNguoiDungExistsByEmailOrMaDinhDanh(
          null,
          maDinhDanh,
          nguoiDungId,
          transaction
        );
      if (existing.length > 0)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Mã định danh "${maDinhDanh}" đã tồn tại.`
        );
    }

    // 2. Cập nhật bảng NguoiDung
    await nguoiDungRepository.updateNguoiDungRecord(
      nguoiDungId,
      { email, maDinhDanh, ...nguoiDungUpdateData },
      transaction
    );

    // 3. Cập nhật bảng TaiKhoan (mật khẩu và trạng thái)
    const taiKhoanUpdateData = {};
    if (matKhau) {
      taiKhoanUpdateData.matKhauHash = await hashPassword(matKhau);
    }
    if (trangThaiTk) {
      taiKhoanUpdateData.trangThaiTk = trangThaiTk;
    }
    if (Object.keys(taiKhoanUpdateData).length > 0) {
      await nguoiDungRepository.updateTaiKhoanRecord(
        nguoiDungId,
        taiKhoanUpdateData,
        transaction
      );
    }

    // 4. Xử lý logic thay đổi loại người dùng và vai trò thành viên
    // (Đây là phần phức tạp nhất)
    if (updatePayload.hasOwnProperty('thongTinSinhVien')) {
      await nguoiDungRepository.upsertOrDeleteThongTinSinhVien(
        nguoiDungId,
        thongTinSinhVien,
        transaction
      );
      // Nếu chuyển thành SV, xóa thông tin GV và vai trò thành viên cũ
      if (thongTinSinhVien) {
        await nguoiDungRepository.upsertOrDeleteThongTinGiangVien(
          nguoiDungId,
          null,
          transaction
        );
        // Xóa vai trò THANH_VIEN_DON_VI nếu có
        const thanhVienRole =
          await vaiTroHeThongRepository.getVaiTroHeThongByMa(
            MaVaiTro.THANH_VIEN_DON_VI,
            transaction
          );
        if (thanhVienRole) {
          await nguoiDungRepository.deleteNguoiDungVaiTroByVaiTroID(
            nguoiDungId,
            thanhVienRole.VaiTroID,
            transaction
          );
        }
      }
    }
    if (updatePayload.hasOwnProperty('thongTinGiangVien')) {
      // Bước 1: Upsert/delete thông tin chuyên môn (học vị, học hàm...)
      await nguoiDungRepository.upsertOrDeleteThongTinGiangVien(
        nguoiDungId,
        thongTinGiangVien,
        transaction
      );

      // Bước 2: Xóa vai trò thành viên cũ
      const thanhVienRole = await vaiTroHeThongRepository.getVaiTroHeThongByMa(
        MaVaiTro.THANH_VIEN_DON_VI,
        transaction
      );
      if (!thanhVienRole)
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Lỗi cấu hình: không tìm thấy vai trò thành viên.'
        );
      await nguoiDungRepository.deleteNguoiDungVaiTroByVaiTroID(
        nguoiDungId,
        thanhVienRole.VaiTroID,
        transaction
      );

      // Bước 3: Nếu thông tin giảng viên mới được cung cấp (không phải null), gán lại vai trò thành viên với đơn vị mới
      if (thongTinGiangVien) {
        if (!donViCongTacID) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'donViCongTacID là bắt buộc khi cập nhật thông tin giảng viên.'
          );
        }
        const donVi = await donViRepository.getDonViById(
          donViCongTacID,
          transaction
        );
        if (!donVi)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Đơn vị công tác ID ${donViCongTacID} không tồn tại.`
          );

        await nguoiDungRepository.upsertNguoiDungVaiTro(
          nguoiDungId,
          {
            vaiTroID: thanhVienRole.VaiTroID,
            donViID: donViCongTacID,
            ngayBatDau: new Date(),
          },
          transaction
        );
      }
      // Nếu thongTinGiangVien là null, vai trò thành viên đã được xóa ở trên và không cần làm gì thêm.
    }

    await transaction.commit();
    logger.info(
      `Transaction committed for adminUpdateNguoiDung ID: ${nguoiDungId}`
    );

    // Trả về profile đầy đủ sau khi đã cập nhật
    return getMyProfile(nguoiDungId);
  } catch (error) {
    if (transaction) await transaction.rollback();
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
  const khongChoGV = ['QUAN_LY_CSVC', 'CB_TO_CHUC_SU_KIEN'];
  const khongChoSV = [
    'ADMIN_HE_THONG',
    'BGH_DUYET_SK_TRUONG',
    'QUAN_LY_CSVC',
    'CB_TO_CHUC_SU_KIEN',
  ];
  const khongChoNVKhac = ['BGH_DUYET_SK_TRUONG'];
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
  if (currentRoles && currentRoles.length > 1) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Mỗi cá nhân chỉ được gán 2 vai trò chức năng còn hiệu lực tại một thời điểm.'
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
          trangThaiTk: 'Active',
        },
        transaction
      );

      // 4. Tạo ThongTinSinhVien hoặc ThongTinGiangVien và gán vai trò
      if (userRow.loaiNguoiDung === 'SINH_VIEN') {
        if (!userRow.donViID)
          // donViID ở đây là LopID
          throw new Error('LopID là bắt buộc cho sinh viên.');

        const lop = await lopHocRepository.getLopHocById(
          userRow.donViID,
          transaction
        );
        if (!lop) throw new Error(`Lớp ID ${userRow.donViID} không tồn tại.`);

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
      } else if (
        userRow.loaiNguoiDung === 'GIANG_VIEN' ||
        userRow.loaiNguoiDung === 'NHAN_VIEN_KHAC'
      ) {
        // Cả giảng viên và nhân viên đều cần đơn vị công tác
        if (!userRow.donViID)
          // donViID ở đây là DonViCongTacID
          throw new Error(
            'DonViCongTacID là bắt buộc cho giảng viên/nhân viên.'
          );

        const donViCongTac = await donViRepository.getDonViById(
          userRow.donViID,
          transaction
        );
        if (!donViCongTac)
          throw new Error(
            `Đơn vị công tác ID ${userRow.donViID} không tồn tại.`
          );

        // Nếu là Giảng viên, tạo thêm bản ghi ThongTinGiangVien
        if (userRow.loaiNguoiDung === 'GIANG_VIEN') {
          await nguoiDungRepository.createThongTinGiangVienRecord(
            nguoiDungID,
            {
              // KHÔNG có donViCongTacID ở đây
              hocVi: userRow.hocVi,
              hocHam: userRow.hocHam,
              chucDanhGD: userRow.chucDanhGD,
              chuyenMonChinh: userRow.chuyenMonChinh,
            },
            transaction
          );
        }

        // Gán vai trò THANH_VIEN_DON_VI cho cả Giảng viên và Nhân viên
        const thanhVienRole =
          await vaiTroHeThongRepository.getVaiTroHeThongByMa(
            MaVaiTro.THANH_VIEN_DON_VI,
            transaction
          );
        if (!thanhVienRole)
          throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            'Lỗi cấu hình: không tìm thấy vai trò thành viên.'
          );

        await nguoiDungRepository.upsertNguoiDungVaiTro(
          nguoiDungID,
          {
            vaiTroID: thanhVienRole.VaiTroID,
            donViID: userRow.donViID, // Dùng donViID từ file excel
            ngayBatDau: new Date(),
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

/**
 * Xóa cứng người dùng theo ID. Nếu bị ràng buộc khóa ngoại sẽ báo lỗi chi tiết.
 * @param {number} nguoiDungID
 * @returns {Promise<void>}
 * @throws {ApiError} Nếu không thể xóa do liên kết dữ liệu
 */
const deleteNguoiDungByID = async (nguoiDungID) => {
  console.log('deleteNguoiDungByID called with nguoiDungID:', nguoiDungID);
  try {
    const rowsAffected =
      await nguoiDungRepository.deleteNguoiDungByID(nguoiDungID);
    if (rowsAffected === 0) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Không tìm thấy người dùng để xóa.'
      );
    }
    return;
  } catch (err) {
    if (err.message && err.message.startsWith('Không thể xóa người dùng')) {
      throw new ApiError(httpStatus.BAD_REQUEST, err.message);
    }
    throw err;
  }
};

/**
 * [MỚI] Tìm kiếm người dùng để mời tham gia sự kiện.
 * @param {object} params - Tham số tìm kiếm từ controller
 * @returns {Promise<NguoiDungTimKiemItem[]>}
 */
const findUsersForInvitation = async (params) => {
  // Service có thể thêm các logic validate nghiệp vụ phức tạp ở đây nếu cần
  // Ví dụ: kiểm tra xem sự kiện có còn cho phép mời không, v.v.
  const users = await nguoiDungRepository.findUsersForInvitation(params);

  // Map kết quả từ DB sang cấu trúc mà FE mong muốn
  return users.map((user) => ({
    nguoiDungID: user.NguoiDungID,
    maDinhDanh: user.MaDinhDanh,
    hoTen: user.HoTen,
    email: user.Email,
    loaiNguoiDungHienThi: user.loaiNguoiDungHienThi,
    thongTinThem: user.thongTinThem,
    anhDaiDien: user.AnhDaiDien,
  }));
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
  deleteNguoiDungByID,
  findUsersForInvitation,
};
