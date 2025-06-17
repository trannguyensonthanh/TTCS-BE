// src/modules/nguoiDung/nguoiDung.repository.js
import { executeQuery, getPool } from '../../utils/database.js';
import sql from 'mssql';
import logger from '../../utils/logger.util.js';

/**
 * Chuyển đổi một dòng dữ liệu thành object người dùng chuẩn cho danh sách.
 * @param {object} row - Dòng dữ liệu từ SQL
 * @returns {object} Object người dùng chuẩn
 */
const mapNguoiDungListItem = (row) => {
  let loaiNguoiDungHienThi = 'Nhân viên Khác'; // Mặc định
  let donViCongTacChinh = null;

  if (row.SV_NguoiDungID_Exists) {
    loaiNguoiDungHienThi = 'Sinh viên';
    donViCongTacChinh = row.Lop_TenLop;
  } else if (row.GV_NguoiDungID_Exists) {
    loaiNguoiDungHienThi = 'Giảng viên';

    donViCongTacChinh = row.DVCT_TenDonVi;
  }

  const vaiTroArray = row.CacVaiTroChucNang
    ? row.CacVaiTroChucNang.split(',')
        .map((s) => s.trim())
        .filter((s) => s)
    : [];

  return {
    nguoiDungID: row.ND_NguoiDungID,
    maDinhDanh: row.ND_MaDinhDanh, // Mã chung (giờ là MaSV/GV/NV)
    hoTen: row.ND_HoTen,
    email: row.ND_Email,
    soDienThoai: row.ND_SoDienThoai,
    anhDaiDien: row.ND_AnhDaiDien,
    isActive: row.ND_IsActive,
    ngaySinh: row.ND_NgaySinh ? new Date(row.ND_NgaySinh).toISOString() : null,
    trangThaiTaiKhoan: row.TK_TrangThaiTk,
    loaiNguoiDungHienThi: loaiNguoiDungHienThi,
    donViCongTacChinh: donViCongTacChinh,
    cacVaiTroChucNang: vaiTroArray,
    ngayTao: new Date(row.ND_NgayTao).toISOString(),
  };
};

/**
 * Lấy danh sách người dùng có phân trang, kèm đầy đủ thông tin lồng nhau (SV, GV, vai trò).
 * @param {object} params - Tham số truy vấn (searchTerm, loaiNguoiDung, maVaiTro, donViID, isActive, page, limit, sortBy, sortOrder)
 * @returns {Promise<{items: Array<object>, totalItems: number}>} Danh sách người dùng và tổng số bản ghi
 */
const getNguoiDungListWithPagination = async (params) => {
  const {
    searchTerm,
    loaiNguoiDung,
    maVaiTro,
    donViID,
    isActive,
    page = 1,
    limit = 10,
    sortBy = 'nd.HoTen',
    sortOrder = 'ASC',
  } = params;

  let selectClause = `
        SELECT DISTINCT
            nd.NguoiDungID AS ND_NguoiDungID, nd.MaDinhDanh AS ND_MaDinhDanh, nd.HoTen AS ND_HoTen,
            nd.Email AS ND_Email, nd.SoDienThoai AS ND_SoDienThoai, nd.AnhDaiDien AS ND_AnhDaiDien, nd.NgaySinh AS ND_NgaySinh,
            nd.IsActive AS ND_IsActive, nd.NgayTao AS ND_NgayTao,
            tk.TrangThaiTk AS TK_TrangThaiTk,
            tsv.NguoiDungID AS SV_NguoiDungID_Exists, -- Chỉ cần biết có tồn tại hay không
            lop.TenLop AS Lop_TenLop,
            -- khoa_sv.TenDonVi AS KhoaQL_TenDonVi, -- JOIN thêm nếu cần hiển thị Khoa của SV
            tgv.NguoiDungID AS GV_NguoiDungID_Exists, -- Chỉ cần biết có tồn tại hay không
            dv_ct.TenDonVi AS DVCT_TenDonVi,
            (
                STUFF((
                    SELECT ', ' + vt_role.TenVaiTro
                    FROM NguoiDung_VaiTro ndvt_role
                    JOIN VaiTroHeThong vt_role ON ndvt_role.VaiTroID = vt_role.VaiTroID
                    WHERE ndvt_role.NguoiDungID = nd.NguoiDungID AND (ndvt_role.NgayKetThuc IS NULL OR ndvt_role.NgayKetThuc >= GETDATE())
                    FOR XML PATH('')
                ), 1, 2, '')
            ) AS CacVaiTroChucNang
    `;

  let fromClause = `
        FROM NguoiDung nd
        LEFT JOIN TaiKhoan tk ON nd.NguoiDungID = tk.NguoiDungID
        LEFT JOIN ThongTinSinhVien tsv ON nd.NguoiDungID = tsv.NguoiDungID
        LEFT JOIN LopHoc lop ON tsv.LopID = lop.LopID
        -- LEFT JOIN NganhHoc nh_sv ON lop.NganhHocID = nh_sv.NganhHocID
        -- LEFT JOIN DonVi khoa_sv ON nh_sv.KhoaQuanLyID = khoa_sv.DonViID AND khoa_sv.LoaiDonVi = 'KHOA'
        LEFT JOIN ThongTinGiangVien tgv ON nd.NguoiDungID = tgv.NguoiDungID
        LEFT JOIN DonVi dv_ct ON tgv.DonViCongTacID = dv_ct.DonViID
    `;

  let whereClauses = [];
  const queryParams = [];

  if (searchTerm) {
    console.log(`Searching for term: ${searchTerm}`);
    whereClauses.push(
      `(nd.HoTen LIKE @SearchTerm OR nd.Email LIKE @SearchTerm OR nd.MaDinhDanh LIKE @SearchTerm)`
    );
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }

  if (loaiNguoiDung) {
    if (loaiNguoiDung === 'SINH_VIEN')
      whereClauses.push(`tsv.NguoiDungID IS NOT NULL`);
    else if (loaiNguoiDung === 'GIANG_VIEN')
      whereClauses.push(`tgv.NguoiDungID IS NOT NULL`);
    else if (loaiNguoiDung === 'NHAN_VIEN_KHAC')
      whereClauses.push(`tsv.NguoiDungID IS NULL AND tgv.NguoiDungID IS NULL`);
  }

  if (maVaiTro) {
    fromClause += ` JOIN NguoiDung_VaiTro ndvt_filter ON nd.NguoiDungID = ndvt_filter.NguoiDungID
                    JOIN VaiTroHeThong vt_filter ON ndvt_filter.VaiTroID = vt_filter.VaiTroID `;
    const maVaiTroArr = maVaiTro
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (maVaiTroArr.length === 1) {
      whereClauses.push(
        `vt_filter.MaVaiTro = @MaVaiTroFilter AND (ndvt_filter.NgayKetThuc IS NULL OR ndvt_filter.NgayKetThuc >= GETDATE())`
      );
      queryParams.push({
        name: 'MaVaiTroFilter',
        type: sql.VarChar(50),
        value: maVaiTroArr[0],
      });
    } else if (maVaiTroArr.length > 1) {
      const inParams = maVaiTroArr
        .map((v, idx) => `@MaVaiTroFilter${idx}`)
        .join(', ');
      whereClauses.push(
        `vt_filter.MaVaiTro IN (${inParams}) AND (ndvt_filter.NgayKetThuc IS NULL OR ndvt_filter.NgayKetThuc >= GETDATE())`
      );
      maVaiTroArr.forEach((v, idx) => {
        queryParams.push({
          name: `MaVaiTroFilter${idx}`,
          type: sql.VarChar(50),
          value: v,
        });
      });
    }
  }

  if (donViID) {
    // Logic lọc theo donViID có thể phức tạp:
    // 1. Đơn vị công tác của GV
    // 2. Khoa quản lý của SV (qua Lớp -> Ngành -> Khoa)
    // 3. Đơn vị thực thi của một vai trò chức năng
    // Để đơn giản, có thể chỉ lọc theo đơn vị công tác của GV hoặc đơn vị thực thi của vai trò chức năng
    whereClauses.push(`(tgv.DonViCongTacID = @DonViIDFilter OR EXISTS (
            SELECT 1 FROM NguoiDung_VaiTro ndvt_dv 
            WHERE ndvt_dv.NguoiDungID = nd.NguoiDungID 
              AND ndvt_dv.DonViID = @DonViIDFilter 
              AND (ndvt_dv.NgayKetThuc IS NULL OR ndvt_dv.NgayKetThuc >= GETDATE())
        )
        OR EXISTS (
             SELECT 1 FROM ThongTinSinhVien tsv_dv 
             JOIN LopHoc lh_dv ON tsv_dv.LopID = lh_dv.LopID
             JOIN NganhHoc nh_dv ON lh_dv.NganhHocID = nh_dv.NganhHocID
             WHERE tsv_dv.NguoiDungID = nd.NguoiDungID AND nh_dv.KhoaQuanLyID = @DonViIDFilter
        )
        )`);
    queryParams.push({ name: 'DonViIDFilter', type: sql.Int, value: donViID });
  }

  if (maVaiTro && Array.isArray(maVaiTro) && maVaiTro.length > 0) {
    fromClause += ` JOIN NguoiDung_VaiTro ndvt_filter ON nd.NguoiDungID = ndvt_filter.NguoiDungID
                       JOIN VaiTroHeThong vt_filter ON ndvt_filter.VaiTroID = vt_filter.VaiTroID `;

    // Tạo chuỗi tham số động cho IN clause
    const maVaiTroParams = maVaiTro.map((ma, index) => {
      const paramName = `MaVaiTroFilter${index}`;
      queryParams.push({ name: paramName, type: sql.VarChar, value: ma });
      return `@${paramName}`;
    });

    whereClauses.push(
      `vt_filter.MaVaiTro IN (${maVaiTroParams.join(',')}) AND (ndvt_filter.NgayKetThuc IS NULL OR ndvt_filter.NgayKetThuc >= GETDATE())`
    );
  }

  if (typeof isActive === 'boolean') {
    whereClauses.push(`nd.IsActive = @IsActive`);
    queryParams.push({ name: 'IsActive', type: sql.Bit, value: isActive });
  }

  const whereClauseString =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(DISTINCT nd.NguoiDungID) AS TotalItems ${fromClause} ${whereClauseString}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = [
    'nd.HoTen',
    'nd.Email',
    'nd.NgayTao',
    'tk.TrangThaiTk',
  ]; // Cần alias cho tk
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'nd.HoTen';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        ${selectClause}
        ${fromClause}
        ${whereClauseString}
        ORDER BY ${safeSortBy} ${safeSortOrder}, nd.NguoiDungID ${safeSortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
    `;

  const itemsResult = await executeQuery(itemsQuery, queryParams);
  const itemsRaw = itemsResult.recordset;

  // Lấy danh sách NguoiDungID để truy vấn thông tin lồng nhau
  const nguoiDungIDs = itemsRaw.map((row) => row.ND_NguoiDungID);
  let svMap = {},
    gvMap = {},
    vaiTroMap = {};
  if (nguoiDungIDs.length > 0) {
    // Lấy thông tin sinh viên
    const svQuery = `SELECT tsv.NguoiDungID, nd.MaDinhDanh AS MaSinhVien, tsv.KhoaHoc, tsv.HeDaoTao, tsv.NgayNhapHoc, tsv.TrangThaiHocTap,
      l.LopID, l.TenLop, l.MaLop, nh.NganhHocID, nh.TenNganhHoc, nh.MaNganhHoc, cn.ChuyenNganhID, cn.TenChuyenNganh, cn.MaChuyenNganh,
      dv_khoa.DonViID AS KhoaQuanLy_DonViID, dv_khoa.TenDonVi AS KhoaQuanLy_TenDonVi, dv_khoa.MaDonVi AS KhoaQuanLy_MaDonVi
      FROM ThongTinSinhVien tsv
      JOIN LopHoc l ON tsv.LopID = l.LopID
      JOIN NguoiDung nd ON tsv.NguoiDungID = nd.NguoiDungID
      JOIN NganhHoc nh ON l.NganhHocID = nh.NganhHocID
      JOIN DonVi dv_khoa ON nh.KhoaQuanLyID = dv_khoa.DonViID AND dv_khoa.LoaiDonVi = 'KHOA'
      LEFT JOIN ChuyenNganh cn ON l.ChuyenNganhID = cn.ChuyenNganhID
      WHERE tsv.NguoiDungID IN (${nguoiDungIDs.join(',')})`;
    const svRes = await executeQuery(svQuery);
    svRes.recordset.forEach((row) => {
      svMap[row.NguoiDungID] = {
        maSinhVien: row.MaSinhVien,
        lop: { lopID: row.LopID, tenLop: row.TenLop, maLop: row.MaLop },
        nganhHoc: {
          nganhHocID: row.NganhHocID,
          tenNganhHoc: row.TenNganhHoc,
          maNganhHoc: row.MaNganhHoc,
        },
        chuyenNganh: row.ChuyenNganhID
          ? {
              chuyenNganhID: row.ChuyenNganhID,
              tenChuyenNganh: row.TenChuyenNganh,
              maChuyenNganh: row.MaChuyenNganh,
            }
          : null,
        khoaQuanLy: {
          donViID: row.KhoaQuanLy_DonViID,
          tenDonVi: row.KhoaQuanLy_TenDonVi,
          maDonVi: row.KhoaQuanLy_MaDonVi,
          loaiDonVi: 'KHOA',
        },
        khoaHoc: row.KhoaHoc,
        heDaoTao: row.HeDaoTao,
        ngayNhapHoc: row.NgayNhapHoc
          ? new Date(row.NgayNhapHoc).toISOString().split('T')[0]
          : null,
        trangThaiHocTap: row.TrangThaiHocTap,
      };
    });
    // Lấy thông tin giảng viên
    const gvQuery = `SELECT tgv.NguoiDungID, nd.MaDinhDanh AS MaGiangVien, tgv.HocVi, tgv.HocHam, tgv.ChucDanhGD, tgv.ChuyenMonChinh,
      dv.DonViID, dv.TenDonVi, dv.MaDonVi, dv.LoaiDonVi
      FROM ThongTinGiangVien tgv
      JOIN DonVi dv ON tgv.DonViCongTacID = dv.DonViID
      JOIN NguoiDung nd ON tgv.NguoiDungID = nd.NguoiDungID
      WHERE tgv.NguoiDungID IN (${nguoiDungIDs.join(',')})`;
    const gvRes = await executeQuery(gvQuery);
    gvRes.recordset.forEach((row) => {
      gvMap[row.NguoiDungID] = {
        maGiangVien: row.MaGiangVien,
        donViCongTac: {
          donViID: row.DonViID,
          tenDonVi: row.TenDonVi,
          maDonVi: row.MaDonVi,
          loaiDonVi: row.LoaiDonVi,
        },
        hocVi: row.HocVi,
        hocHam: row.HocHam,
        chucDanhGD: row.ChucDanhGD,
        chuyenMonChinh: row.ChuyenMonChinh,
      };
    });
    // Lấy danh sách vai trò chức năng
    const vtQuery = `SELECT ndvt.NguoiDungID, vt.VaiTroID, vt.MaVaiTro, vt.TenVaiTro, ndvt.DonViID, dv.TenDonVi, dv.MaDonVi, dv.LoaiDonVi, ndvt.NgayBatDau, ndvt.NgayKetThuc, ndvt.GhiChuGanVT
      FROM NguoiDung_VaiTro ndvt
      JOIN VaiTroHeThong vt ON ndvt.VaiTroID = vt.VaiTroID
      LEFT JOIN DonVi dv ON ndvt.DonViID = dv.DonViID
      WHERE ndvt.NguoiDungID IN (${nguoiDungIDs.join(',')}) AND (ndvt.NgayKetThuc IS NULL OR ndvt.NgayKetThuc >= GETDATE())`;
    const vtRes = await executeQuery(vtQuery);
    vtRes.recordset.forEach((row) => {
      if (!vaiTroMap[row.NguoiDungID]) vaiTroMap[row.NguoiDungID] = [];
      vaiTroMap[row.NguoiDungID].push({
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
        ngayBatDau: row.NgayBatDau
          ? new Date(row.NgayBatDau).toISOString().split('T')[0]
          : null,
        ngayKetThuc: row.NgayKetThuc
          ? new Date(row.NgayKetThuc).toISOString().split('T')[0]
          : null,
        ghiChuGanVT: row.GhiChuGanVT,
      });
    });
  }

  // Map lại danh sách trả về
  const items = itemsRaw.map((row) => {
    const base = mapNguoiDungListItem(row);
    return {
      ...base,
      thongTinSinhVien: svMap[base.nguoiDungID] || null,
      thongTinGiangVien: gvMap[base.nguoiDungID] || null,
      vaiTroChucNang: vaiTroMap[base.nguoiDungID] || [],
    };
  });
  return { items, totalItems };
};

/**
 * Lấy thông tin NguoiDung và TaiKhoan bằng NguoiDungID.
 * @param {number} nguoiDungID
 * @returns {Promise<object|null>} Thông tin người dùng hoặc null nếu không tìm thấy
 */
const getNguoiDungAndTaiKhoanById = async (nguoiDungID) => {
  const query = `
    SELECT
        nd.NguoiDungID, nd.MaDinhDanh, nd.HoTen, nd.Email, nd.SoDienThoai, nd.AnhDaiDien, nd.NgayTao, nd.IsActive, nd.NgaySinh,
         tk.MatKhauHash, tk.TrangThaiTk 
    FROM NguoiDung nd
    JOIN TaiKhoan tk ON nd.NguoiDungID = tk.NguoiDungID
    WHERE nd.NguoiDungID = @NguoiDungID;
  `;

  const params = [{ name: 'NguoiDungID', type: sql.Int, value: nguoiDungID }];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Lấy thông tin chi tiết SinhVien bằng NguoiDungID.
 * @param {number} nguoiDungID
 * @returns {Promise<object|null>} Thông tin chi tiết sinh viên hoặc null nếu không tìm thấy
 */
const getThongTinSinhVienByNguoiDungID = async (nguoiDungID) => {
  const query = `
    SELECT
        nd.MaDinhDanh AS MaSinhVien, tsv.KhoaHoc, tsv.HeDaoTao, tsv.NgayNhapHoc, tsv.TrangThaiHocTap,
        l.LopID, l.TenLop, l.MaLop,
        nh.NganhHocID, nh.TenNganhHoc, nh.MaNganhHoc,
        cn.ChuyenNganhID, cn.TenChuyenNganh, cn.MaChuyenNganh,
        dv_khoa.DonViID AS KhoaQuanLy_DonViID, dv_khoa.TenDonVi AS KhoaQuanLy_TenDonVi, dv_khoa.MaDonVi AS KhoaQuanLy_MaDonVi
    FROM ThongTinSinhVien tsv
    JOIN LopHoc l ON tsv.LopID = l.LopID
    JOIN NguoiDung nd ON tsv.NguoiDungID = nd.NguoiDungID
    JOIN NganhHoc nh ON l.NganhHocID = nh.NganhHocID -- Lấy ngành từ lớp
    JOIN DonVi dv_khoa ON nh.KhoaQuanLyID = dv_khoa.DonViID AND dv_khoa.LoaiDonVi = 'KHOA' -- Đảm bảo là Khoa
    LEFT JOIN ChuyenNganh cn ON l.ChuyenNganhID = cn.ChuyenNganhID -- Chuyên ngành có thể NULL
    WHERE tsv.NguoiDungID = @NguoiDungID;
  `;
  const params = [{ name: 'NguoiDungID', type: sql.Int, value: nguoiDungID }];
  const result = await executeQuery(query, params);
  if (result.recordset.length === 0) return null;

  const row = result.recordset[0];
  return {
    maSinhVien: row.MaSinhVien,
    lop: { lopID: row.LopID, tenLop: row.TenLop, maLop: row.MaLop },
    nganhHoc: {
      nganhHocID: row.NganhHocID,
      tenNganhHoc: row.NganhHoc_Ten,
      maNganhHoc: row.NganhHoc_Ma,
    },
    chuyenNganh: row.ChuyenNganhID
      ? {
          chuyenNganhID: row.ChuyenNganhID,
          tenChuyenNganh: row.ChuyenNganh_Ten,
          maChuyenNganh: row.ChuyenNganh_Ma,
        }
      : null,
    khoaQuanLy: {
      donViID: row.KhoaQuanLy_DonViID,
      tenDonVi: row.KhoaQuanLy_TenDonVi,
      maDonVi: row.KhoaQuanLy_MaDonVi,
      loaiDonVi: 'KHOA',
    },
    khoaHoc: row.KhoaHoc,
    heDaoTao: row.HeDaoTao,
    ngayNhapHoc: row.NgayNhapHoc
      ? new Date(row.NgayNhapHoc).toISOString().split('T')[0]
      : null, // Format YYYY-MM-DD
    trangThaiHocTap: row.TrangThaiHocTap,
  };
};

/**
 * Lấy thông tin chi tiết GiangVien bằng NguoiDungID.
 * @param {number} nguoiDungID
 * @returns {Promise<object|null>} Thông tin chi tiết giảng viên hoặc null nếu không tìm thấy
 */
const getThongTinGiangVienByNguoiDungID = async (nguoiDungID) => {
  const query = `
    SELECT
        nd.MaDinhDanh AS MaGiangVien, tgv.HocVi, tgv.HocHam, tgv.ChucDanhGD, tgv.ChuyenMonChinh,
        dv.DonViID, dv.TenDonVi, dv.MaDonVi, dv.LoaiDonVi
    FROM ThongTinGiangVien tgv
    JOIN DonVi dv ON tgv.DonViCongTacID = dv.DonViID
    JOIN NguoiDung nd ON tgv.NguoiDungID = nd.NguoiDungID
    WHERE tgv.NguoiDungID = @NguoiDungID;
  `;
  const params = [{ name: 'NguoiDungID', type: sql.Int, value: nguoiDungID }];
  const result = await executeQuery(query, params);
  if (result.recordset.length === 0) return null;

  const row = result.recordset[0];
  return {
    maGiangVien: row.MaGiangVien,
    donViCongTac: {
      donViID: row.DonViID,
      tenDonVi: row.TenDonVi,
      maDonVi: row.MaDonVi,
      loaiDonVi: row.LoaiDonVi,
    },
    hocVi: row.HocVi,
    hocHam: row.HocHam,
    chucDanhGD: row.ChucDanhGD,
    chuyenMonChinh: row.ChuyenMonChinh,
  };
};

/**
 * Cập nhật mật khẩu cho tài khoản.
 * @param {number} nguoiDungID
 * @param {string} newMatKhauHash
 * @returns {Promise<void>}
 */
const updatePasswordByNguoiDungID = async (nguoiDungID, newMatKhauHash) => {
  let query = `
    UPDATE TaiKhoan
    SET MatKhauHash = @NewMatKhauHash
    WHERE NguoiDungID = @NguoiDungID;
  `;
  const params = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
    { name: 'NewMatKhauHash', type: sql.VarChar, value: newMatKhauHash },
  ];

  await executeQuery(query, params);
};

/**
 * Tạo mới NguoiDung.
 * @param {object} data - Thông tin người dùng
 * @param {sql.Transaction} transaction
 * @returns {Promise<number>} NguoiDungID vừa tạo
 */
const createNguoiDungRecord = async (data, transaction) => {
  const query = `
    INSERT INTO NguoiDung (HoTen, Email, MaDinhDanh, SoDienThoai, AnhDaiDien, IsActive, NgayTao, NgaySinh)
    OUTPUT inserted.NguoiDungID
    VALUES (@HoTen, @Email, @MaDinhDanh, @SoDienThoai, @AnhDaiDien, @IsActive, GETDATE(), @NgaySinh);
  `;
  logger.debug('Creating new NguoiDung with data:', data);
  const params = [
    { name: 'HoTen', type: sql.NVarChar(150), value: data.hoTen },
    { name: 'Email', type: sql.VarChar(150), value: data.email },
    { name: 'MaDinhDanh', type: sql.VarChar(50), value: data.maDinhDanh },
    { name: 'SoDienThoai', type: sql.VarChar(20), value: data.soDienThoai },
    { name: 'AnhDaiDien', type: sql.VarChar(500), value: data.anhDaiDien },
    { name: 'IsActive', type: sql.Bit, value: data.isActiveNguoiDung },
    {
      name: 'NgaySinh',
      type: sql.Date,
      value: data.ngaySinh ? new Date(data.ngaySinh) : null,
    },
  ];
  const request = transaction.request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset[0].NguoiDungID;
};

/**
 * Tạo mới TaiKhoan.
 * @param {object} data - Thông tin tài khoản
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const createTaiKhoanRecord = async (data, transaction) => {
  const query = `
    INSERT INTO TaiKhoan (NguoiDungID, MatKhauHash, TrangThaiTk, NgayTaoTk)
    VALUES (@NguoiDungID, @MatKhauHash, @TrangThaiTk, GETDATE());
  `;
  const params = [
    { name: 'NguoiDungID', type: sql.Int, value: data.nguoiDungID },
    { name: 'MatKhauHash', type: sql.VarChar(255), value: data.matKhauHash },
    { name: 'TrangThaiTk', type: sql.VarChar(50), value: data.trangThaiTk },
  ];
  const request = transaction.request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  await request.query(query);
};

/**
 * Tạo mới ThongTinSinhVien.
 * @param {number} nguoiDungID
 * @param {object} dataSV - Thông tin sinh viên
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const createThongTinSinhVienRecord = async (
  nguoiDungID,
  dataSV,
  transaction
) => {
  const query = `
    INSERT INTO ThongTinSinhVien (NguoiDungID, LopID, KhoaHoc, HeDaoTao, NgayNhapHoc, TrangThaiHocTap)
    VALUES (@NguoiDungID, @LopID, @KhoaHoc, @HeDaoTao, @NgayNhapHoc, @TrangThaiHocTap);
  `;
  const params = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
    { name: 'LopID', type: sql.Int, value: dataSV.lopID },
    { name: 'KhoaHoc', type: sql.VarChar(50), value: dataSV.khoaHoc },
    { name: 'HeDaoTao', type: sql.NVarChar(100), value: dataSV.heDaoTao },
    {
      name: 'NgayNhapHoc',
      type: sql.Date,
      value: dataSV.ngayNhapHoc ? new Date(dataSV.ngayNhapHoc) : null,
    },
    {
      name: 'TrangThaiHocTap',
      type: sql.NVarChar(50),
      value: dataSV.trangThaiHocTap,
    },
  ];
  const request = transaction.request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  await request.query(query);
};

/**
 * Tạo mới ThongTinGiangVien.
 * @param {number} nguoiDungID
 * @param {object} dataGV - Thông tin giảng viên
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const createThongTinGiangVienRecord = async (
  nguoiDungID,
  dataGV,
  transaction
) => {
  const query = `
    INSERT INTO ThongTinGiangVien (NguoiDungID, DonViCongTacID, HocVi, HocHam, ChucDanhGD, ChuyenMonChinh)
    VALUES (@NguoiDungID, @DonViCongTacID, @HocVi, @HocHam, @ChucDanhGD, @ChuyenMonChinh);
  `;
  const params = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
    { name: 'DonViCongTacID', type: sql.Int, value: dataGV.donViCongTacID },
    { name: 'HocVi', type: sql.NVarChar(100), value: dataGV.hocVi },
    { name: 'HocHam', type: sql.NVarChar(100), value: dataGV.hocHam },
    { name: 'ChucDanhGD', type: sql.NVarChar(100), value: dataGV.chucDanhGD },
    {
      name: 'ChuyenMonChinh',
      type: sql.NVarChar(255),
      value: dataGV.chuyenMonChinh,
    },
  ];
  const request = transaction.request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  await request.query(query);
};

/**
 * Gán một vai trò chức năng cho người dùng.
 * @param {number} nguoiDungID
 * @param {object} vaiTroData - Thông tin vai trò chức năng
 * @param {sql.Transaction} [transaction=null]
 * @returns {Promise<void>}
 */
const assignVaiTroChucNangToNguoiDung = async (
  nguoiDungID,
  vaiTroData,
  transaction = null
) => {
  const query = `
    INSERT INTO NguoiDung_VaiTro (NguoiDungID, VaiTroID, DonViID, NgayBatDau, NgayKetThuc)
    VALUES (@NguoiDungID, @VaiTroID, @DonViID, @NgayBatDau, @NgayKetThuc);
  `;
  const params = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
    { name: 'VaiTroID', type: sql.Int, value: vaiTroData.vaiTroID },
    { name: 'DonViID', type: sql.Int, value: vaiTroData.donViID },
    {
      name: 'NgayBatDau',
      type: sql.Date,
      value: vaiTroData.ngayBatDau
        ? new Date(vaiTroData.ngayBatDau)
        : new Date(),
    },
    {
      name: 'NgayKetThuc',
      type: sql.Date,
      value: vaiTroData.ngayKetThuc ? new Date(vaiTroData.ngayKetThuc) : null,
    },
  ];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  await request.query(query);
};

/**
 * Kiểm tra Email hoặc MaDinhDanh đã tồn tại.
 * @param {string} email
 * @param {string|null} [maDinhDanh=null]
 * @returns {Promise<boolean>} true nếu tồn tại, false nếu không
 */
const checkNguoiDungExists = async (email, maDinhDanh = null) => {
  let query = `SELECT NguoiDungID FROM NguoiDung WHERE Email = @Email`;
  const params = [{ name: 'Email', type: sql.VarChar(150), value: email }];
  if (maDinhDanh) {
    query += ` OR MaDinhDanh = @MaDinhDanh`;
    params.push({
      name: 'MaDinhDanh',
      type: sql.VarChar(50),
      value: maDinhDanh,
    });
  }
  const result = await executeQuery(query, params);
  return result.recordset.length > 0;
};

/**
 * Cập nhật thông tin người dùng.
 * @param {number} nguoiDungID
 * @param {object} data - Thông tin cập nhật
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const updateNguoiDungRecord = async (nguoiDungID, data, transaction) => {
  console.log('data to updateNguoiDungRecord:', data);
  const setClauses = [];
  const params = [{ name: 'NguoiDungID', type: sql.Int, value: nguoiDungID }];
  if (data.hoTen !== undefined) {
    setClauses.push('HoTen = @HoTen');
    params.push({ name: 'HoTen', type: sql.NVarChar(150), value: data.hoTen });
  }
  if (data.email !== undefined) {
    setClauses.push('Email = @Email');
    params.push({ name: 'Email', type: sql.VarChar(150), value: data.email });
  }
  if (data.maDinhDanh !== undefined) {
    setClauses.push('MaDinhDanh = @MaDinhDanh');
    params.push({
      name: 'MaDinhDanh',
      type: sql.VarChar(50),
      value: data.maDinhDanh,
    });
  }
  if (data.soDienThoai !== undefined) {
    setClauses.push('SoDienThoai = @SoDienThoai');
    params.push({
      name: 'SoDienThoai',
      type: sql.VarChar(20),
      value: data.soDienThoai,
    });
  }
  if (data.anhDaiDien !== undefined) {
    setClauses.push('AnhDaiDien = @AnhDaiDien');
    params.push({
      name: 'AnhDaiDien',
      type: sql.VarChar(500),
      value: data.anhDaiDien,
    });
  }
  if (data.isActiveNguoiDung !== undefined) {
    setClauses.push('IsActive = @IsActive');
    params.push({
      name: 'IsActive',
      type: sql.Bit,
      value: data.isActiveNguoiDung,
    });
  }

  if (data.ngaySinh !== undefined) {
    setClauses.push('NgaySinh = @NgaySinh');
    params.push({
      name: 'NgaySinh',
      type: sql.Date,
      value: data.ngaySinh ? new Date(data.ngaySinh) : null,
    });
  }
  if (setClauses.length === 0) return;
  const query = `UPDATE NguoiDung SET ${setClauses.join(', ')} WHERE NguoiDungID = @NguoiDungID;`;
  const request = transaction.request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  await request.query(query);
};

/**
 * Cập nhật thông tin tài khoản.
 * @param {number} nguoiDungID
 * @param {object} data - Thông tin cập nhật
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const updateTaiKhoanRecord = async (nguoiDungID, data, transaction) => {
  const setClauses = [];
  const params = [{ name: 'NguoiDungID', type: sql.Int, value: nguoiDungID }];
  if (data.matKhauHash !== undefined) {
    setClauses.push('MatKhauHash = @MatKhauHash');
    params.push({
      name: 'MatKhauHash',
      type: sql.VarChar(255),
      value: data.matKhauHash,
    });
  }

  if (data.trangThaiTk !== undefined) {
    setClauses.push('TrangThaiTk = @TrangThaiTk');
    params.push({
      name: 'TrangThaiTk',
      type: sql.VarChar(50),
      value: data.trangThaiTk,
    });
  }

  if (setClauses.length === 0) return;
  const query = `UPDATE TaiKhoan SET ${setClauses.join(', ')} WHERE NguoiDungID = @NguoiDungID;`;
  const request = transaction.request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  await request.query(query);
};

/**
 * Thêm mới hoặc cập nhật/xóa ThongTinSinhVien.
 * @param {number} nguoiDungID
 * @param {object|null} dataSV - Thông tin sinh viên hoặc null để xóa
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const upsertOrDeleteThongTinSinhVien = async (
  nguoiDungID,
  dataSV,
  transaction
) => {
  if (dataSV === null) {
    // Nếu FE gửi null, nghĩa là muốn xóa
    const query = `DELETE FROM ThongTinSinhVien WHERE NguoiDungID = @NguoiDungID;`;
    const request = transaction.request();
    request.input('NguoiDungID', sql.Int, nguoiDungID);
    await request.query(query);
    return;
  }
  if (typeof dataSV === 'object' && Object.keys(dataSV).length > 0) {
    // Kiểm tra xem đã có bản ghi ThongTinSinhVien cho NguoiDungID này chưa
    const checkQuery = `SELECT NguoiDungID FROM ThongTinSinhVien WHERE NguoiDungID = @NguoiDungIDCheck;`;
    let requestCheck = transaction.request();
    requestCheck.input('NguoiDungIDCheck', sql.Int, nguoiDungID);
    const existingSV = await requestCheck.query(checkQuery);

    if (existingSV.recordset.length > 0) {
      // Update
      const setClauses = [];
      const params = [
        { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
      ];
      if (dataSV.lopID !== undefined) {
        setClauses.push('LopID = @LopID');
        params.push({ name: 'LopID', type: sql.Int, value: dataSV.lopID });
      }
      if (dataSV.khoaHoc !== undefined) {
        setClauses.push('KhoaHoc = @KhoaHoc');
        params.push({
          name: 'KhoaHoc',
          type: sql.VarChar(50),
          value: dataSV.khoaHoc,
        });
      }
      if (dataSV.heDaoTao !== undefined) {
        setClauses.push('HeDaoTao = @HeDaoTao');
        params.push({
          name: 'HeDaoTao',
          type: sql.NVarChar(100),
          value: dataSV.heDaoTao,
        });
      }
      if (dataSV.ngayNhapHoc !== undefined) {
        setClauses.push('NgayNhapHoc = @NgayNhapHoc');
        params.push({
          name: 'NgayNhapHoc',
          type: sql.Date,
          value: dataSV.ngayNhapHoc ? new Date(dataSV.ngayNhapHoc) : null,
        });
      }
      if (dataSV.trangThaiHocTap !== undefined) {
        setClauses.push('TrangThaiHocTap = @TrangThaiHocTap');
        params.push({
          name: 'TrangThaiHocTap',
          type: sql.NVarChar(50),
          value: dataSV.trangThaiHocTap,
        });
      }
      if (setClauses.length > 0) {
        const updateQuery = `UPDATE ThongTinSinhVien SET ${setClauses.join(', ')} WHERE NguoiDungID = @NguoiDungID;`;
        let requestUpdate = transaction.request();
        params.forEach((p) => requestUpdate.input(p.name, p.type, p.value));
        await requestUpdate.query(updateQuery);
      }
    } else {
      await createThongTinSinhVienRecord(nguoiDungID, dataSV, transaction);
    }
  }
};

/**
 * Thêm mới hoặc cập nhật/xóa ThongTinGiangVien.
 * @param {number} nguoiDungID
 * @param {object|null} dataGV - Thông tin giảng viên hoặc null để xóa
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const upsertOrDeleteThongTinGiangVien = async (
  nguoiDungID,
  dataGV,
  transaction
) => {
  if (dataGV === null) {
    const query = `DELETE FROM ThongTinGiangVien WHERE NguoiDungID = @NguoiDungID;`;
    const request = transaction.request();
    request.input('NguoiDungID', sql.Int, nguoiDungID);
    await request.query(query);
    return;
  }
  if (typeof dataGV === 'object' && Object.keys(dataGV).length > 0) {
    const checkQuery = `SELECT NguoiDungID FROM ThongTinGiangVien WHERE NguoiDungID = @NguoiDungIDCheck;`;
    let requestCheck = transaction.request();
    requestCheck.input('NguoiDungIDCheck', sql.Int, nguoiDungID);
    const existingGV = await requestCheck.query(checkQuery);

    if (existingGV.recordset.length > 0) {
      // Update
      const setClauses = [];
      const params = [
        { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
      ];
      if (dataGV.donViCongTacID !== undefined) {
        setClauses.push('DonViCongTacID = @DonViCongTacID');
        params.push({
          name: 'DonViCongTacID',
          type: sql.Int,
          value: dataGV.donViCongTacID,
        });
      }
      if (dataGV.hocVi !== undefined) {
        setClauses.push('HocVi = @HocVi');
        params.push({
          name: 'HocVi',
          type: sql.NVarChar(100),
          value: dataGV.hocVi,
        });
      }
      if (dataGV.hocHam !== undefined) {
        setClauses.push('HocHam = @HocHam');
        params.push({
          name: 'HocHam',
          type: sql.NVarChar(100),
          value: dataGV.hocHam,
        });
      }
      if (dataGV.chucDanhGD !== undefined) {
        setClauses.push('ChucDanhGD = @ChucDanhGD');
        params.push({
          name: 'ChucDanhGD',
          type: sql.NVarChar(100),
          value: dataGV.chucDanhGD,
        });
      }
      if (dataGV.chuyenMonChinh !== undefined) {
        setClauses.push('ChuyenMonChinh = @ChuyenMonChinh');
        params.push({
          name: 'ChuyenMonChinh',
          type: sql.NVarChar(255),
          value: dataGV.chuyenMonChinh,
        });
      }
      if (setClauses.length > 0) {
        const updateQuery = `UPDATE ThongTinGiangVien SET ${setClauses.join(', ')} WHERE NguoiDungID = @NguoiDungID;`;
        let requestUpdate = transaction.request();
        params.forEach((p) => requestUpdate.input(p.name, p.type, p.value));
        await requestUpdate.query(updateQuery);
      }
    } else {
      await createThongTinGiangVienRecord(nguoiDungID, dataGV, transaction);
    }
  }
};

/**
 * Gán hoặc cập nhật vai trò chức năng cho người dùng (UNIQUE constraint).
 * @param {number} nguoiDungID
 * @param {object} vaiTroData - Thông tin vai trò chức năng
 * @param {sql.Transaction} [transaction=null]
 * @returns {Promise<object>} Bản ghi vừa tạo/cập nhật
 */
const upsertNguoiDungVaiTro = async (
  nguoiDungID,
  vaiTroData,
  transaction = null
) => {
  const query = `
    INSERT INTO NguoiDung_VaiTro (NguoiDungID, VaiTroID, DonViID, NgayBatDau, NgayKetThuc, GhiChuGanVT)
    OUTPUT inserted.GanVaiTroID, inserted.NguoiDungID, inserted.VaiTroID, inserted.DonViID,
           inserted.NgayBatDau, inserted.NgayKetThuc, inserted.GhiChuGanVT
    VALUES (@NguoiDungID, @VaiTroID, @DonViID, @NgayBatDau, @NgayKetThuc, @GhiChuGanVT);
  `;
  const params = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
    { name: 'VaiTroID', type: sql.Int, value: vaiTroData.vaiTroID },
    { name: 'DonViID', type: sql.Int, value: vaiTroData.donViID }, // Cho phép NULL
    {
      name: 'NgayBatDau',
      type: sql.Date,
      value: vaiTroData.ngayBatDau
        ? new Date(vaiTroData.ngayBatDau)
        : new Date(),
    },
    {
      name: 'NgayKetThuc',
      type: sql.Date,
      value: vaiTroData.ngayKetThuc ? new Date(vaiTroData.ngayKetThuc) : null,
    },
    {
      name: 'GhiChuGanVT',
      type: sql.NVarChar(500),
      value: vaiTroData.ghiChuGanVT,
    },
  ];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset[0];
};

/**
 * Kiểm tra sự tồn tại của một gán vai trò cụ thể.
 * @param {number} nguoiDungID
 * @param {number} vaiTroID
 * @param {number} donViID
 * @param {Date} ngayBatDau
 * @param {sql.Transaction} [transaction=null]
 * @returns {Promise<boolean>} true nếu tồn tại, false nếu không
 */
const checkExistingNguoiDungVaiTro = async (
  nguoiDungID,
  vaiTroID,
  donViID,
  ngayBatDau,
  transaction = null
) => {
  const query = `
        SELECT GanVaiTroID FROM NguoiDung_VaiTro
        WHERE NguoiDungID = @NguoiDungID
          AND VaiTroID = @VaiTroID
          AND (@DonViID IS NULL OR DonViID = @DonViID) -- Xử lý DonViID có thể NULL
          AND (@DonViID IS NOT NULL OR DonViID IS NULL)
          AND NgayBatDau = @NgayBatDau
          AND (NgayKetThuc IS NULL OR NgayKetThuc >= GETDATE()); -- Chỉ check các gán còn hiệu lực
    `;
  const params = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
    { name: 'VaiTroID', type: sql.Int, value: vaiTroID },
    { name: 'DonViID', type: sql.Int, value: donViID },
    {
      name: 'NgayBatDau',
      type: sql.Date,
      value: ngayBatDau ? new Date(ngayBatDau) : new Date(),
    },
  ];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset.length > 0;
};

/**
 * Kiểm tra người dùng tồn tại theo email hoặc mã định danh, loại trừ một ID nếu cần.
 * @param {string} email
 * @param {string} maDinhDanh
 * @param {number|null} [excludeNguoiDungID=null]
 * @param {sql.Transaction|null} [transaction=null]
 * @returns {Promise<Array<object>>} Danh sách người dùng trùng
 */
const checkNguoiDungExistsByEmailOrMaDinhDanh = async (
  email,
  maDinhDanh,
  excludeNguoiDungID = null,
  transaction = null
) => {
  let query = `SELECT NguoiDungID, Email, MaDinhDanh FROM NguoiDung WHERE (LOWER(Email) = LOWER(@Email) OR LOWER(MaDinhDanh) = LOWER(@MaDinhDanh))`;
  const params = [
    { name: 'Email', type: sql.VarChar(150), value: email },
    { name: 'MaDinhDanh', type: sql.VarChar(50), value: maDinhDanh },
  ];
  if (excludeNguoiDungID) {
    query += ` AND NguoiDungID <> @ExcludeNguoiDungID`;
    params.push({
      name: 'ExcludeNguoiDungID',
      type: sql.Int,
      value: excludeNguoiDungID,
    });
  }
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset;
};

/**
 * Lấy một bản ghi NguoiDung_VaiTro bằng GanVaiTroID.
 * @param {number} ganVaiTroID
 * @param {sql.Transaction} [transaction=null]
 * @returns {Promise<object|null>} Bản ghi vai trò hoặc null nếu không tìm thấy
 */
const getNguoiDungVaiTroByGanID = async (ganVaiTroID, transaction = null) => {
  const query = `
    SELECT GanVaiTroID, NguoiDungID, VaiTroID, DonViID, NgayBatDau, NgayKetThuc, GhiChuGanVT
    FROM NguoiDung_VaiTro
    WHERE GanVaiTroID = @GanVaiTroID;
  `;
  const params = [{ name: 'GanVaiTroID', type: sql.Int, value: ganVaiTroID }];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Cập nhật một bản ghi NguoiDung_VaiTro.
 * @param {number} ganVaiTroID
 * @param {object} updateData - Thông tin cập nhật
 * @param {sql.Transaction} transaction
 * @returns {Promise<object|null>} Bản ghi đã cập nhật hoặc null nếu không có gì thay đổi
 */
const updateNguoiDungVaiTroByGanID = async (
  ganVaiTroID,
  updateData,
  transaction
) => {
  const setClauses = [];
  const params = [{ name: 'GanVaiTroID', type: sql.Int, value: ganVaiTroID }];

  if (updateData.donViID !== undefined) {
    setClauses.push('DonViID = @DonViID');
    params.push({ name: 'DonViID', type: sql.Int, value: updateData.donViID });
  }
  if (updateData.ngayBatDau !== undefined) {
    setClauses.push('NgayBatDau = @NgayBatDau');
    params.push({
      name: 'NgayBatDau',
      type: sql.Date,
      value: updateData.ngayBatDau ? new Date(updateData.ngayBatDau) : null,
    });
  }
  if (updateData.ngayKetThuc !== undefined) {
    setClauses.push('NgayKetThuc = @NgayKetThuc');
    params.push({
      name: 'NgayKetThuc',
      type: sql.Date,
      value: updateData.ngayKetThuc ? new Date(updateData.ngayKetThuc) : null,
    });
  }
  if (updateData.ghiChuGanVT !== undefined) {
    setClauses.push('GhiChuGanVT = @GhiChuGanVT');
    params.push({
      name: 'GhiChuGanVT',
      type: sql.NVarChar(500),
      value: updateData.ghiChuGanVT,
    });
  }

  if (setClauses.length === 0) {
    return getNguoiDungVaiTroByGanID(ganVaiTroID, transaction);
  }

  const query = `
    UPDATE NguoiDung_VaiTro
    SET ${setClauses.join(', ')}
    OUTPUT inserted.GanVaiTroID, inserted.NguoiDungID, inserted.VaiTroID, inserted.DonViID,
           inserted.NgayBatDau, inserted.NgayKetThuc, inserted.GhiChuGanVT
    WHERE GanVaiTroID = @GanVaiTroID;
  `;
  const request = transaction.request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Xóa một bản ghi gán vai trò NguoiDung_VaiTro bằng GanVaiTroID.
 * @param {number} ganVaiTroID
 * @param {sql.Transaction} [transaction=null]
 * @returns {Promise<number>} Số dòng bị ảnh hưởng (1 nếu xóa thành công)
 */
const deleteNguoiDungVaiTroByGanID = async (
  ganVaiTroID,
  transaction = null
) => {
  // Việc kiểm tra bản ghi có tồn tại hay không nên được thực hiện ở service
  const query = `DELETE FROM NguoiDung_VaiTro WHERE GanVaiTroID = @GanVaiTroID;`;
  const params = [{ name: 'GanVaiTroID', type: sql.Int, value: ganVaiTroID }];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.rowsAffected[0];
};

/**
 * Lấy tất cả vai trò còn hiệu lực của người dùng (chưa kết thúc hoặc kết thúc >= hôm nay)
 * @param {number} nguoiDungID
 * @returns {Promise<Array>} Danh sách vai trò còn hiệu lực
 */
const getCurrentActiveRolesOfUser = async (nguoiDungID) => {
  const query = `
    SELECT ndvt.* FROM NguoiDung_VaiTro ndvt
    WHERE ndvt.NguoiDungID = @NguoiDungID
      AND (ndvt.NgayKetThuc IS NULL OR ndvt.NgayKetThuc >= GETDATE())
  `;
  const params = [{ name: 'NguoiDungID', type: sql.Int, value: nguoiDungID }];
  const result = await executeQuery(query, params);
  return result.recordset;
};

/**
 * Lấy thông tin tài khoản chi tiết cho profile.
 * @param {number} nguoiDungID
 * @returns {Promise<object|null>} Thông tin tài khoản hoặc null nếu không tìm thấy
 */
const getTaiKhoanInfoByNguoiDungID = async (nguoiDungID) => {
  const query = `
    SELECT TrangThaiTk, LanDangNhapCuoi, NgayTaoTk
    FROM TaiKhoan
    WHERE NguoiDungID = @NguoiDungID;
  `;
  const params = [{ name: 'NguoiDungID', type: sql.Int, value: nguoiDungID }];
  const result = await executeQuery(query, params);
  if (result.recordset.length === 0) return null;
  const row = result.recordset[0];
  return {
    trangThaiTk: row.TrangThaiTk,
    lanDangNhapCuoi: row.LanDangNhapCuoi
      ? new Date(row.LanDangNhapCuoi).toISOString()
      : null,
    ngayTaoTk: row.NgayTaoTk ? new Date(row.NgayTaoTk).toISOString() : null,
  };
};

export const nguoiDungRepository = {
  getNguoiDungListWithPagination,
  getNguoiDungAndTaiKhoanById,
  getThongTinSinhVienByNguoiDungID,
  getThongTinGiangVienByNguoiDungID,
  updatePasswordByNguoiDungID,
  createNguoiDungRecord,
  createTaiKhoanRecord,
  createThongTinSinhVienRecord,
  createThongTinGiangVienRecord,
  assignVaiTroChucNangToNguoiDung,
  checkNguoiDungExists,
  mapNguoiDungListItem,
  updateNguoiDungRecord,
  updateTaiKhoanRecord,
  upsertOrDeleteThongTinSinhVien,
  upsertOrDeleteThongTinGiangVien,
  upsertNguoiDungVaiTro,
  checkExistingNguoiDungVaiTro,
  checkNguoiDungExistsByEmailOrMaDinhDanh,
  getNguoiDungVaiTroByGanID,
  updateNguoiDungVaiTroByGanID,
  deleteNguoiDungVaiTroByGanID,
  getCurrentActiveRolesOfUser,
  getTaiKhoanInfoByNguoiDungID,
};
