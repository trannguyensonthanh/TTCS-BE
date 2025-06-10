// src/modules/vaiTroHeThong/vaiTroHeThong.repository.js
import { executeQuery, getPool } from '../../utils/database.js';
import sql from 'mssql';

const SELECT_VAITRO_FIELDS = `
    vt.VaiTroID, vt.MaVaiTro, vt.TenVaiTro, vt.MoTaVT
`;
const FROM_VAITRO = `FROM VaiTroHeThong vt`;

/**
 * Lấy danh sách vai trò hệ thống (có phân trang, tìm kiếm).
 * @param {Object} params - Tham số truy vấn (searchTerm, page, limit, sortBy, sortOrder).
 * @returns {Promise<Object>} { items, totalItems }
 */
const getVaiTroHeThongListWithPagination = async (params) => {
  const {
    searchTerm,
    page = 1,
    limit = 10,
    sortBy = 'vt.TenVaiTro',
    sortOrder = 'ASC',
  } = params;

  let whereClause = ` WHERE 1=1 `;
  const queryParams = [];

  if (searchTerm) {
    whereClause += ` AND (vt.TenVaiTro LIKE @SearchTerm OR vt.MaVaiTro LIKE @SearchTerm OR vt.MoTaVT LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }

  const soNguoiDungSuDungSubQuery = `(SELECT COUNT(DISTINCT ndvt.NguoiDungID) FROM NguoiDung_VaiTro ndvt WHERE ndvt.VaiTroID = vt.VaiTroID AND (ndvt.NgayKetThuc IS NULL OR ndvt.NgayKetThuc >= GETDATE()))`;

  const countQuery = `SELECT COUNT(DISTINCT vt.VaiTroID) AS TotalItems ${FROM_VAITRO} ${whereClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = ['vt.VaiTroID', 'vt.MaVaiTro', 'vt.TenVaiTro'];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'vt.TenVaiTro';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        SELECT ${SELECT_VAITRO_FIELDS},
               ${soNguoiDungSuDungSubQuery} AS SoNguoiDungSuDung
        ${FROM_VAITRO}
        ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}, vt.VaiTroID ${safeSortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
    `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);
  const items = itemsResult.recordset.map((row) => ({
    vaiTroID: row.VaiTroID,
    maVaiTro: row.MaVaiTro,
    tenVaiTro: row.TenVaiTro,
    moTaVT: row.MoTaVT,
    soNguoiDungSuDung: row.SoNguoiDungSuDung,
  }));
  return { items, totalItems };
};

/**
 * Lấy chi tiết vai trò hệ thống theo ID.
 * @param {number} vaiTroId - ID vai trò.
 * @param {sql.Transaction} [transaction=null] - Transaction SQL (tùy chọn).
 * @returns {Promise<Object|null>} Đối tượng vai trò hoặc null nếu không tồn tại.
 */
const getVaiTroHeThongById = async (vaiTroId, transaction = null) => {
  const soNguoiDungSuDungSubQuery = `(SELECT COUNT(DISTINCT ndvt.NguoiDungID) FROM NguoiDung_VaiTro ndvt WHERE ndvt.VaiTroID = vt.VaiTroID AND (ndvt.NgayKetThuc IS NULL OR ndvt.NgayKetThuc >= GETDATE()))`;
  const query = `
    SELECT ${SELECT_VAITRO_FIELDS},
           ${soNguoiDungSuDungSubQuery} AS SoNguoiDungSuDung
    ${FROM_VAITRO}
    WHERE vt.VaiTroID = @VaiTroId;
  `;
  const params = [{ name: 'VaiTroId', type: sql.Int, value: vaiTroId }];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  if (result.recordset.length === 0) return null;

  const row = result.recordset[0];
  return {
    vaiTroID: row.VaiTroID,
    maVaiTro: row.MaVaiTro,
    tenVaiTro: row.TenVaiTro,
    moTaVT: row.MoTaVT,
    soNguoiDungSuDung: row.SoNguoiDungSuDung,
  };
};

/**
 * Lấy vai trò hệ thống theo mã (dùng để kiểm tra trùng mã).
 * @param {string} maVaiTro - Mã vai trò.
 * @param {number|null} [excludeVaiTroID] - ID vai trò loại trừ (tùy chọn).
 * @returns {Promise<Object|null>} Đối tượng vai trò hoặc null nếu không tồn tại.
 */
const getVaiTroHeThongByMa = async (maVaiTro, excludeVaiTroID = null) => {
  let query = `SELECT VaiTroID, MaVaiTro FROM VaiTroHeThong WHERE MaVaiTro = @MaVaiTro`;
  const params = [{ name: 'MaVaiTro', type: sql.VarChar(50), value: maVaiTro }];
  if (excludeVaiTroID) {
    query += ` AND VaiTroID <> @ExcludeVaiTroID`;
    params.push({
      name: 'ExcludeVaiTroID',
      type: sql.Int,
      value: excludeVaiTroID,
    });
  }
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Tạo mới một vai trò hệ thống.
 * @param {Object} vaiTroData - Dữ liệu vai trò (maVaiTro, tenVaiTro, moTaVT).
 * @param {sql.Transaction} [transaction=null] - Transaction SQL (tùy chọn).
 * @returns {Promise<number>} ID vai trò vừa tạo.
 */
const createVaiTroHeThongRecord = async (vaiTroData, transaction = null) => {
  const { maVaiTro, tenVaiTro, moTaVT } = vaiTroData;
  const query = `
    INSERT INTO VaiTroHeThong (MaVaiTro, TenVaiTro, MoTaVT)
    OUTPUT inserted.VaiTroID
    VALUES (@MaVaiTro, @TenVaiTro, @MoTaVT);
  `;
  const params = [
    { name: 'MaVaiTro', type: sql.VarChar(50), value: maVaiTro },
    { name: 'TenVaiTro', type: sql.NVarChar(150), value: tenVaiTro },
    { name: 'MoTaVT', type: sql.NVarChar(500), value: moTaVT },
  ];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset[0].VaiTroID;
};

/**
 * Cập nhật thông tin vai trò hệ thống theo ID.
 * @param {number} vaiTroId - ID vai trò cần cập nhật.
 * @param {Object} updateData - Dữ liệu cập nhật (tenVaiTro, moTaVT).
 * @param {sql.Transaction} [transaction=null] - Transaction SQL (tùy chọn).
 * @returns {Promise<Object|null>} Đối tượng vai trò đã cập nhật hoặc null nếu không tồn tại.
 */
const updateVaiTroHeThongRecordById = async (
  vaiTroId,
  updateData,
  transaction = null
) => {
  const setClauses = [];
  const params = [{ name: 'VaiTroID', type: sql.Int, value: vaiTroId }];

  if (updateData.tenVaiTro !== undefined) {
    setClauses.push('TenVaiTro = @TenVaiTro');
    params.push({
      name: 'TenVaiTro',
      type: sql.NVarChar(150),
      value: updateData.tenVaiTro,
    });
  }
  if (updateData.moTaVT !== undefined) {
    setClauses.push('MoTaVT = @MoTaVT');
    params.push({
      name: 'MoTaVT',
      type: sql.NVarChar(500),
      value: updateData.moTaVT,
    });
  }

  if (setClauses.length === 0) {
    return { VaiTroID: vaiTroId };
  }

  const query = `
        UPDATE VaiTroHeThong
        SET ${setClauses.join(', ')}
        OUTPUT inserted.VaiTroID
        WHERE VaiTroID = @VaiTroID;
    `;
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Kiểm tra vai trò hệ thống có đang được người dùng sử dụng không.
 * @param {number} vaiTroId - ID vai trò.
 * @param {sql.Transaction} [transaction=null] - Transaction SQL (tùy chọn).
 * @returns {Promise<boolean>} True nếu đang được sử dụng, ngược lại false.
 */
const checkVaiTroUsageInNguoiDungVaiTro = async (
  vaiTroId,
  transaction = null
) => {
  const query = `
    SELECT COUNT(DISTINCT NguoiDungID) AS UsageCount
    FROM NguoiDung_VaiTro 
    WHERE VaiTroID = @VaiTroID 
      AND (NgayKetThuc IS NULL OR NgayKetThuc >= GETDATE()); -- Chỉ tính các gán vai trò còn hiệu lực
  `;
  const params = [{ name: 'VaiTroID', type: sql.Int, value: vaiTroId }];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset[0].UsageCount > 0;
};

/**
 * Xóa vai trò hệ thống theo ID.
 * @param {number} vaiTroId - ID vai trò cần xóa.
 * @param {sql.Transaction} [transaction=null] - Transaction SQL (tùy chọn).
 * @returns {Promise<number>} Số dòng bị ảnh hưởng (1 nếu xóa thành công).
 */
const deleteVaiTroHeThongRecordById = async (vaiTroId, transaction = null) => {
  // Việc kiểm tra ràng buộc đã được thực hiện ở service
  const query = `DELETE FROM VaiTroHeThong WHERE VaiTroID = @VaiTroID;`;
  const params = [{ name: 'VaiTroID', type: sql.Int, value: vaiTroId }];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.rowsAffected[0];
};

export const vaiTroHeThongRepository = {
  getVaiTroHeThongListWithPagination,
  getVaiTroHeThongById,
  getVaiTroHeThongByMa,
  createVaiTroHeThongRecord,
  updateVaiTroHeThongRecordById,
  deleteVaiTroHeThongRecordById,
  checkVaiTroUsageInNguoiDungVaiTro,
};
