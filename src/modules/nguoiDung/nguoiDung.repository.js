// src/modules/nguoiDung/nguoiDung.repository.js
import sql from 'mssql';
import { executeQuery, getPool } from '../../utils/database.js';
import logger from '../../utils/logger.util.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

// /**
//  * Chuyển đổi một dòng dữ liệu thành object người dùng chuẩn cho danh sách.
//  * @param {object} row - Dòng dữ liệu từ SQL
//  * @returns {object} Object người dùng chuẩn
//  */
// const mapNguoiDungListItem = (row) => {
//   let loaiNguoiDungHienThi = 'Nhân viên Khác'; // Mặc định
//   let donViCongTacChinh = null;

//   if (row.SV_NguoiDungID_Exists) {
//     loaiNguoiDungHienThi = 'Sinh viên';
//     donViCongTacChinh = row.Lop_TenLop;
//   } else if (row.GV_NguoiDungID_Exists) {
//     loaiNguoiDungHienThi = 'Giảng viên';

//     donViCongTacChinh = row.DVCT_TenDonVi;
//   }

//   const vaiTroArray = row.CacVaiTroChucNang
//     ? row.CacVaiTroChucNang.split(',')
//         .map((s) => s.trim())
//         .filter((s) => s)
//     : [];

//   return {
//     nguoiDungID: row.ND_NguoiDungID,
//     maDinhDanh: row.ND_MaDinhDanh, // Mã chung (giờ là MaSV/GV/NV)
//     hoTen: row.ND_HoTen,
//     email: row.ND_Email,
//     soDienThoai: row.ND_SoDienThoai,
//     anhDaiDien: row.ND_AnhDaiDien,
//     isActive: row.ND_IsActive,
//     ngaySinh: row.ND_NgaySinh ? new Date(row.ND_NgaySinh).toISOString() : null,
//     trangThaiTaiKhoan: row.TK_TrangThaiTk,
//     loaiNguoiDungHienThi: loaiNguoiDungHienThi,
//     donViCongTacChinh: donViCongTacChinh,
//     cacVaiTroChucNang: vaiTroArray,
//     ngayTao: new Date(row.ND_NgayTao).toISOString(),
//   };
// };

/**
 * [SỬA ĐỔI] Lấy danh sách người dùng CƠ BẢN có phân trang.
 * Query này được đơn giản hóa, chỉ lấy thông tin từ NguoiDung và TaiKhoan.
 * Việc lấy thông tin chi tiết (SV, GV, Vai trò) sẽ được thực hiện sau ở tầng service.
 * @param {object} params - Tham số truy vấn
 * @returns {Promise<{items: Array<object>, totalItems: number}>}
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

  let fromClause = `
        FROM NguoiDung nd
        LEFT JOIN TaiKhoan tk ON nd.NguoiDungID = tk.NguoiDungID
    `;
  const whereClauses = ['1=1'];
  const queryParams = [];

  // Thêm các JOINs và WHERE clauses dựa trên bộ lọc
  if (loaiNguoiDung) {
    if (loaiNguoiDung === 'SINH_VIEN') {
      fromClause += ` JOIN ThongTinSinhVien tsv ON nd.NguoiDungID = tsv.NguoiDungID `;
    } else if (loaiNguoiDung === 'GIANG_VIEN') {
      fromClause += ` JOIN ThongTinGiangVien tgv ON nd.NguoiDungID = tgv.NguoiDungID `;
    } else if (loaiNguoiDung === 'NHAN_VIEN') {
      whereClauses.push(`
                NOT EXISTS (SELECT 1 FROM ThongTinSinhVien WHERE NguoiDungID = nd.NguoiDungID)
                AND NOT EXISTS (SELECT 1 FROM ThongTinGiangVien WHERE NguoiDungID = nd.NguoiDungID)
            `);
    }
  }
  if (maVaiTro) {
    // Hỗ trợ truyền lên 1 mã hoặc nhiều mã (phân tách bởi dấu phẩy)
    const maVaiTroArr = maVaiTro
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Nếu là SINH_VIEN hoặc GIANG_VIEN thì lọc theo bảng thông tin tương ứng
    if (maVaiTroArr.length === 1 && maVaiTroArr[0] === 'SINH_VIEN') {
      fromClause += ` JOIN ThongTinSinhVien tsv_ma ON nd.NguoiDungID = tsv_ma.NguoiDungID `;
    } else if (maVaiTroArr.length === 1 && maVaiTroArr[0] === 'GIANG_VIEN') {
      fromClause += ` JOIN ThongTinGiangVien tgv_ma ON nd.NguoiDungID = tgv_ma.NguoiDungID `;
    } else {
      fromClause += ` JOIN NguoiDung_VaiTro ndvt ON nd.NguoiDungID = ndvt.NguoiDungID JOIN VaiTroHeThong vt ON ndvt.VaiTroID = vt.VaiTroID `;
      if (maVaiTroArr.length === 1) {
        whereClauses.push(`vt.MaVaiTro = @MaVaiTro`);
        queryParams.push({
          name: 'MaVaiTro',
          type: sql.VarChar(50),
          value: maVaiTroArr[0],
        });
      } else if (maVaiTroArr.length > 1) {
        // Tạo các tham số động cho IN clause
        const inParams = maVaiTroArr.map((val, idx) => `@MaVaiTro${idx}`);
        whereClauses.push(`vt.MaVaiTro IN (${inParams.join(',')})`);
        maVaiTroArr.forEach((val, idx) => {
          queryParams.push({
            name: `MaVaiTro${idx}`,
            type: sql.VarChar(50),
            value: val,
          });
        });
      }
    }
  }
  if (donViID) {
    // Logic lọc theo đơn vị đã được đơn giản hóa để hoạt động với mô hình mới
    whereClauses.push(`
            EXISTS (
                SELECT 1 FROM NguoiDung_VaiTro ndvt_dv
                JOIN VaiTroHeThong vt_dv ON ndvt_dv.VaiTroID = vt_dv.VaiTroID
                WHERE ndvt_dv.NguoiDungID = nd.NguoiDungID AND ndvt_dv.DonViID = @DonViID AND vt_dv.MaVaiTro = 'THANH_VIEN_DON_VI'
            )
        `);
    queryParams.push({ name: 'DonViID', type: sql.Int, value: donViID });
  }

  // Các điều kiện lọc khác
  if (searchTerm) {
    whereClauses.push(
      `(nd.HoTen LIKE @SearchTerm OR nd.Email LIKE @SearchTerm OR nd.MaDinhDanh LIKE @SearchTerm)`
    );
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }
  if (typeof isActive === 'boolean') {
    whereClauses.push(`nd.IsActive = @IsActive`);
    queryParams.push({ name: 'IsActive', type: sql.Bit, value: isActive });
  }

  const whereClauseString = `WHERE ${whereClauses.join(' AND ')}`;

  // Query đếm tổng số
  const countQuery = `SELECT COUNT(DISTINCT nd.NguoiDungID) AS TotalItems ${fromClause} ${whereClauseString}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  // Query lấy danh sách
  const allowedSortBy = [
    'nd.HoTen',
    'nd.Email',
    'nd.NgayTao',
    'tk.TrangThaiTk',
  ];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'nd.HoTen';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        SELECT DISTINCT
            nd.NguoiDungID, nd.MaDinhDanh, nd.HoTen, nd.Email, nd.SoDienThoai, 
            nd.AnhDaiDien, nd.NgaySinh, nd.IsActive, nd.NgayTao, tk.TrangThaiTk
        ${fromClause}
        ${whereClauseString}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
    `;
  queryParams.push({ name: 'Offset', type: sql.Int, value: offset });
  queryParams.push({ name: 'Limit', type: sql.Int, value: limit });

  const itemsResult = await executeQuery(itemsQuery, queryParams);

  // Chỉ trả về dữ liệu thô, service sẽ làm giàu dữ liệu
  return { items: itemsResult.recordset, totalItems };
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
      : null, // Format YYYY-MM-DD
    trangThaiHocTap: row.TrangThaiHocTap,
  };
};

/**
 * [SỬA ĐỔI] Lấy thông tin chi tiết GiangVien bằng NguoiDungID.
 * Sẽ không lấy thông tin đơn vị công tác ở đây nữa, vì nó sẽ được lấy qua vai trò.
 */
const getThongTinGiangVienByNguoiDungID = async (nguoiDungID) => {
  const query = `
        SELECT
            nd.MaDinhDanh AS MaGiangVien, tgv.HocVi, tgv.HocHam, tgv.ChucDanhGD, tgv.ChuyenMonChinh
        FROM ThongTinGiangVien tgv
        JOIN NguoiDung nd ON tgv.NguoiDungID = nd.NguoiDungID
        WHERE tgv.NguoiDungID = @NguoiDungID;
    `;
  const params = [{ name: 'NguoiDungID', type: sql.Int, value: nguoiDungID }];
  const result = await executeQuery(query, params);
  if (result.recordset.length === 0) return null;

  const row = result.recordset[0];
  return {
    maGiangVien: row.MaGiangVien,
    hocVi: row.HocVi,
    hocHam: row.HocHam,
    chucDanhGD: row.ChucDanhGD,
    chuyenMonChinh: row.ChuyenMonChinh,
  };
};
/**
 * [THÊM MỚI] Lấy đơn vị công tác của người dùng.
 * @param {number} nguoiDungID
 * @returns {Promise<object|null>} Thông tin đơn vị hoặc null
 */
const getDonViCongTacByNguoiDungID = async (nguoiDungID) => {
  const query = `
        SELECT TOP 1 
            dv.DonViID, dv.TenDonVi, dv.MaDonVi, dv.LoaiDonVi
        FROM NguoiDung_VaiTro ndvt
        JOIN VaiTroHeThong vt ON ndvt.VaiTroID = vt.VaiTroID
        JOIN DonVi dv ON ndvt.DonViID = dv.DonViID
        WHERE ndvt.NguoiDungID = @NguoiDungID 
          AND vt.MaVaiTro = @MaVaiTroThanhVien
          AND (ndvt.NgayKetThuc IS NULL OR ndvt.NgayKetThuc >= GETDATE())
        ORDER BY ndvt.NgayBatDau DESC;
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
    const dv = result.recordset[0];
    return {
      donViID: dv.DonViID,
      tenDonVi: dv.TenDonVi,
      maDonVi: dv.MaDonVi,
      loaiDonVi: dv.LoaiDonVi,
    };
  }
  return null;
};

/**
 * Cập nhật mật khẩu cho tài khoản.
 * @param {number} nguoiDungID
 * @param {string} newMatKhauHash
 * @returns {Promise<void>}
 */
const updatePasswordByNguoiDungID = async (nguoiDungID, newMatKhauHash) => {
  const query = `
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
    INSERT INTO ThongTinGiangVien (NguoiDungID, HocVi, HocHam, ChucDanhGD, ChuyenMonChinh)
    VALUES (@NguoiDungID, @HocVi, @HocHam, @ChucDanhGD, @ChuyenMonChinh);
  `;
  const params = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
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
    const requestCheck = transaction.request();
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
        const requestUpdate = transaction.request();
        params.forEach((p) => requestUpdate.input(p.name, p.type, p.value));
        await requestUpdate.query(updateQuery);
      }
    } else {
      await createThongTinSinhVienRecord(nguoiDungID, dataSV, transaction);
    }
  }
};

/**
 * [SỬA LỖI - TRIỆT ĐỂ] Thêm mới hoặc cập nhật/xóa ThongTinGiangVien.
 * ĐÃ LOẠI BỎ logic liên quan đến DonViCongTacID.
 * @param {number} nguoiDungID
 * @param {object|null} dataGV - Thông tin giảng viên hoặc null để xóa.
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const upsertOrDeleteThongTinGiangVien = async (
  nguoiDungID,
  dataGV, // dataGV giờ sẽ không còn chứa donViCongTacID nữa
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
    const requestCheck = transaction.request();
    requestCheck.input('NguoiDungIDCheck', sql.Int, nguoiDungID);
    const existingGV = await requestCheck.query(checkQuery);

    if (existingGV.recordset.length > 0) {
      // Update
      const setClauses = [];
      const params = [
        { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
      ];
      // <<<< KHÔNG CÒN DonViCongTacID ở đây >>>>
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
        const requestUpdate = transaction.request();
        params.forEach((p) => requestUpdate.input(p.name, p.type, p.value));
        await requestUpdate.query(updateQuery);
      }
    } else {
      // Create - Đã loại bỏ DonViCongTacID
      const query = `
        INSERT INTO ThongTinGiangVien (NguoiDungID, HocVi, HocHam, ChucDanhGD, ChuyenMonChinh)
        VALUES (@NguoiDungID, @HocVi, @HocHam, @ChucDanhGD, @ChuyenMonChinh);
      `;
      const params = [
        { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
        { name: 'HocVi', type: sql.NVarChar(100), value: dataGV.hocVi },
        { name: 'HocHam', type: sql.NVarChar(100), value: dataGV.hocHam },
        {
          name: 'ChucDanhGD',
          type: sql.NVarChar(100),
          value: dataGV.chucDanhGD,
        },
        {
          name: 'ChuyenMonChinh',
          type: sql.NVarChar(255),
          value: dataGV.chuyenMonChinh,
        },
      ];
      const request = transaction.request();
      params.forEach((p) => request.input(p.name, p.type, p.value));
      await request.query(query);
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

/**
 * Xóa cứng người dùng theo NguoiDungID. Nếu bị ràng buộc khóa ngoại sẽ báo lỗi chi tiết.
 * @param {number} nguoiDungID
 * @returns {Promise<number>} Số dòng bị xóa (1 nếu thành công)
 * @throws {Error} Nếu bị ràng buộc khóa ngoại sẽ ném lỗi với message chi tiết
 */
const deleteNguoiDungByID = async (nguoiDungID) => {
  const query = `DELETE FROM NguoiDung WHERE NguoiDungID = @NguoiDungID;`;
  const params = [{ name: 'NguoiDungID', type: sql.Int, value: nguoiDungID }];
  try {
    const request = (await getPool()).request();
    params.forEach((p) => request.input(p.name, p.type, p.value));
    const result = await request.query(query);
    return result.rowsAffected[0];
  } catch (err) {
    // Kiểm tra lỗi khóa ngoại
    if (
      err &&
      err.originalError &&
      err.originalError.info &&
      err.originalError.info.message
    ) {
      const msg = err.originalError.info.message;
      if (msg.includes('conflicted with the REFERENCE constraint')) {
        // Lấy tên bảng liên quan nếu có
        const match = msg.match(/table \'dbo\\.(\w+)\'/i);
        const table = match ? match[1] : 'liên kết dữ liệu khác';
        throw new Error(
          `Không thể xóa người dùng vì còn dữ liệu liên quan đến bảng: ${table}`
        );
      }
    }
    throw err;
  }
};

/**
 * [THÊM MỚI] Xóa tất cả các bản ghi NguoiDung_VaiTro của một người dùng theo một mã vai trò cụ thể.
 * Hữu ích để dọn dẹp vai trò cũ khi thay đổi loại người dùng.
 * @param {number} nguoiDungID
 * @param {number} vaiTroID
 * @param {sql.Transaction} [transaction=null]
 * @returns {Promise<void>}
 */
const deleteNguoiDungVaiTroByVaiTroID = async (
  nguoiDungID,
  vaiTroID,
  transaction = null
) => {
  const query = `DELETE FROM NguoiDung_VaiTro WHERE NguoiDungID = @NguoiDungID AND VaiTroID = @VaiTroID;`;
  const params = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
    { name: 'VaiTroID', type: sql.Int, value: vaiTroID },
  ];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  await request.query(query);
};

/**
 * [MỚI] Tìm kiếm người dùng (SV/GV) để mời tham gia sự kiện.
 * @param {object} params - Tham số tìm kiếm và lọc.
 * @returns {Promise<Array<object>>} Danh sách người dùng phù hợp.
 */
const findUsersForInvitation = async (params) => {
  const {
    suKienID,
    searchTerm,
    loaiNguoiDung,
    donViID,
    nganhHocID,
    lopID,
    limit = 15,
  } = params;

  const selectFields = `
        SELECT TOP (@Limit)
            nd.NguoiDungID,
            nd.MaDinhDanh,
            nd.HoTen,
            nd.Email,
            nd.AnhDaiDien,
            -- Xác định loại người dùng và thông tin thêm
            CASE
                WHEN tsv.NguoiDungID IS NOT NULL THEN N'Sinh viên'
                WHEN tgv.NguoiDungID IS NOT NULL THEN N'Giảng viên'
                ELSE N'Nhân viên khác'
            END AS loaiNguoiDungHienThi,
            CASE
                WHEN tsv.NguoiDungID IS NOT NULL THEN lh.TenLop + N' - ' + nh.TenNganhHoc
                WHEN tgv.NguoiDungID IS NOT NULL THEN dv_ct.TenDonVi + ISNULL(N' - ' + tgv.ChuyenMonChinh, '')
                ELSE ''
            END AS thongTinThem
    `;

  const fromClauses = `
        FROM NguoiDung nd
        LEFT JOIN ThongTinSinhVien tsv ON nd.NguoiDungID = tsv.NguoiDungID
        LEFT JOIN LopHoc lh ON tsv.LopID = lh.LopID
        LEFT JOIN NganhHoc nh ON lh.NganhHocID = nh.NganhHocID
        LEFT JOIN ThongTinGiangVien tgv ON nd.NguoiDungID = tgv.NguoiDungID
        LEFT JOIN NguoiDung_VaiTro ndvt_ct ON tgv.NguoiDungID = ndvt_ct.NguoiDungID
        LEFT JOIN VaiTroHeThong vt_ct ON ndvt_ct.VaiTroID = vt_ct.VaiTroID AND vt_ct.MaVaiTro = @MaVaiTroThanhVien
        LEFT JOIN DonVi dv_ct ON ndvt_ct.DonViID = dv_ct.DonViID
    `;

  const whereClauses = [
    'nd.IsActive = 1',
    // Loại trừ những người đã được mời cho sự kiện này
    'nd.NguoiDungID NOT IN (SELECT NguoiDuocMoiID FROM SK_MoiThamGia WHERE SuKienID = @SuKienID)',
  ];

  const queryParams = [
    { name: 'Limit', type: sql.Int, value: limit },
    { name: 'SuKienID', type: sql.Int, value: suKienID },
    {
      name: 'MaVaiTroThanhVien',
      type: sql.VarChar,
      value: MaVaiTro.THANH_VIEN_DON_VI,
    },
  ];

  if (searchTerm) {
    whereClauses.push(
      `(nd.HoTen LIKE @SearchTerm OR nd.MaDinhDanh LIKE @SearchTerm OR nd.Email LIKE @SearchTerm)`
    );
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }

  if (loaiNguoiDung) {
    if (loaiNguoiDung === 'SINH_VIEN')
      whereClauses.push('tsv.NguoiDungID IS NOT NULL');
    if (loaiNguoiDung === 'GIANG_VIEN')
      whereClauses.push('tgv.NguoiDungID IS NOT NULL');
  }

  if (donViID) {
    // Lọc theo Khoa/Bộ môn
    whereClauses.push(
      `(nh.KhoaQuanLyID = @DonViID OR dv_ct.DonViID = @DonViID)`
    );
    queryParams.push({ name: 'DonViID', type: sql.Int, value: donViID });
  }

  if (nganhHocID) {
    whereClauses.push(`(lh.NganhHocID = @NganhHocID)`);
    queryParams.push({ name: 'NganhHocID', type: sql.Int, value: nganhHocID });
  }

  if (lopID) {
    whereClauses.push(`(tsv.LopID = @LopID)`);
    queryParams.push({ name: 'LopID', type: sql.Int, value: lopID });
  }

  const finalQuery = `
        ${selectFields}
        ${fromClauses}
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY nd.HoTen ASC;
    `;

  const result = await executeQuery(finalQuery, queryParams);
  return result.recordset;
};

/**
 * [MỚI] Lấy thông tin cơ bản của nhiều người dùng bằng mảng ID.
 * @param {number[]} userIds - Mảng các NguoiDungID.
 * @param {sql.Transaction} transaction - Transaction đang hoạt động.
 * @returns {Promise<Array<{NguoiDungID: number, HoTen: string, Email: string}>>}
 */
const getUsersByIds = async (userIds, transaction) => {
  if (!userIds || userIds.length === 0) {
    return [];
  }

  // Tạo chuỗi tham số cho IN clause
  const idParams = userIds
    .map((id, index) => {
      const paramName = `UserID${index}`;
      return `@${paramName}`;
    })
    .join(',');

  const query = `
        SELECT NguoiDungID, HoTen, Email 
        FROM NguoiDung 
        WHERE NguoiDungID IN (${idParams}) AND IsActive = 1;
    `;

  const request = transaction.request();
  userIds.forEach((id, index) => {
    request.input(`UserID${index}`, sql.Int, id);
  });

  const result = await request.query(query);
  return result.recordset;
};

/**
 * [MỚI] Tìm kiếm người dùng theo nhiều tiêu chí phức tạp để mời hàng loạt.
 * @param {object} tieuChi - Object chứa các tiêu chí lọc từ payload.
 * @param {number[]} [excludeIds=[]] - Mảng các ID người dùng cần loại trừ.
 * @returns {Promise<Array<{NguoiDungID: number}>>} Mảng các object chỉ chứa NguoiDungID.
 */
const findUsersByCriteria = async (tieuChi, excludeIds = []) => {
  const {
    loaiNguoiDung,
    donViIDs,
    nganhHocIDs,
    lopIDs,
    nienKhoaSV,
    trangThaiHocTapSV,
    hocViGV,
  } = tieuChi;

  let fromClause = 'FROM NguoiDung nd';
  const whereClauses = ['nd.IsActive = 1'];
  const queryParams = [];

  // Base joins and filters based on user type
  if (loaiNguoiDung.startsWith('SINH_VIEN') || loaiNguoiDung === 'TAT_CA_SV') {
    fromClause += ` 
            JOIN ThongTinSinhVien tsv ON nd.NguoiDungID = tsv.NguoiDungID
            JOIN LopHoc lh ON tsv.LopID = lh.LopID
            JOIN NganhHoc nh ON lh.NganhHocID = nh.NganhHocID
        `;
    if (trangThaiHocTapSV) {
      whereClauses.push(`tsv.TrangThaiHocTap = @TrangThaiHocTapSV`);
      queryParams.push({
        name: 'TrangThaiHocTapSV',
        type: sql.NVarChar,
        value: trangThaiHocTapSV,
      });
    }
    if (nienKhoaSV) {
      whereClauses.push(`tsv.KhoaHoc = @NienKhoaSV`);
      queryParams.push({
        name: 'NienKhoaSV',
        type: sql.VarChar,
        value: nienKhoaSV,
      });
    }
  }
  if (loaiNguoiDung.startsWith('GIANG_VIEN') || loaiNguoiDung === 'TAT_CA_GV') {
    fromClause += ` 
            JOIN ThongTinGiangVien tgv ON nd.NguoiDungID = tgv.NguoiDungID
            JOIN NguoiDung_VaiTro ndvt ON nd.NguoiDungID = ndvt.NguoiDungID
            JOIN VaiTroHeThong vt ON ndvt.VaiTroID = vt.VaiTroID AND vt.MaVaiTro = @MaVaiTroThanhVien
        `;
    queryParams.push({
      name: 'MaVaiTroThanhVien',
      type: sql.VarChar,
      value: MaVaiTro.THANH_VIEN_DON_VI,
    });
    if (hocViGV) {
      whereClauses.push(`tgv.HocVi = @HocViGV`);
      queryParams.push({ name: 'HocViGV', type: sql.NVarChar, value: hocViGV });
    }
  }

  // Dynamic filtering
  if (loaiNguoiDung === 'SINH_VIEN_THEO_LOP' && lopIDs?.length > 0) {
    whereClauses.push(`tsv.LopID IN (${lopIDs.join(',')})`);
  }
  if (loaiNguoiDung === 'SINH_VIEN_THEO_NGANH' && nganhHocIDs?.length > 0) {
    whereClauses.push(`lh.NganhHocID IN (${nganhHocIDs.join(',')})`);
  }
  if (
    (loaiNguoiDung === 'SINH_VIEN_THEO_KHOA' ||
      loaiNguoiDung === 'TAT_CA_SV') &&
    donViIDs?.length > 0
  ) {
    whereClauses.push(`nh.KhoaQuanLyID IN (${donViIDs.join(',')})`);
  }
  if (
    (loaiNguoiDung === 'GIANG_VIEN_THEO_KHOA' ||
      loaiNguoiDung === 'TAT_CA_GV') &&
    donViIDs?.length > 0
  ) {
    whereClauses.push(`ndvt.DonViID IN (${donViIDs.join(',')})`);
  }

  // Loại trừ các ID được chỉ định
  if (excludeIds.length > 0) {
    whereClauses.push(`nd.NguoiDungID NOT IN (${excludeIds.join(',')})`);
  }

  const query = `
        SELECT DISTINCT nd.NguoiDungID
        ${fromClause}
        WHERE ${whereClauses.join(' AND ')};
    `;

  const result = await executeQuery(query, queryParams);
  return result.recordset;
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
  // mapNguoiDungListItem,
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
  deleteNguoiDungByID,
  getDonViCongTacByNguoiDungID,
  deleteNguoiDungVaiTroByVaiTroID,
  findUsersForInvitation,
  getUsersByIds,
  findUsersByCriteria,
};
