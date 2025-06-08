import { executeQuery, getPool } from '../../utils/database.js';
import sql from 'mssql';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';

/**
 * Lấy danh sách trang thiết bị để chọn (select option).
 * @param {Object} params - Tham số truy vấn (searchTerm, limit).
 * @returns {Promise<Array>} Danh sách thiết bị phù hợp để chọn.
 */
const getAllTrangThietBiForSelect = async (params) => {
  const { searchTerm, limit = 100 } = params;
  let query = `SELECT TOP (@Limit) ThietBiID, TenThietBi, MoTa FROM TrangThietBi`;
  const queryParams = [{ name: 'Limit', type: sql.Int, value: limit }];
  let whereClause = '';

  if (searchTerm) {
    whereClause +=
      (whereClause ? ' AND ' : ' WHERE ') +
      `(TenThietBi LIKE @SearchTerm OR MoTa LIKE @SearchTerm)`;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }
  query += whereClause;
  query += ` ORDER BY TenThietBi ASC;`;

  const result = await executeQuery(query, queryParams);
  return result.recordset.map((row) => ({
    thietBiID: row.ThietBiID,
    tenThietBi: row.TenThietBi,
    moTa: row.MoTa,
  }));
};

/**
 * Tạo mới một trang thiết bị.
 * @param {Object} trangThietBiData - Dữ liệu thiết bị (tenThietBi, moTa).
 * @returns {Promise<Object>} Đối tượng thiết bị vừa tạo.
 */
const createTrangThietBi = async (trangThietBiData) => {
  const { tenThietBi, moTa } = trangThietBiData;
  const query = `
    INSERT INTO TrangThietBi (TenThietBi, MoTa)
    OUTPUT inserted.ThietBiID, inserted.TenThietBi, inserted.MoTa
    VALUES (@TenThietBi, @MoTa);
  `;
  const params = [
    { name: 'TenThietBi', type: sql.NVarChar(150), value: tenThietBi },
    { name: 'MoTa', type: sql.NVarChar(500), value: moTa },
  ];
  const result = await executeQuery(query, params);
  return result.recordset[0];
};

/**
 * Lấy chi tiết một trang thiết bị theo ID.
 * @param {number} thietBiID - ID thiết bị.
 * @returns {Promise<Object|null>} Đối tượng thiết bị hoặc null nếu không tồn tại.
 */
const getTrangThietBiById = async (thietBiID) => {
  const query = `SELECT ThietBiID, TenThietBi, MoTa FROM TrangThietBi WHERE ThietBiID = @ThietBiID;`;
  const params = [{ name: 'ThietBiID', type: sql.Int, value: thietBiID }];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Lấy thiết bị theo tên (để kiểm tra trùng tên).
 * @param {string} tenThietBi - Tên thiết bị.
 * @returns {Promise<Object|null>} Đối tượng thiết bị hoặc null nếu không tồn tại.
 */
const getTrangThietBiByTen = async (tenThietBi) => {
  const query = `SELECT ThietBiID, TenThietBi FROM TrangThietBi WHERE TenThietBi = @TenThietBi;`;
  const params = [
    { name: 'TenThietBi', type: sql.NVarChar(150), value: tenThietBi },
  ];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Lấy danh sách thiết bị có phân trang, tìm kiếm.
 * @param {Object} params - Tham số truy vấn (searchTerm, page, limit, sortBy, sortOrder).
 * @returns {Promise<Object>} { items, totalItems }
 */
const getTrangThietBiListWithPagination = async (params) => {
  const {
    searchTerm,
    page = 1,
    limit = 10,
    sortBy = 'TenThietBi',
    sortOrder = 'ASC',
  } = params;
  let queryFromWhere = `FROM TrangThietBi WHERE 1=1 `;
  const queryParams = [];

  if (searchTerm) {
    queryFromWhere += ` AND (TenThietBi LIKE @SearchTerm OR MoTa LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }

  const countQuery = `SELECT COUNT(*) AS TotalItems ${queryFromWhere}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = ['ThietBiID', 'TenThietBi'];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'TenThietBi';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        SELECT ThietBiID, TenThietBi, MoTa
        ${queryFromWhere}
        ORDER BY ${safeSortBy} ${safeSortOrder}, ThietBiID ${safeSortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
    `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);
  const items = itemsResult.recordset.map((row) => ({
    thietBiID: row.ThietBiID,
    tenThietBi: row.TenThietBi,
    moTa: row.MoTa,
  }));
  return { items, totalItems };
};

/**
 * Cập nhật thông tin thiết bị theo ID.
 * @param {number} thietBiID - ID thiết bị cần cập nhật.
 * @param {Object} updateData - Dữ liệu cập nhật (tenThietBi, moTa).
 * @returns {Promise<Object|null>} Đối tượng thiết bị sau khi cập nhật hoặc null nếu không tồn tại.
 */
const updateTrangThietBiById = async (thietBiID, updateData) => {
  const setClauses = [];
  const params = [{ name: 'ThietBiID', type: sql.Int, value: thietBiID }];

  if (updateData.tenThietBi !== undefined) {
    setClauses.push('TenThietBi = @TenThietBi');
    params.push({
      name: 'TenThietBi',
      type: sql.NVarChar(150),
      value: updateData.tenThietBi,
    });
  }
  if (updateData.moTa !== undefined) {
    setClauses.push('MoTa = @MoTa');
    params.push({
      name: 'MoTa',
      type: sql.NVarChar(500),
      value: updateData.moTa,
    });
  }

  if (setClauses.length === 0) {
    return getTrangThietBiById(thietBiID);
  }

  const query = `
        UPDATE TrangThietBi
        SET ${setClauses.join(', ')}
        OUTPUT inserted.ThietBiID, inserted.TenThietBi, inserted.MoTa
        WHERE ThietBiID = @ThietBiID;
    `;
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Xóa thiết bị theo ID (chỉ xóa nếu không còn liên kết với phòng).
 * @param {number} thietBiID - ID thiết bị cần xóa.
 * @param {Object|null} [transaction] - Transaction SQL (tùy chọn).
 * @returns {Promise<number>} Số bản ghi bị xóa (1 nếu thành công).
 * @throws {ApiError} Nếu thiết bị đang được gán cho phòng.
 */
const deleteTrangThietBiById = async (thietBiID, transaction = null) => {
  const checkUsageQuery = `SELECT COUNT(*) as count FROM Phong_ThietBi WHERE ThietBiID = @ThietBiID`;
  const usageParams = [{ name: 'ThietBiID', type: sql.Int, value: thietBiID }];
  let request = transaction
    ? transaction.request()
    : (await getPool()).request();
  usageParams.forEach((p) => request.input(p.name, p.type, p.value));
  const usageResult = await request.query(checkUsageQuery);

  if (usageResult.recordset[0].count > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Trang thiết bị này đang được gán cho một hoặc nhiều phòng. Không thể xóa.'
    );
  }

  const deleteQuery = `DELETE FROM TrangThietBi WHERE ThietBiID = @ThietBiID;`;
  request = transaction ? transaction.request() : (await getPool()).request();
  request.input('ThietBiID', sql.Int, thietBiID);
  const result = await request.query(deleteQuery);
  return result.rowsAffected[0];
};

export const trangThietBiRepository = {
  getAllTrangThietBiForSelect,
  getTrangThietBiById,
  getTrangThietBiByTen,
  getTrangThietBiListWithPagination,
  createTrangThietBi,
  updateTrangThietBiById,
  deleteTrangThietBiById,
};
