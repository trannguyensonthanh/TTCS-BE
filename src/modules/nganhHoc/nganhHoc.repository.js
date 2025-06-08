// src/modules/nganhHoc/nganhHoc.repository.js
import { executeQuery, getPool } from '../../utils/database.js';
import sql from 'mssql';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
/**
 * Lấy danh sách Ngành Học tối giản cho select options.
 * @param {object} params - { searchTerm, khoaQuanLyID, limit }
 * @returns {Promise<Array<object>>} Danh sách ngành học tối giản
 */
const getNganhHocForSelect = async (params) => {
  const { searchTerm, khoaQuanLyID, limit = 200 } = params;

  let query = `
        SELECT TOP (@Limit)
            NganhHocID,
            TenNganhHoc,
            MaNganhHoc,
            CoChuyenNganh
        FROM NganhHoc
        WHERE 1=1
    `;

  const queryParams = [{ name: 'Limit', type: sql.Int, value: limit }];

  if (khoaQuanLyID) {
    query += ` AND KhoaQuanLyID = @KhoaQuanLyID`;
    queryParams.push({
      name: 'KhoaQuanLyID',
      type: sql.Int,
      value: khoaQuanLyID,
    });
  }
  if (searchTerm) {
    query += ` AND (TenNganhHoc LIKE @SearchTerm OR MaNganhHoc LIKE @SearchTerm)`;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }

  query += ` ORDER BY TenNganhHoc ASC;`;

  const result = await executeQuery(query, queryParams);
  return result.recordset.map((row) => ({
    nganhHocID: row.NganhHocID,
    tenNganhHoc: row.TenNganhHoc,
    maNganhHoc: row.MaNganhHoc,
    coChuyenNganh: row.CoChuyenNganh === 1,
  }));
};

const SELECT_NGANHHOC_FIELDS = `
    nh.NganhHocID, nh.TenNganhHoc, nh.MaNganhHoc, nh.MoTaNH, nh.CoChuyenNganh,
    dv_khoa.DonViID AS KhoaQL_ID, dv_khoa.TenDonVi AS KhoaQL_Ten, dv_khoa.MaDonVi AS KhoaQL_Ma
`;
const FROM_JOIN_NGANHHOC = `
    FROM NganhHoc nh
    JOIN DonVi dv_khoa ON nh.KhoaQuanLyID = dv_khoa.DonViID AND dv_khoa.LoaiDonVi = 'KHOA'
`;

/**
 * Chuyển đổi một dòng dữ liệu SQL thành object ngành học chuẩn.
 * @param {object} row - Dòng dữ liệu từ SQL
 * @returns {object} Object ngành học chuẩn
 */
const mapRowToNganhHocResponse = (row) => ({
  nganhHocID: row.NganhHocID,
  tenNganhHoc: row.TenNganhHoc,
  maNganhHoc: row.MaNganhHoc,
  khoaQuanLy: {
    donViID: row.KhoaQL_ID,
    tenDonVi: row.KhoaQL_Ten,
    maDonVi: row.KhoaQL_Ma,
    loaiDonVi: 'KHOA',
  },
  moTaNH: row.MoTaNH,
  coChuyenNganh: row.CoChuyenNganh,
});

/**
 * Lấy danh sách ngành học có phân trang, lọc, sắp xếp.
 * @param {object} params - Tham số truy vấn (searchTerm, khoaQuanLyID, coChuyenNganh, page, limit, sortBy, sortOrder)
 * @returns {Promise<{items: Array<object>, totalItems: number}>} Danh sách ngành học và tổng số bản ghi
 */
const getNganhHocListWithPagination = async (params) => {
  const {
    searchTerm,
    khoaQuanLyID,
    coChuyenNganh,
    page = 1,
    limit = 10,
    sortBy = 'nh.TenNganhHoc',
    sortOrder = 'ASC',
  } = params;
  let whereClause = ` WHERE 1=1 `;
  const queryParams = [];

  if (searchTerm) {
    whereClause += ` AND (nh.TenNganhHoc LIKE @SearchTerm OR nh.MaNganhHoc LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
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
  if (typeof coChuyenNganh === 'boolean') {
    whereClause += ` AND nh.CoChuyenNganh = @CoChuyenNganh `;
    queryParams.push({
      name: 'CoChuyenNganh',
      type: sql.Bit,
      value: coChuyenNganh,
    });
  }

  const countQuery = `SELECT COUNT(DISTINCT nh.NganhHocID) AS TotalItems ${FROM_JOIN_NGANHHOC} ${whereClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = [
    'nh.TenNganhHoc',
    'nh.MaNganhHoc',
    'dv_khoa.TenDonVi',
    'nh.CoChuyenNganh',
  ];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'nh.TenNganhHoc';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        SELECT ${SELECT_NGANHHOC_FIELDS},
               (SELECT COUNT(*) FROM ChuyenNganh cn_count WHERE cn_count.NganhHocID = nh.NganhHocID) AS SoLuongChuyenNganh,
               (SELECT COUNT(*) FROM LopHoc lh_count WHERE lh_count.NganhHocID = nh.NganhHocID) AS SoLuongLop
        ${FROM_JOIN_NGANHHOC}
        ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}, nh.NganhHocID ${safeSortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
    `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);
  const items = itemsResult.recordset.map((row) => ({
    ...mapRowToNganhHocResponse(row),
    soLuongChuyenNganh: row.SoLuongChuyenNganh,
    soLuongLop: row.SoLuongLop,
  }));
  return { items, totalItems };
};

/**
 * Lấy chi tiết ngành học theo ID, có thể kèm chuyên ngành.
 * @param {number} nganhHocID - ID ngành học
 * @param {boolean} [fetchChuyenNganhs=false] - Có lấy chuyên ngành không
 * @returns {Promise<object|null>} Thông tin ngành học hoặc null nếu không tìm thấy
 */
const getNganhHocById = async (nganhHocID, fetchChuyenNganhs = false) => {
  const query = `SELECT ${SELECT_NGANHHOC_FIELDS} ${FROM_JOIN_NGANHHOC} WHERE nh.NganhHocID = @NganhHocID;`;
  const params = [{ name: 'NganhHocID', type: sql.Int, value: nganhHocID }];
  const result = await executeQuery(query, params);
  if (result.recordset.length === 0) return null;

  const nganhHocData = mapRowToNganhHocResponse(result.recordset[0]);

  if (fetchChuyenNganhs && nganhHocData.coChuyenNganh) {
    const cnQuery = `SELECT ChuyenNganhID, TenChuyenNganh, MaChuyenNganh, MoTaCN FROM ChuyenNganh WHERE NganhHocID = @NganhHocID ORDER BY TenChuyenNganh;`;
    const cnResult = await executeQuery(cnQuery, params);
    nganhHocData.chuyenNganhs = cnResult.recordset.map((cn) => ({
      chuyenNganhID: cn.ChuyenNganhID,
      tenChuyenNganh: cn.TenChuyenNganh,
      maChuyenNganh: cn.MaChuyenNganh,
      nganhHocID: nganhHocID,
      moTaCN: cn.MoTaCN,
    }));
  }
  return nganhHocData;
};

/**
 * Lấy ngành học theo mã, có thể loại trừ một ID.
 * @param {string} maNganhHoc - Mã ngành học
 * @param {number|null} [excludeNganhHocID=null] - ID ngành học cần loại trừ
 * @returns {Promise<object|null>} Thông tin ngành học hoặc null nếu không tìm thấy
 */
const getNganhHocByMa = async (maNganhHoc, excludeNganhHocID = null) => {
  if (!maNganhHoc) return null;
  let query = `SELECT NganhHocID, MaNganhHoc FROM NganhHoc WHERE MaNganhHoc = @MaNganhHoc`;
  const params = [
    { name: 'MaNganhHoc', type: sql.VarChar(50), value: maNganhHoc },
  ];
  if (excludeNganhHocID) {
    query += ` AND NganhHocID <> @ExcludeNganhHocID`;
    params.push({
      name: 'ExcludeNganhHocID',
      type: sql.Int,
      value: excludeNganhHocID,
    });
  }
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Tạo mới một bản ghi ngành học.
 * @param {object} data - Thông tin ngành học ({ tenNganhHoc, maNganhHoc, khoaQuanLyID, moTaNH, coChuyenNganh })
 * @param {sql.Transaction|null} [transaction=null] - Transaction SQL tùy chọn
 * @returns {Promise<number>} ID ngành học vừa tạo
 */
const createNganhHocRecord = async (data, transaction = null) => {
  const { tenNganhHoc, maNganhHoc, khoaQuanLyID, moTaNH, coChuyenNganh } = data;
  const query = `
        INSERT INTO NganhHoc (TenNganhHoc, MaNganhHoc, KhoaQuanLyID, MoTaNH, CoChuyenNganh)
        OUTPUT inserted.NganhHocID
        VALUES (@TenNganhHoc, @MaNganhHoc, @KhoaQuanLyID, @MoTaNH, @CoChuyenNganh);
    `;
  const params = [];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.push({
    name: 'TenNganhHoc',
    type: sql.NVarChar(200),
    value: tenNganhHoc,
  });
  params.push({ name: 'MaNganhHoc', type: sql.VarChar(50), value: maNganhHoc });
  params.push({ name: 'KhoaQuanLyID', type: sql.Int, value: khoaQuanLyID });
  params.push({ name: 'MoTaNH', type: sql.NVarChar(sql.MAX), value: moTaNH });
  params.push({ name: 'CoChuyenNganh', type: sql.Bit, value: coChuyenNganh });
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset[0].NganhHocID;
};

/**
 * Cập nhật thông tin ngành học theo ID.
 * @param {number} nganhHocID - ID ngành học
 * @param {object} updateData - Thông tin cập nhật
 * @param {sql.Transaction|null} [transaction=null] - Transaction SQL tùy chọn
 * @returns {Promise<object|null>} Thông tin ngành học sau khi cập nhật hoặc null nếu không có gì thay đổi
 */
const updateNganhHocRecordById = async (
  nganhHocID,
  updateData,
  transaction = null
) => {
  console.log('updateData', updateData);
  console.log('nganhHocID', nganhHocID);
  const setClauses = [];
  const params = [{ name: 'NganhHocID', type: sql.Int, value: nganhHocID }];

  if (updateData.tenNganhHoc !== undefined) {
    setClauses.push('TenNganhHoc = @TenNganhHoc');
    params.push({
      name: 'TenNganhHoc',
      type: sql.NVarChar(200),
      value: updateData.tenNganhHoc,
    });
  }
  if (updateData.maNganhHoc !== undefined) {
    setClauses.push('MaNganhHoc = @MaNganhHoc');
    params.push({
      name: 'MaNganhHoc',
      type: sql.VarChar(50),
      value: updateData.maNganhHoc,
    });
  }

  if (updateData.khoaQuanLyID !== undefined) {
    setClauses.push('KhoaQuanLyID = @KhoaQuanLyID');
    params.push({
      name: 'KhoaQuanLyID',
      type: sql.Int,
      value: updateData.khoaQuanLyID,
    });
  }

  if (updateData.moTaNH !== undefined) {
    setClauses.push('MoTaNH = @MoTaNH');
    params.push({
      name: 'MoTaNH',
      type: sql.NVarChar(sql.MAX),
      value: updateData.moTaNH,
    });
  }

  if (updateData.coChuyenNganh !== undefined) {
    setClauses.push('CoChuyenNganh = @CoChuyenNganh');
    params.push({
      name: 'CoChuyenNganh',
      type: sql.Bit,
      value: updateData.coChuyenNganh ? 1 : 0,
    });
  }

  if (setClauses.length === 0) return { NganhHocID: nganhHocID };
  const query = `UPDATE NganhHoc SET ${setClauses.join(', ')} OUTPUT inserted.NganhHocID WHERE NganhHocID = @NganhHocID;`;

  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Xóa một ngành học theo ID (nếu không có chuyên ngành/lớp học liên kết).
 * @param {number} nganhHocID - ID ngành học
 * @param {sql.Transaction|null} [transaction=null] - Transaction SQL tùy chọn
 * @returns {Promise<number>} Số dòng bị xóa (0 hoặc 1)
 * @throws {ApiError} Nếu ngành học có chuyên ngành hoặc lớp học liên kết
 */
const deleteNganhHocRecordById = async (nganhHocID, transaction = null) => {
  // 1. Kiểm tra ChuyenNganh
  let request = transaction
    ? transaction.request()
    : (await getPool()).request();
  request.input('NganhHocID', sql.Int, nganhHocID);
  let result = await request.query(
    `SELECT COUNT(*) as count FROM ChuyenNganh WHERE NganhHocID = @NganhHocID`
  );
  if (result.recordset[0].count > 0)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Ngành học này có chuyên ngành liên kết, không thể xóa.'
    );

  // 2. Kiểm tra LopHoc
  request = transaction ? transaction.request() : (await getPool()).request();
  request.input('NganhHocID', sql.Int, nganhHocID);
  result = await request.query(
    `SELECT COUNT(*) as count FROM LopHoc WHERE NganhHocID = @NganhHocID`
  );
  if (result.recordset[0].count > 0)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Ngành học này có lớp học liên kết, không thể xóa.'
    );

  const deleteQuery = `DELETE FROM NganhHoc WHERE NganhHocID = @NganhHocID;`;
  request = transaction ? transaction.request() : (await getPool()).request();
  request.input('NganhHocID', sql.Int, nganhHocID);
  result = await request.query(deleteQuery);
  return result.rowsAffected[0];
};

export const nganhHocRepository = {
  getNganhHocForSelect,
  getNganhHocListWithPagination,
  getNganhHocById,
  getNganhHocByMa,
  createNganhHocRecord,
  updateNganhHocRecordById,
  deleteNganhHocRecordById,
};
