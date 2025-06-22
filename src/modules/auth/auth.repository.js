// src/modules/auth/auth.repository.js
import sql from 'mssql';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import { executeQuery } from '../../utils/database.js';

/**
 * Tìm tài khoản người dùng bằng email.
 * @param {string} email - Địa chỉ email của người dùng.
 * @returns {Promise<object|null>} Thông tin tài khoản hoặc null nếu không tìm thấy.
 */
const findTaiKhoanNguoiDungByEmail = async (email) => {
  const query = `
    SELECT TOP 1
        tk.TaiKhoanID,
        tk.NguoiDungID,
        tk.MatKhauHash,
        tk.TrangThaiTk,
        nd.MaDinhDanh,
        nd.HoTen,
        nd.Email AS NguoiDungEmail,
        nd.AnhDaiDien,
        nd.IsActive AS NguoiDungIsActive
    FROM TaiKhoan tk
    JOIN NguoiDung nd ON tk.NguoiDungID = nd.NguoiDungID
    WHERE nd.Email = @Email;
  `;
  const params = [{ name: 'Email', type: sql.VarChar, value: email }];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Lấy thông tin cơ bản của sinh viên theo ID người dùng.

 * @param {number} nguoiDungID - ID của người dùng.
 * @returns {Promise<object|null>} Thông tin sinh viên hoặc null nếu không tìm thấy.
 */
const getThongTinSinhVienCoBan = async (nguoiDungID) => {
  const query = `
    SELECT
        nd.MaDinhDanh AS MaSinhVien,
        lh.TenLop,
        lh.MaLop,
        nh.TenNganhHoc,
        nh.MaNganhHoc,
        cn.TenChuyenNganh,
        cn.MaChuyenNganh,
        tsv.KhoaHoc,
        dv_khoa.TenDonVi AS TenKhoaQuanLy,
        dv_khoa.MaDonVi AS MaKhoaQuanLy
    FROM ThongTinSinhVien tsv
    JOIN LopHoc lh ON tsv.LopID = lh.LopID
    JOIN NganhHoc nh ON lh.NganhHocID = nh.NganhHocID 
    JOIN NguoiDung nd ON tsv.NguoiDungID = nd.NguoiDungID
    JOIN DonVi dv_khoa ON nh.KhoaQuanLyID = dv_khoa.DonViID
    LEFT JOIN ChuyenNganh cn ON lh.ChuyenNganhID = cn.ChuyenNganhID
    WHERE tsv.NguoiDungID = @NguoiDungID;
  `;
  const params = [{ name: 'NguoiDungID', type: sql.Int, value: nguoiDungID }];
  const result = await executeQuery(query, params);
  if (result.recordset.length > 0) {
    const sv = result.recordset[0];
    return {
      maSo: sv.MaSinhVien,
      tenLop: sv.TenLop,
      maLop: sv.MaLop,
      tenNganhHoc: sv.TenNganhHoc,
      maNganhHoc: sv.MaNganhHoc,
      tenChuyenNganh: sv.TenChuyenNganh,
      maChuyenNganh: sv.MaChuyenNganh,
      khoaHoc: sv.KhoaHoc,
      tenKhoaQuanLy: sv.TenKhoaQuanLy,
      maKhoaQuanLy: sv.MaKhoaQuanLy,
    };
  }
  return null;
};

/**
 *
 * Lấy đơn vị công tác từ vai trò THANH_VIEN_DON_VI, giữ lại đầy đủ các trường HocHam, ChuyenMonChinh.
 * @param {number} nguoiDungID - ID của người dùng.
 * @returns {Promise<object|null>} Thông tin giảng viên hoặc null nếu không tìm thấy.
 */
const getThongTinGiangVienCoBan = async (nguoiDungID) => {
  const query = `
    SELECT
        nd.MaDinhDanh AS MaGiangVien,
        -- Lấy đơn vị công tác từ vai trò THANH_VIEN_DON_VI
        (
            SELECT TOP 1 dv.DonViID
            FROM NguoiDung_VaiTro ndvt
            JOIN VaiTroHeThong vt ON ndvt.VaiTroID = vt.VaiTroID
            JOIN DonVi dv ON ndvt.DonViID = dv.DonViID
            WHERE ndvt.NguoiDungID = @NguoiDungID AND vt.MaVaiTro = @MaVaiTroThanhVien
            ORDER BY ndvt.NgayBatDau DESC -- Lấy đơn vị mới nhất nếu có nhiều
        ) AS DonViCongTacID,
        (
            SELECT TOP 1 dv.TenDonVi
            FROM NguoiDung_VaiTro ndvt
            JOIN VaiTroHeThong vt ON ndvt.VaiTroID = vt.VaiTroID
            JOIN DonVi dv ON ndvt.DonViID = dv.DonViID
            WHERE ndvt.NguoiDungID = @NguoiDungID AND vt.MaVaiTro = @MaVaiTroThanhVien
            ORDER BY ndvt.NgayBatDau DESC
        ) AS TenDonViCongTacChinh,
        (
            SELECT TOP 1 dv.MaDonVi
            FROM NguoiDung_VaiTro ndvt
            JOIN VaiTroHeThong vt ON ndvt.VaiTroID = vt.VaiTroID
            JOIN DonVi dv ON ndvt.DonViID = dv.DonViID
            WHERE ndvt.NguoiDungID = @NguoiDungID AND vt.MaVaiTro = @MaVaiTroThanhVien
            ORDER BY ndvt.NgayBatDau DESC
        ) AS MaDonViCongTacChinh,
        tgv.HocVi,
        tgv.HocHam,          
        tgv.ChucDanhGD,
        tgv.ChuyenMonChinh 
    FROM ThongTinGiangVien tgv
    JOIN NguoiDung nd ON tgv.NguoiDungID = nd.NguoiDungID
    WHERE tgv.NguoiDungID = @NguoiDungID;
  `;
  const params = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
    {
      name: 'MaVaiTroThanhVien',
      type: sql.VarChar,
      value: MaVaiTro.THANH_VIEN_DON_VI,
    },
  ];
  const result = await executeQuery(query, params);
  if (result.recordset.length > 0) {
    const gv = result.recordset[0];
    return {
      maSo: gv.MaGiangVien,
      donViCongTacID: gv.DonViCongTacID,
      tenDonViCongTacChinh: gv.TenDonViCongTacChinh,
      maDonViCongTacChinh: gv.MaDonViCongTacChinh,
      hocVi: gv.HocVi,
      hocHam: gv.HocHam,
      chucDanhGD: gv.ChucDanhGD,
      chuyenMonChinh: gv.ChuyenMonChinh,
    };
  }
  return null;
};

/**
 * Tìm người dùng theo email.
 * @param {string} email - Địa chỉ email của người dùng.
 * @returns {Promise<object|null>} Thông tin người dùng hoặc null nếu không tìm thấy.
 */
const findNguoiDungByEmail = async (email) => {
  const query = `SELECT NguoiDungID, Email, HoTen FROM NguoiDung WHERE Email = @Email AND IsActive = 1;`;
  const params = [{ name: 'Email', type: sql.VarChar, value: email }];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Lưu OTP cho email tương ứng.
 * @param {string} email - Địa chỉ email.
 * @param {string} otp - Mã OTP.
 * @returns {Promise<void>}
 */
const saveOtp = async (email, otp) => {
  await executeQuery(
    `UPDATE OtpVaResetToken SET DaSuDung = 1 WHERE Email = @Email AND LoaiToken = 'OTP_QUEN_MK' AND DaSuDung = 0;`,
    [{ name: 'Email', type: sql.VarChar, value: email }]
  );

  const query = `
    INSERT INTO OtpVaResetToken (Email, Otp, OtpExpiresAt, LoaiToken, NgayTao)
    VALUES (@Email, @Otp, DATEADD(minute, @OtpExpiryMinutes, SYSUTCDATETIME()), 'OTP_QUEN_MK', SYSUTCDATETIME()); 
  `;
  const params = [
    { name: 'Email', type: sql.VarChar, value: email },
    { name: 'Otp', type: sql.VarChar, value: otp },
    {
      name: 'OtpExpiryMinutes',
      type: sql.Int,
      value: process.env.OTP_EXPIRY_MINUTES || 10,
    },
  ];
  await executeQuery(query, params);
};

/**
 * Tìm OTP hợp lệ theo email và mã OTP.
 * @param {string} email - Địa chỉ email.
 * @param {string} otp - Mã OTP.
 * @returns {Promise<object|null>} Thông tin OTP hoặc null nếu không hợp lệ.
 */
const findValidOtp = async (email, otp) => {
  const query = `
    SELECT TokenID, Email, Otp, OtpExpiresAt
    FROM OtpVaResetToken
    WHERE Email = @Email AND Otp = @Otp AND LoaiToken = 'OTP_QUEN_MK'
      AND DaSuDung = 0 AND OtpExpiresAt > SYSUTCDATETIME();
  `;
  const params = [
    { name: 'Email', type: sql.VarChar, value: email },
    { name: 'Otp', type: sql.VarChar, value: otp },
  ];
  const result = await executeQuery(query, params);
  console.log('findValidOtp result:', result);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Đánh dấu OTP đã sử dụng.
 * @param {number} tokenID - ID của OTP.
 * @returns {Promise<void>}
 */
const markOtpAsUsed = async (tokenID) => {
  const query = `UPDATE OtpVaResetToken SET DaSuDung = 1 WHERE TokenID = @TokenID;`;
  const params = [{ name: 'TokenID', type: sql.Int, value: tokenID }];
  await executeQuery(query, params);
};

/**
 * Lưu reset token cho email tương ứng.
 * @param {string} email - Địa chỉ email.
 * @param {string} resetToken - Token reset mật khẩu.
 * @returns {Promise<void>} Promise hoàn thành khi token được lưu.
 */
const saveResetToken = async (email, resetToken) => {
  await executeQuery(
    `UPDATE OtpVaResetToken SET DaSuDung = 1 WHERE Email = @Email AND LoaiToken = 'RESET_PASSWORD_TOKEN' AND DaSuDung = 0;`,
    [{ name: 'Email', type: sql.VarChar, value: email }]
  );
  const query = `
    INSERT INTO OtpVaResetToken (Email, ResetToken, ResetTokenExpiresAt, LoaiToken, NgayTao)
    VALUES (@Email, @ResetToken, DATEADD(hour, @ResetTokenExpiryHours, SYSUTCDATETIME()), 'RESET_PASSWORD_TOKEN', SYSUTCDATETIME());
  `;
  const params = [
    { name: 'Email', type: sql.VarChar, value: email },
    { name: 'ResetToken', type: sql.VarChar, value: resetToken },
    {
      name: 'ResetTokenExpiryHours',
      type: sql.Int,
      value: process.env.RESET_TOKEN_EXPIRY_HOURS || 1,
    },
  ];
  await executeQuery(query, params);
};

/**
 * Tìm reset token hợp lệ.
 * @param {string} resetToken - Token reset mật khẩu.
 * @returns {Promise<object|null>} Thông tin token hoặc null nếu không hợp lệ.
 */
const findValidResetToken = async (resetToken) => {
  const query = `
    SELECT TokenID, Email, ResetTokenExpiresAt
    FROM OtpVaResetToken
    WHERE ResetToken = @ResetToken AND LoaiToken = 'RESET_PASSWORD_TOKEN'
      AND DaSuDung = 0 AND ResetTokenExpiresAt > SYSUTCDATETIME();
  `;
  const params = [{ name: 'ResetToken', type: sql.VarChar, value: resetToken }];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Cập nhật mật khẩu mới cho người dùng theo email.
 * @param {string} email - Địa chỉ email.
 * @param {string} newPasswordHash - Hash mật khẩu mới.
 * @returns {Promise<void>}
 */
const updateUserPasswordByEmail = async (email, newPasswordHash) => {
  const query = `
    UPDATE tk
    SET tk.MatKhauHash = @MatKhauHash
    FROM TaiKhoan tk
    JOIN NguoiDung nd ON tk.NguoiDungID = nd.NguoiDungID
    WHERE nd.Email = @Email;
  `;
  const params = [
    { name: 'Email', type: sql.VarChar, value: email },
    { name: 'MatKhauHash', type: sql.VarChar, value: newPasswordHash },
  ];
  await executeQuery(query, params);
};

/**
 * Tìm tài khoản theo ID người dùng.
 * @param {number} nguoiDungID - ID của người dùng.
 * @returns {Promise<object|null>} Thông tin tài khoản hoặc null nếu không tìm thấy.
 */
const findTaiKhoanByNguoiDungID = async (nguoiDungID) => {
  const query = `SELECT TaiKhoanID, RefreshToken FROM TaiKhoan WHERE NguoiDungID = @NguoiDungID`;
  const params = [{ name: 'NguoiDungID', type: sql.Int, value: nguoiDungID }];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * @param {number} nguoiDungID - ID của người dùng.
 * @returns {Promise<Array<object>>} Danh sách vai trò chức năng.
 */
const getVaiTroChucNangByNguoiDungID = async (nguoiDungID) => {
  const query = `
    SELECT
        nd_vt.GanVaiTroID, 
        vtht.VaiTroID,
        vtht.MaVaiTro,
        vtht.TenVaiTro,
        dv.DonViID,
        dv.TenDonVi,
        dv.MaDonVi,
        dv.LoaiDonVi
    FROM NguoiDung_VaiTro nd_vt
    JOIN VaiTroHeThong vtht ON nd_vt.VaiTroID = vtht.VaiTroID
    LEFT JOIN DonVi dv ON nd_vt.DonViID = dv.DonViID
    WHERE nd_vt.NguoiDungID = @NguoiDungID
      AND vtht.MaVaiTro != @MaVaiTroThanhVien
      AND (nd_vt.NgayKetThuc IS NULL OR nd_vt.NgayKetThuc >= SYSUTCDATETIME());
  `;
  const params = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
    {
      name: 'MaVaiTroThanhVien',
      type: sql.VarChar,
      value: MaVaiTro.THANH_VIEN_DON_VI,
    },
  ];
  const result = await executeQuery(query, params);
  return result.recordset.map((row) => ({
    ganVaiTroID: row.GanVaiTroID,
    vaiTroID: row.VaiTroID,
    maVaiTro: row.MaVaiTro,
    tenVaiTro: row.TenVaiTro,
    donViThucThi: row.DonViID
      ? {
          donViID: row.DonViID,
          tenDonVi: row.TenDonVi,
          maDonVi: row.MaDonVi,
          loaiDonVi: row.LoaiDonVi,
        }
      : null,
  }));
};

/**
 * Tìm danh sách người dùng theo mã vai trò.
 * @param {string} maVaiTro - Mã vai trò.
 * @returns {Promise<Array<object>>} Danh sách người dùng.
 */
const findUsersByRoleMa = async (maVaiTro) => {
  const query = `
    SELECT DISTINCT nd.NguoiDungID, nd.Email, nd.HoTen
    FROM NguoiDung nd
    JOIN NguoiDung_VaiTro ndvt ON nd.NguoiDungID = ndvt.NguoiDungID
    JOIN VaiTroHeThong vt ON ndvt.VaiTroID = vt.VaiTroID
    WHERE vt.MaVaiTro = @MaVaiTro
      AND nd.IsActive = 1
      AND (ndvt.NgayKetThuc IS NULL OR ndvt.NgayKetThuc >= SYSUTCDATETIME());
  `;
  const params = [{ name: 'MaVaiTro', type: sql.VarChar, value: maVaiTro }];
  const result = await executeQuery(query, params);
  return result.recordset;
};

export const authRepository = {
  findTaiKhoanNguoiDungByEmail,

  getThongTinSinhVienCoBan,
  getThongTinGiangVienCoBan,
  findNguoiDungByEmail,
  saveOtp,
  findValidOtp,
  markOtpAsUsed,
  saveResetToken,
  findValidResetToken,
  updateUserPasswordByEmail,
  findTaiKhoanByNguoiDungID,
  getVaiTroChucNangByNguoiDungID,
  findUsersByRoleMa,
};
