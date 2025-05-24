// src/modules/auth/auth.repository.js
import { executeQuery } from '../../utils/database.js';
import sql from 'mssql';

/**
 * Tìm tài khoản bằng Tên đăng nhập (hoặc Email nếu bạn dùng email làm tên đăng nhập)
 * @param {string} tenDangNhap
 * @returns {Promise<object|null>} Thông tin tài khoản hoặc null nếu không tìm thấy
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
        nd.Email AS NguoiDungEmail, -- Đổi tên để tránh trùng với email đăng nhập nếu có
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
 * Lấy danh sách vai trò chức năng của người dùng
 * @param {number} nguoiDungID
 * @returns {Promise<Array<object>>}
 */
const getVaiTroByNguoiDungID = async (nguoiDungID) => {
  const query = `
    SELECT
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
      AND (nd_vt.NgayKetThuc IS NULL OR nd_vt.NgayKetThuc >= GETDATE());
  `;
  const params = [{ name: 'NguoiDungID', type: sql.Int, value: nguoiDungID }];
  const result = await executeQuery(query, params);
  return result.recordset.map((row) => ({
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
 * Lấy thông tin cơ bản của Sinh viên
 * @param {number} nguoiDungID
 * @returns {Promise<object|null>}
 */
const getThongTinSinhVienCoBan = async (nguoiDungID) => {
  const query = `
    SELECT
        tsv.MaSinhVien,
        lh.TenLop,
        lh.MaLop,
        nh.TenNganhHoc,
        nh.MaNganhHoc,
        cn.TenChuyenNganh,
        cn.MaChuyenNganh,
        tsv.KhoaHoc,
        dv_khoa.TenDonVi AS TenKhoaQuanLy
    FROM ThongTinSinhVien tsv
    JOIN LopHoc lh ON tsv.LopID = lh.LopID
    JOIN NganhHoc nh ON lh.NganhHocID = nh.NganhHocID -- Lấy ngành từ Lớp
    JOIN DonVi dv_khoa ON nh.KhoaQuanLyID = dv_khoa.DonViID
    LEFT JOIN ChuyenNganh cn ON lh.ChuyenNganhID = cn.ChuyenNganhID -- Lấy chuyên ngành từ Lớp
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
    };
  }
  return null;
};

/**
 * Lấy thông tin cơ bản của Giảng viên
 * @param {number} nguoiDungID
 * @returns {Promise<object|null>}
 */
const getThongTinGiangVienCoBan = async (nguoiDungID) => {
  const query = `
    SELECT
        tgv.MaGiangVien,
        dv.TenDonVi AS TenDonViCongTacChinh,
        dv.MaDonVi AS MaDonViCongTacChinh,
        tgv.HocVi,
        tgv.ChucDanhGD
    FROM ThongTinGiangVien tgv
    JOIN DonVi dv ON tgv.DonViCongTacID = dv.DonViID
    WHERE tgv.NguoiDungID = @NguoiDungID;
  `;
  const params = [{ name: 'NguoiDungID', type: sql.Int, value: nguoiDungID }];
  const result = await executeQuery(query, params);
  if (result.recordset.length > 0) {
    const gv = result.recordset[0];
    return {
      maSo: gv.MaGiangVien,
      tenDonViCongTacChinh: gv.TenDonViCongTacChinh,
      maDonViCongTacChinh: gv.MaDonViCongTacChinh,
      hocVi: gv.HocVi,
      chucDanhGD: gv.ChucDanhGD,
    };
  }
  return null;
};

const findNguoiDungByEmail = async (email) => {
  const query = `SELECT NguoiDungID, Email, HoTen FROM NguoiDung WHERE Email = @Email AND IsActive = 1;`;
  const params = [{ name: 'Email', type: sql.VarChar, value: email }];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

const saveOtp = async (email, otp) => {
  // Vô hiệu hóa các OTP cũ cùng loại cho email này
  await executeQuery(
    `UPDATE OtpVaResetToken SET DaSuDung = 1 WHERE Email = @Email AND LoaiToken = 'OTP_QUEN_MK' AND DaSuDung = 0;`,
    [{ name: 'Email', type: sql.VarChar, value: email }]
  );

  // Sử dụng GETDATE() để lấy thời gian hiện tại theo múi giờ của SQL Server (đã là GMT+7 theo bạn nói)
  const query = `
    INSERT INTO OtpVaResetToken (Email, Otp, OtpExpiresAt, LoaiToken, NgayTao)
    VALUES (@Email, @Otp, DATEADD(minute, @OtpExpiryMinutes, GETDATE()), 'OTP_QUEN_MK', GETDATE()); 
    -- Cả OtpExpiresAt và NgayTao đều dùng GETDATE()
  `;
  const params = [
    { name: 'Email', type: sql.VarChar, value: email },
    { name: 'Otp', type: sql.VarChar, value: otp },
    {
      name: 'OtpExpiryMinutes',
      type: sql.Int,
      value: process.env.OTP_EXPIRY_MINUTES || 10,
    }, // Mặc định là 10 phút
  ];
  await executeQuery(query, params);
};

const findValidOtp = async (email, otp) => {
  const query = `
    SELECT TokenID, Email, Otp, OtpExpiresAt
    FROM OtpVaResetToken
    WHERE Email = @Email AND Otp = @Otp AND LoaiToken = 'OTP_QUEN_MK'
      AND DaSuDung = 0 AND OtpExpiresAt > GETDATE();
  `;
  const params = [
    { name: 'Email', type: sql.VarChar, value: email },
    { name: 'Otp', type: sql.VarChar, value: otp },
  ];
  const result = await executeQuery(query, params);
  console.log('findValidOtp result:', result);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

const markOtpAsUsed = async (tokenID) => {
  const query = `UPDATE OtpVaResetToken SET DaSuDung = 1 WHERE TokenID = @TokenID;`;
  const params = [{ name: 'TokenID', type: sql.Int, value: tokenID }];
  await executeQuery(query, params);
};

const saveResetToken = async (email, resetToken) => {
  // Vô hiệu hóa các reset token cũ cùng loại cho email này (nếu có)
  await executeQuery(
    `UPDATE OtpVaResetToken SET DaSuDung = 1 WHERE Email = @Email AND LoaiToken = 'RESET_PASSWORD_TOKEN' AND DaSuDung = 0;`,
    [{ name: 'Email', type: sql.VarChar, value: email }]
  );
  const query = `
    INSERT INTO OtpVaResetToken (Email, ResetToken, ResetTokenExpiresAt, LoaiToken)
    VALUES (@Email, @ResetToken, DATEADD(hour, @ResetTokenExpiryHours, GETDATE()), 'RESET_PASSWORD_TOKEN');
  `;
  const params = [
    { name: 'Email', type: sql.VarChar, value: email },
    { name: 'ResetToken', type: sql.VarChar, value: resetToken }, // Nên là VARCHAR(255)
    {
      name: 'ResetTokenExpiryHours',
      type: sql.Int,
      value: process.env.RESET_TOKEN_EXPIRY_HOURS || 1,
    },
  ];
  await executeQuery(query, params);
};

const findValidResetToken = async (resetToken) => {
  const query = `
    SELECT TokenID, Email, ResetTokenExpiresAt
    FROM OtpVaResetToken
    WHERE ResetToken = @ResetToken AND LoaiToken = 'RESET_PASSWORD_TOKEN'
      AND DaSuDung = 0 AND ResetTokenExpiresAt > GETDATE();
  `;
  const params = [{ name: 'ResetToken', type: sql.VarChar, value: resetToken }];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

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

const findTaiKhoanByNguoiDungID = async (nguoiDungID) => {
  const query = `SELECT TaiKhoanID, RefreshToken FROM TaiKhoan WHERE NguoiDungID = @NguoiDungID`;
  // Chú ý: CSDL hiện tại của bạn chưa có cột RefreshToken trong bảng TaiKhoan.
  // Bạn cần thêm cột này nếu muốn lưu refresh token vào DB để quản lý session phía server.
  // Hoặc, nếu refresh token chỉ có ở client (cookie), thì không cần query này cho refresh token.
  // Tạm thời query này chỉ để minh họa, bạn có thể không cần nó cho logic refresh token chỉ dựa vào cookie.
  const params = [{ name: 'NguoiDungID', type: sql.Int, value: nguoiDungID }];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Lấy danh sách các vai trò chức năng (System Roles) được gán cho một người dùng.
 * Chỉ lấy các vai trò còn hiệu lực (NgayKetThuc là NULL hoặc trong tương lai).
 * @param {number} nguoiDungID ID của người dùng
 * @returns {Promise<Array<object>>} Danh sách các đối tượng vai trò, mỗi đối tượng có dạng:
 *                                   { maVaiTro: string, tenVaiTro: string,
 *                                     donViThucThi: { donViID: number, tenDonVi: string, maDonVi: string, loaiDonVi: string } | null }
 */
const getVaiTroChucNangByNguoiDungID = async (nguoiDungID) => {
  const query = `
    SELECT
        vt.MaVaiTro,      -- Đổi từ MaVaiTroCn sang MaVaiTro theo bảng VaiTroHeThong
        vt.TenVaiTro,    -- Đổi từ TenVaiTroCn sang TenVaiTro theo bảng VaiTroHeThong
        dv.DonViID,
        dv.TenDonVi,
        dv.MaDonVi,
        dv.LoaiDonVi
    FROM NguoiDung_VaiTro nd_vt -- Sử dụng tên bảng NguoiDung_VaiTro
    JOIN VaiTroHeThong vt ON nd_vt.VaiTroID = vt.VaiTroID -- Sử dụng tên bảng VaiTroHeThong
    LEFT JOIN DonVi dv ON nd_vt.DonViID = dv.DonViID -- Đổi DonViThucThiID thành DonViID theo bảng NguoiDung_VaiTro
    WHERE nd_vt.NguoiDungID = @NguoiDungID
      AND (nd_vt.NgayKetThuc IS NULL OR nd_vt.NgayKetThuc >= GETDATE()); -- Chỉ lấy vai trò còn hiệu lực
  `;
  const params = [{ name: 'NguoiDungID', type: sql.Int, value: nguoiDungID }];
  const result = await executeQuery(query, params);

  return result.recordset.map((row) => ({
    maVaiTro: row.MaVaiTro, // Đổi tên thuộc tính trả về
    tenVaiTro: row.TenVaiTro, // Đổi tên thuộc tính trả về
    donViThucThi: row.DonViID
      ? {
          // Kiểm tra DonViID trước khi tạo object
          donViID: row.DonViID,
          tenDonVi: row.TenDonVi,
          maDonVi: row.MaDonVi,
          loaiDonVi: row.LoaiDonVi,
        }
      : null,
  }));
};

const findUsersByRoleMa = async (maVaiTro) => {
  const query = `
    SELECT DISTINCT nd.NguoiDungID, nd.Email, nd.HoTen -- Lấy các thông tin cần thiết
    FROM NguoiDung nd
    JOIN NguoiDung_VaiTro ndvt ON nd.NguoiDungID = ndvt.NguoiDungID
    JOIN VaiTroHeThong vt ON ndvt.VaiTroID = vt.VaiTroID
    WHERE vt.MaVaiTro = @MaVaiTro
      AND nd.IsActive = 1
      AND (ndvt.NgayKetThuc IS NULL OR ndvt.NgayKetThuc >= GETDATE());
  `;
  const params = [{ name: 'MaVaiTro', type: sql.VarChar, value: maVaiTro }];
  const result = await executeQuery(query, params);
  return result.recordset;
};
export const authRepository = {
  findTaiKhoanNguoiDungByEmail,
  getVaiTroByNguoiDungID,
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
