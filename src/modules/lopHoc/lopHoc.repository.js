// src/modules/lopHoc/lopHoc.repository.js
import { executeQuery, getPool } from '../../utils/database.js';
import sql from 'mssql';

const SELECT_LOPHOC_FIELDS = `
    lh.LopID, lh.TenLop, lh.MaLop, lh.NienKhoa,
    nh.NganhHocID AS NganhHoc_ID, nh.TenNganhHoc AS NganhHoc_Ten, nh.MaNganhHoc AS NganhHoc_Ma,
    cn.ChuyenNganhID AS ChuyenNganh_ID, cn.TenChuyenNganh AS ChuyenNganh_Ten, cn.MaChuyenNganh AS ChuyenNganh_Ma,
    dv_khoa.DonViID AS KhoaQuanLy_ID, dv_khoa.TenDonVi AS KhoaQuanLy_Ten, dv_khoa.MaDonVi AS KhoaQuanLy_Ma
`;

const FROM_JOIN_LOPHOC = `
    FROM LopHoc lh
    JOIN NganhHoc nh ON lh.NganhHocID = nh.NganhHocID
    JOIN DonVi dv_khoa ON nh.KhoaQuanLyID = dv_khoa.DonViID AND dv_khoa.LoaiDonVi = 'KHOA'
    LEFT JOIN ChuyenNganh cn ON lh.ChuyenNganhID = cn.ChuyenNganhID
`;

/**
 * Lấy danh sách LopHoc với phân trang và bộ lọc
 */
const getLopHocListWithPagination = async (params) => {
  const {
    searchTerm,
    nganhHocID,
    chuyenNganhID,
    khoaQuanLyID,
    nienKhoa,
    page = 1,
    limit = 10,
    sortBy = 'lh.TenLop',
    sortOrder = 'ASC',
  } = params;

  let whereClause = ` WHERE 1=1 `;
  const queryParams = [];

  if (searchTerm) {
    whereClause += ` AND (lh.TenLop LIKE @SearchTerm OR lh.MaLop LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }
  if (nganhHocID) {
    whereClause += ` AND lh.NganhHocID = @NganhHocID `;
    queryParams.push({ name: 'NganhHocID', type: sql.Int, value: nganhHocID });
  }
  if (chuyenNganhID) {
    whereClause += ` AND lh.ChuyenNganhID = @ChuyenNganhID `;
    queryParams.push({
      name: 'ChuyenNganhID',
      type: sql.Int,
      value: chuyenNganhID,
    });
  }
  if (khoaQuanLyID) {
    whereClause += ` AND nh.KhoaQuanLyID = @KhoaQuanLyID `;
    queryParams.push({
      name: 'KhoaQuanLyID',
      type: sql.Int,
      value: khoaQuanLyID,
    });
  }
  if (nienKhoa) {
    whereClause += ` AND lh.NienKhoa = @NienKhoa `;
    queryParams.push({
      name: 'NienKhoa',
      type: sql.VarChar(50),
      value: nienKhoa,
    });
  }

  // Đếm số lượng sinh viên cho mỗi lớp (subquery)
  const soLuongSinhVienSubQuery = `(SELECT COUNT(*) FROM ThongTinSinhVien tsv_count WHERE tsv_count.LopID = lh.LopID)`;

  const countQuery = `SELECT COUNT(DISTINCT lh.LopID) AS TotalItems ${FROM_JOIN_LOPHOC} ${whereClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = [
    'lh.TenLop',
    'lh.MaLop',
    'nh.TenNganhHoc',
    'lh.NienKhoa',
  ];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'lh.TenLop';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        SELECT ${SELECT_LOPHOC_FIELDS}, ${soLuongSinhVienSubQuery} AS SoLuongSinhVien
        ${FROM_JOIN_LOPHOC}
        ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}, lh.LopID ${safeSortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
    `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);
  const items = itemsResult.recordset.map((row) => ({
    lopID: row.LopID,
    tenLop: row.TenLop,
    maLop: row.MaLop,
    nganhHoc: {
      nganhHocID: row.NganhHoc_ID,
      tenNganhHoc: row.NganhHoc_Ten,
      maNganhHoc: row.NganhHoc_Ma,
    },
    chuyenNganh: row.ChuyenNganh_ID
      ? {
          chuyenNganhID: row.ChuyenNganh_ID,
          tenChuyenNganh: row.ChuyenNganh_Ten,
          maChuyenNganh: row.ChuyenNganh_Ma,
        }
      : null,
    khoaQuanLy: {
      donViID: row.KhoaQuanLy_ID,
      tenDonVi: row.KhoaQuanLy_Ten,
      maDonVi: row.KhoaQuanLy_Ma,
      loaiDonVi: 'KHOA',
    },
    nienKhoa: row.NienKhoa,
    soLuongSinhVien: row.SoLuongSinhVien,
  }));
  return { items, totalItems };
};

const getLopHocDetailById = async (lopID) => {
  const soLuongSinhVienSubQuery = `(SELECT COUNT(*) FROM ThongTinSinhVien tsv_count WHERE tsv_count.LopID = lh.LopID)`;
  const query = `
    SELECT ${SELECT_LOPHOC_FIELDS}, ${soLuongSinhVienSubQuery} AS SoLuongSinhVien
    -- Thêm các trường chi tiết khác của LopHoc nếu có
    ${FROM_JOIN_LOPHOC}
    WHERE lh.LopID = @LopID;
  `;
  const params = [{ name: 'LopID', type: sql.Int, value: lopID }];
  const result = await executeQuery(query, params);
  if (result.recordset.length === 0) return null;

  const row = result.recordset[0];
  return {
    lopID: row.LopID,
    tenLop: row.TenLop,
    maLop: row.MaLop,
    nganhHoc: {
      nganhHocID: row.NganhHoc_ID,
      tenNganhHoc: row.NganhHoc_Ten,
      maNganhHoc: row.NganhHoc_Ma,
    },
    chuyenNganh: row.ChuyenNganh_ID
      ? {
          chuyenNganhID: row.ChuyenNganh_ID,
          tenChuyenNganh: row.ChuyenNganh_Ten,
          maChuyenNganh: row.ChuyenNganh_Ma,
        }
      : null,
    khoaQuanLy: {
      donViID: row.KhoaQuanLy_ID,
      tenDonVi: row.KhoaQuanLy_Ten,
      maDonVi: row.KhoaQuanLy_Ma,
      loaiDonVi: 'KHOA',
    },
    nienKhoa: row.NienKhoa,
    soLuongSinhVien: row.SoLuongSinhVien,
    gvcn: gvcnData,
  };
};

// Hàm kiểm tra MaLop unique (dùng khi tạo/sửa)
const getLopHocByMaLop = async (maLop, excludeLopID = null) => {
  if (!maLop) return null;
  let query = `SELECT LopID, MaLop FROM LopHoc WHERE MaLop = @MaLop`;
  const params = [{ name: 'MaLop', type: sql.VarChar(50), value: maLop }];
  if (excludeLopID) {
    query += ` AND LopID <> @ExcludeLopID`;
    params.push({ name: 'ExcludeLopID', type: sql.Int, value: excludeLopID });
  }
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Lấy thông tin chi tiết một Lớp Học theo LopID (dùng transaction nếu có)
 * @param {number} lopID - ID của lớp học
 * @param {sql.Transaction} [transaction=null] - Transaction SQL tùy chọn
 * @returns {Promise<object|null>} Thông tin lớp học hoặc null nếu không tìm thấy
 */
const getLopHocById = async (lopID, transaction = null) => {
  const query = `
    SELECT ${SELECT_LOPHOC_FIELDS}
    ${FROM_JOIN_LOPHOC}
    WHERE lh.LopID = @LopID;
  `;
  const params = [{ name: 'LopID', type: sql.Int, value: lopID }];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();

  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Tạo mới một bản ghi Lớp Học
 * @param {object} lopHocData - Dữ liệu lớp học ({ tenLop, maLop, nganhHocID, chuyenNganhID, nienKhoa })
 * @param {sql.Transaction} [transaction=null] - Transaction SQL tùy chọn
 * @returns {Promise<number>} ID lớp học vừa tạo
 */
const createLopHocRecord = async (lopHocData, transaction = null) => {
  const { tenLop, maLop, nganhHocID, chuyenNganhID, nienKhoa } = lopHocData;
  const query = `
    INSERT INTO LopHoc (TenLop, MaLop, NganhHocID, ChuyenNganhID, NienKhoa)
    OUTPUT inserted.LopID
    VALUES (@TenLop, @MaLop, @NganhHocID, @ChuyenNganhID, @NienKhoa);
  `;
  const params = [
    { name: 'TenLop', type: sql.NVarChar(100), value: tenLop },
    { name: 'MaLop', type: sql.VarChar(50), value: maLop },
    { name: 'NganhHocID', type: sql.Int, value: nganhHocID },
    { name: 'ChuyenNganhID', type: sql.Int, value: chuyenNganhID },
    { name: 'NienKhoa', type: sql.VarChar(50), value: nienKhoa },
  ];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset[0].LopID;
};

/**
 * Cập nhật thông tin một Lớp Học
 * @param {number} lopID
 * @param {object} updateData - Các trường cần cập nhật cho bảng LopHoc
 * @param {sql.Transaction} [transaction=null]
 * @returns {Promise<object|null>} Bản ghi LopHoc đã được cập nhật (hoặc chỉ ID)
 */
const updateLopHocRecordById = async (
  lopID,
  updateData,
  transaction = null
) => {
  const setClauses = [];
  const params = [{ name: 'LopID', type: sql.Int, value: lopID }];

  const addUpdateField = (dbField, paramName, paramType, value) => {
    if (value !== undefined) {
      setClauses.push(`${dbField} = @${paramName}`);
      params.push({ name: paramName, type: paramType, value: value });
    }
  };

  addUpdateField('TenLop', 'TenLop', sql.NVarChar(100), updateData.tenLop);
  addUpdateField('MaLop', 'MaLop', sql.VarChar(50), updateData.maLop);
  addUpdateField('NganhHocID', 'NganhHocID', sql.Int, updateData.nganhHocID);
  addUpdateField(
    'ChuyenNganhID',
    'ChuyenNganhID',
    sql.Int,
    updateData.chuyenNganhID
  );
  addUpdateField('NienKhoa', 'NienKhoa', sql.VarChar(50), updateData.nienKhoa);

  if (setClauses.length === 0) {
    return { LopID: lopID };
  }

  const query = `
    UPDATE LopHoc
    SET ${setClauses.join(', ')}
    OUTPUT inserted.LopID -- Chỉ cần ID để lấy lại chi tiết đầy đủ sau
    WHERE LopID = @LopID;
  `;

  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Kiểm tra xem Lớp học có sinh viên nào đang tham chiếu không
 * @param {number} lopID
 * @param {sql.Transaction} [transaction=null]
 * @returns {Promise<boolean>} True nếu có sinh viên
 */
const checkLopHocUsageInThongTinSinhVien = async (
  lopID,
  transaction = null
) => {
  const query = `SELECT COUNT(*) AS SinhVienCount FROM ThongTinSinhVien WHERE LopID = @LopID;`;
  const params = [{ name: 'LopID', type: sql.Int, value: lopID }];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset[0].SinhVienCount > 0;
};

/**
 * Xóa một Lớp Học
 * @param {number} lopID
 * @param {sql.Transaction} [transaction=null]
 * @returns {Promise<number>} Số dòng bị ảnh hưởng (thường là 1 nếu xóa thành công)
 */
const deleteLopHocRecordById = async (lopID, transaction = null) => {
  // Kiểm tra ràng buộc đã được thực hiện ở service
  const query = `DELETE FROM LopHoc WHERE LopID = @LopID;`;
  const params = [{ name: 'LopID', type: sql.Int, value: lopID }];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.rowsAffected[0];
};

export const lopHocRepository = {
  getLopHocListWithPagination,
  getLopHocDetailById,
  getLopHocByMaLop,
  getLopHocById,
  createLopHocRecord,
  updateLopHocRecordById,
  checkLopHocUsageInThongTinSinhVien,
  deleteLopHocRecordById,
};
