// src/modules/loaiTang/loaiTang.repository.js
import { executeQuery, getPool } from '../../utils/database.js';
import sql from 'mssql';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';

/**
 * Tạo mới loại tầng.
 * @param {object} loaiTangData - Dữ liệu loại tầng (maLoaiTang, tenLoaiTang, soThuTu, moTa)
 * @returns {Promise<object>} Loại tầng vừa tạo
 */
const createLoaiTang = async (loaiTangData) => {
  const { maLoaiTang, tenLoaiTang, soThuTu, moTa } = loaiTangData;
  const query = `
    INSERT INTO LoaiTang (MaLoaiTang, TenLoaiTang, SoThuTu, MoTa)
    OUTPUT inserted.LoaiTangID, inserted.MaLoaiTang, inserted.TenLoaiTang, inserted.SoThuTu, inserted.MoTa
    VALUES (@MaLoaiTang, @TenLoaiTang, @SoThuTu, @MoTa);
  `;
  const params = [
    { name: 'MaLoaiTang', type: sql.VarChar(20), value: maLoaiTang },
    { name: 'TenLoaiTang', type: sql.NVarChar(100), value: tenLoaiTang },
    { name: 'SoThuTu', type: sql.Int, value: soThuTu },
    { name: 'MoTa', type: sql.NVarChar(255), value: moTa },
  ];
  const result = await executeQuery(query, params);
  return result.recordset[0];
};

/**
 * Lấy loại tầng theo ID.
 * @param {number} loaiTangID - ID loại tầng
 * @returns {Promise<object|null>} Thông tin loại tầng hoặc null nếu không tồn tại
 */
const getLoaiTangById = async (loaiTangID) => {
  const query = `SELECT LoaiTangID, MaLoaiTang, TenLoaiTang, SoThuTu, MoTa FROM LoaiTang WHERE LoaiTangID = @LoaiTangID;`;
  const params = [{ name: 'LoaiTangID', type: sql.Int, value: loaiTangID }];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Lấy loại tầng theo mã.
 * @param {string} maLoaiTang - Mã loại tầng
 * @returns {Promise<object|null>} Thông tin loại tầng hoặc null nếu không tồn tại
 */
const getLoaiTangByMa = async (maLoaiTang) => {
  const query = `SELECT LoaiTangID, MaLoaiTang FROM LoaiTang WHERE MaLoaiTang = @MaLoaiTang;`;
  const params = [
    { name: 'MaLoaiTang', type: sql.VarChar(20), value: maLoaiTang },
  ];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Lấy danh sách loại tầng có phân trang, tìm kiếm, sắp xếp.
 * @param {object} params - Tham số lọc, phân trang, sắp xếp (searchTerm, page, limit, sortBy, sortOrder)
 * @returns {Promise<{items: Array<object>, totalItems: number}>} Danh sách loại tầng và tổng số
 */
const getLoaiTangListWithPagination = async (params) => {
  const {
    searchTerm,
    page = 1,
    limit = 10,
    sortBy = 'SoThuTu',
    sortOrder = 'ASC',
  } = params; // Default sort by SoThuTu
  let queryFromWhere = `FROM LoaiTang WHERE 1=1 `;
  const queryParams = [];

  if (searchTerm) {
    queryFromWhere += ` AND (TenLoaiTang LIKE @SearchTerm OR MaLoaiTang LIKE @SearchTerm OR MoTa LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }

  const countQuery = `SELECT COUNT(*) AS TotalItems ${queryFromWhere}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = ['LoaiTangID', 'MaLoaiTang', 'TenLoaiTang', 'SoThuTu'];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'SoThuTu'; // Default to SoThuTu
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        SELECT LoaiTangID, MaLoaiTang, TenLoaiTang, SoThuTu, MoTa
        ${queryFromWhere}
        ORDER BY ${safeSortBy} ${safeSortOrder}, LoaiTangID ${safeSortOrder} -- Thêm secondary sort để ổn định
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
    `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);
  return { items: itemsResult.recordset, totalItems };
};

/**
 * Cập nhật loại tầng theo ID.
 * @param {number} loaiTangID - ID loại tầng
 * @param {object} updateData - Dữ liệu cập nhật (maLoaiTang, tenLoaiTang, soThuTu, moTa)
 * @returns {Promise<object|null>} Thông tin loại tầng đã cập nhật hoặc null nếu không tồn tại
 */
const updateLoaiTangById = async (loaiTangID, updateData) => {
  const setClauses = [];
  const params = [{ name: 'LoaiTangID', type: sql.Int, value: loaiTangID }];

  if (updateData.maLoaiTang !== undefined) {
    setClauses.push('MaLoaiTang = @MaLoaiTang');
    params.push({
      name: 'MaLoaiTang',
      type: sql.VarChar(20),
      value: updateData.maLoaiTang,
    });
  }
  if (updateData.tenLoaiTang !== undefined) {
    setClauses.push('TenLoaiTang = @TenLoaiTang');
    params.push({
      name: 'TenLoaiTang',
      type: sql.NVarChar(100),
      value: updateData.tenLoaiTang,
    });
  }
  if (updateData.soThuTu !== undefined) {
    setClauses.push('SoThuTu = @SoThuTu');
    params.push({ name: 'SoThuTu', type: sql.Int, value: updateData.soThuTu });
  }
  if (updateData.moTa !== undefined) {
    setClauses.push('MoTa = @MoTa');
    params.push({
      name: 'MoTa',
      type: sql.NVarChar(255),
      value: updateData.moTa,
    });
  }

  if (setClauses.length === 0) {
    return getLoaiTangById(loaiTangID);
  }

  const query = `
        UPDATE LoaiTang
        SET ${setClauses.join(', ')}
        OUTPUT inserted.LoaiTangID, inserted.MaLoaiTang, inserted.TenLoaiTang, inserted.SoThuTu, inserted.MoTa
        WHERE LoaiTangID = @LoaiTangID;
    `;
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Xóa loại tầng theo ID (nếu không bị ràng buộc).
 * @param {number} loaiTangID - ID loại tầng
 * @param {object|null} transaction - Transaction SQL (nếu có)
 * @returns {Promise<number>} Số bản ghi bị xóa (0 hoặc 1)
 */
const deleteLoaiTangById = async (loaiTangID, transaction = null) => {
  // Kiểm tra ràng buộc: ToaNha_Tang
  const checkUsageQuery = `SELECT COUNT(*) as count FROM ToaNha_Tang WHERE LoaiTangID = @LoaiTangID`;
  const usageParams = [
    { name: 'LoaiTangID', type: sql.Int, value: loaiTangID },
  ];
  let request = transaction
    ? transaction.request()
    : (await getPool()).request();
  usageParams.forEach((p) => request.input(p.name, p.type, p.value));
  const usageResult = await request.query(checkUsageQuery);

  if (usageResult.recordset[0].count > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Loại tầng này đang được sử dụng trong bảng ToaNha_Tang. Không thể xóa.'
    );
  }

  const deleteQuery = `DELETE FROM LoaiTang WHERE LoaiTangID = @LoaiTangID;`;
  request = transaction ? transaction.request() : (await getPool()).request();
  request.input('LoaiTangID', sql.Int, loaiTangID);
  const result = await request.query(deleteQuery);
  return result.rowsAffected[0]; // Số dòng bị xóa
};

export const loaiTangRepository = {
  createLoaiTang,
  getLoaiTangById,
  getLoaiTangByMa,
  getLoaiTangListWithPagination,
  updateLoaiTangById,
  deleteLoaiTangById,
};
