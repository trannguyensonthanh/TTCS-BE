// src/modules/chuyenNganh/chuyenNganh.repository.js
import { executeQuery, getPool } from '../../utils/database.js';
import sql from 'mssql';

const SELECT_CHUYENNGANH_FIELDS = `
    cn.ChuyenNganhID, cn.TenChuyenNganh, cn.MaChuyenNganh, cn.MoTaCN,
    nh.NganhHocID AS NganhHoc_ID, nh.TenNganhHoc AS NganhHoc_Ten, nh.MaNganhHoc AS NganhHoc_Ma
`;
const FROM_JOIN_CHUYENNGANH = `
    FROM ChuyenNganh cn
    JOIN NganhHoc nh ON cn.NganhHocID = nh.NganhHocID
`;

const mapRowToChuyenNganhResponse = (row) => ({
  chuyenNganhID: row.ChuyenNganhID,
  tenChuyenNganh: row.TenChuyenNganh,
  maChuyenNganh: row.MaChuyenNganh,
  nganhHoc: {
    nganhHocID: row.NganhHoc_ID,
    tenNganhHoc: row.NganhHoc_Ten,
    maNganhHoc: row.NganhHoc_Ma,
  },
  moTaCN: row.MoTaCN,
});

/**
 * Lấy danh sách chuyên ngành tối giản của một ngành học cho select options.
 * @param {number} nganhHocId - ID ngành học
 * @param {object} params - { searchTerm?: string, limit?: number }
 * @returns {Promise<Array<{chuyenNganhID: number, tenChuyenNganh: string, maChuyenNganh: string}>>}
 */
const getChuyenNganhForSelectByNganh = async (nganhHocId, params) => {
  const { searchTerm, limit = 100 } = params;

  let query = `
        SELECT TOP (@Limit)
            ChuyenNganhID,
            TenChuyenNganh,
            MaChuyenNganh
        FROM ChuyenNganh
        WHERE NganhHocID = @NganhHocID
    `;

  const queryParams = [
    { name: 'Limit', type: sql.Int, value: limit },
    { name: 'NganhHocID', type: sql.Int, value: nganhHocId },
  ];

  if (searchTerm) {
    query += ` AND (TenChuyenNganh LIKE @SearchTerm OR MaChuyenNganh LIKE @SearchTerm)`;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }

  query += ` ORDER BY TenChuyenNganh ASC;`;

  const result = await executeQuery(query, queryParams);
  return result.recordset.map((row) => ({
    chuyenNganhID: row.ChuyenNganhID,
    tenChuyenNganh: row.TenChuyenNganh,
    maChuyenNganh: row.MaChuyenNganh,
  }));
};

/**
 * Lấy chuyên ngành theo ID.
 * @param {number} chuyenNganhID - ID chuyên ngành
 * @returns {Promise<object|null>} Thông tin chuyên ngành hoặc null nếu không tồn tại
 */
const getChuyenNganhById = async (chuyenNganhID) => {
  const query = `SELECT * FROM ChuyenNganh WHERE ChuyenNganhID = @ChuyenNganhID`;
  const params = [
    { name: 'ChuyenNganhID', type: sql.Int, value: chuyenNganhID },
  ];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Lấy danh sách chuyên ngành theo ngành học, có phân trang và tìm kiếm.
 * @param {number} nganhHocId - ID ngành học
 * @param {object} params - { searchTerm?: string, page?: number, limit?: number, sortBy?: string, sortOrder?: string }
 * @returns {Promise<{ items: Array<object>, totalItems: number }>}
 */
const getChuyenNganhListByNganhWithPagination = async (nganhHocId, params) => {
  const {
    searchTerm,
    page = 1,
    limit = 10,
    sortBy = 'cn.TenChuyenNganh',
    sortOrder = 'ASC',
  } = params;
  let whereClause = ` WHERE cn.NganhHocID = @NganhHocID `;
  const queryParams = [
    { name: 'NganhHocID', type: sql.Int, value: nganhHocId },
  ];

  if (searchTerm) {
    whereClause += ` AND (cn.TenChuyenNganh LIKE @SearchTerm OR cn.MaChuyenNganh LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }

  const countQuery = `SELECT COUNT(DISTINCT cn.ChuyenNganhID) AS TotalItems ${FROM_JOIN_CHUYENNGANH} ${whereClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = ['cn.TenChuyenNganh', 'cn.MaChuyenNganh'];
  const safeSortBy = allowedSortBy.includes(sortBy)
    ? sortBy
    : 'cn.TenChuyenNganh';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        SELECT ${SELECT_CHUYENNGANH_FIELDS},
               (SELECT COUNT(*) FROM LopHoc lh_count WHERE lh_count.ChuyenNganhID = cn.ChuyenNganhID) AS SoLuongLop
        ${FROM_JOIN_CHUYENNGANH}
        ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}, cn.ChuyenNganhID ${safeSortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
    `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);
  const items = itemsResult.recordset.map((row) => ({
    ...mapRowToChuyenNganhResponse(row),
    soLuongLop: row.SoLuongLop,
  }));
  return { items, totalItems };
};

/**
 * Lấy chi tiết chuyên ngành (join ngành học).
 * @param {number} chuyenNganhID - ID chuyên ngành
 * @returns {Promise<object|null>} Thông tin chi tiết chuyên ngành hoặc null nếu không tồn tại
 */
const getChuyenNganhDetailById = async (chuyenNganhID) => {
  const query = `SELECT ${SELECT_CHUYENNGANH_FIELDS} ${FROM_JOIN_CHUYENNGANH} WHERE cn.ChuyenNganhID = @ChuyenNganhID;`;
  const params = [
    { name: 'ChuyenNganhID', type: sql.Int, value: chuyenNganhID },
  ];
  const result = await executeQuery(query, params);
  if (result.recordset.length === 0) return null;
  return mapRowToChuyenNganhResponse(result.recordset[0]);
};

/**
 * Kiểm tra mã chuyên ngành đã tồn tại trong ngành học chưa (có thể loại trừ một ID).
 * @param {number} nganhHocID - ID ngành học
 * @param {string} maChuyenNganh - Mã chuyên ngành
 * @param {number|null} excludeChuyenNganhID - ID chuyên ngành loại trừ (nếu có)
 * @returns {Promise<object|null>} Thông tin chuyên ngành nếu tồn tại, null nếu không
 */
const getChuyenNganhByMaTrongNganh = async (
  nganhHocID,
  maChuyenNganh,
  excludeChuyenNganhID = null
) => {
  if (!maChuyenNganh) return null;
  let query = `SELECT ChuyenNganhID FROM ChuyenNganh WHERE NganhHocID = @NganhHocID AND MaChuyenNganh = @MaChuyenNganh`;
  const params = [
    { name: 'NganhHocID', type: sql.Int, value: nganhHocID },
    { name: 'MaChuyenNganh', type: sql.VarChar(50), value: maChuyenNganh },
  ];
  if (excludeChuyenNganhID) {
    query += ` AND ChuyenNganhID <> @ExcludeChuyenNganhID`;
    params.push({
      name: 'ExcludeChuyenNganhID',
      type: sql.Int,
      value: excludeChuyenNganhID,
    });
  }
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Tạo mới bản ghi chuyên ngành.
 * @param {number} nganhHocID - ID ngành học
 * @param {object} data - { tenChuyenNganh: string, maChuyenNganh: string, moTaCN?: string }
 * @param {object|null} transaction - Transaction SQL (nếu có)
 * @returns {Promise<number>} ID chuyên ngành vừa tạo
 */
const createChuyenNganhRecord = async (
  nganhHocID,
  data,
  transaction = null
) => {
  const { tenChuyenNganh, maChuyenNganh, moTaCN } = data;
  const query = `
        INSERT INTO ChuyenNganh (NganhHocID, TenChuyenNganh, MaChuyenNganh, MoTaCN)
        OUTPUT inserted.ChuyenNganhID
        VALUES (@NganhHocID, @TenChuyenNganh, @MaChuyenNganh, @MoTaCN);
    `;
  const params = [
    { name: 'NganhHocID', type: sql.Int, value: nganhHocID },
    { name: 'TenChuyenNganh', type: sql.NVarChar(200), value: tenChuyenNganh },
    { name: 'MaChuyenNganh', type: sql.VarChar(50), value: maChuyenNganh },
    { name: 'MoTaCN', type: sql.NVarChar(sql.MAX), value: moTaCN },
  ];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset[0].ChuyenNganhID;
};

/**
 * Cập nhật bản ghi chuyên ngành theo ID.
 * @param {number} chuyenNganhID - ID chuyên ngành
 * @param {object} updateData - { tenChuyenNganh?: string, maChuyenNganh?: string, moTaCN?: string }
 * @param {object|null} transaction - Transaction SQL (nếu có)
 * @returns {Promise<object|null>} Thông tin chuyên ngành đã cập nhật hoặc null nếu không tồn tại
 */
const updateChuyenNganhRecordById = async (
  chuyenNganhID,
  updateData,
  transaction = null
) => {
  const setClauses = [];
  const params = [
    { name: 'ChuyenNganhID', type: sql.Int, value: chuyenNganhID },
  ];
  // nganhHocID thường không được phép thay đổi qua API update chuyên ngành.
  if (updateData.tenChuyenNganh !== undefined) {
    setClauses.push('TenChuyenNganh = @TenChuyenNganh');
    params.push({
      name: 'TenChuyenNganh',
      type: sql.NVarChar(200),
      value: updateData.tenChuyenNganh,
    });
  }
  if (updateData.maChuyenNganh !== undefined) {
    setClauses.push('MaChuyenNganh = @MaChuyenNganh');
    params.push({
      name: 'MaChuyenNganh',
      type: sql.VarChar(50),
      value: updateData.maChuyenNganh,
    });
  }
  if (updateData.moTaCN !== undefined) {
    setClauses.push('MoTaCN = @MoTaCN');
    params.push({
      name: 'MoTaCN',
      type: sql.NVarChar(sql.MAX),
      value: updateData.moTaCN,
    });
  }

  if (setClauses.length === 0) return { ChuyenNganhID: chuyenNganhID };
  const query = `UPDATE ChuyenNganh SET ${setClauses.join(', ')} OUTPUT inserted.ChuyenNganhID WHERE ChuyenNganhID = @ChuyenNganhID;`;
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Xóa bản ghi chuyên ngành theo ID (nếu không có lớp học liên kết).
 * @param {number} chuyenNganhID - ID chuyên ngành
 * @param {object|null} transaction - Transaction SQL (nếu có)
 * @returns {Promise<number>} Số bản ghi bị xóa (0 hoặc 1)
 */
const deleteChuyenNganhRecordById = async (
  chuyenNganhID,
  transaction = null
) => {
  // Kiểm tra LopHoc và ThongTinSinhVien
  let request = transaction
    ? transaction.request()
    : (await getPool()).request();
  request.input('ChuyenNganhID', sql.Int, chuyenNganhID);
  let result = await request.query(
    `SELECT COUNT(*) as count FROM LopHoc WHERE ChuyenNganhID = @ChuyenNganhID`
  );
  if (result.recordset[0].count > 0)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Chuyên ngành này có lớp học liên kết, không thể xóa.'
    );

  const deleteQuery = `DELETE FROM ChuyenNganh WHERE ChuyenNganhID = @ChuyenNganhID;`;
  request = transaction ? transaction.request() : (await getPool()).request();
  request.input('ChuyenNganhID', sql.Int, chuyenNganhID);
  result = await request.query(deleteQuery);
  return result.rowsAffected[0];
};

export const chuyenNganhRepository = {
  getChuyenNganhForSelectByNganh,
  getChuyenNganhById,
  getChuyenNganhDetailById,
  getChuyenNganhListByNganhWithPagination,
  getChuyenNganhByMaTrongNganh,
  createChuyenNganhRecord,
  updateChuyenNganhRecordById,
  deleteChuyenNganhRecordById,
};
