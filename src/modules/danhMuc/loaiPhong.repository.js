// src/modules/phong/loaiPhong.repository.js
import { executeQuery } from '../../utils/database.js';
import sql from 'mssql';

/**
 * Lấy tất cả loại phòng với phân trang, tìm kiếm, sắp xếp.
 * @param {object} params - Tham số lọc, phân trang, sắp xếp ({searchTerm, page, limit, sortBy, sortOrder})
 * @returns {Promise<{items: Array<{loaiPhongID: number, tenLoaiPhong: string}>, totalItems: number}>}
 */
const getAllLoaiPhong = async (params) => {
  const {
    searchTerm,
    page = 1,
    limit = 100,
    sortBy = 'TenLoaiPhong',
    sortOrder = 'ASC',
  } = params;
  let query = `FROM LoaiPhong`;
  const queryParams = [];

  if (searchTerm) {
    query += ` WHERE (TenLoaiPhong LIKE @SearchTerm OR MoTa LIKE @SearchTerm)`;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }

  const countQuery = `SELECT COUNT(*) AS TotalItems ${query}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = ['LoaiPhongID', 'TenLoaiPhong'];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'TenLoaiPhong';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        SELECT LoaiPhongID, TenLoaiPhong --, MoTa (nếu cần)
        ${query}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
    `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);
  const items = itemsResult.recordset.map((lp) => ({
    loaiPhongID: lp.LoaiPhongID,
    tenLoaiPhong: lp.TenLoaiPhong,
  }));
  return { items, totalItems };
};

/**
 * Lấy loại phòng theo ID.
 * @param {number} loaiPhongID - ID loại phòng
 * @returns {Promise<{loaiPhongID: number, tenLoaiPhong: string}|null>} Thông tin loại phòng hoặc null nếu không tồn tại
 */
const getLoaiPhongById = async (loaiPhongID) => {
  const query = `
    SELECT LoaiPhongID, TenLoaiPhong
    FROM LoaiPhong
    WHERE LoaiPhongID = @LoaiPhongID
  `;
  const params = [{ name: 'LoaiPhongID', type: sql.Int, value: loaiPhongID }];
  const result = await executeQuery(query, params);
  if (result.recordset.length === 0) return null;
  const lp = result.recordset[0];
  return {
    loaiPhongID: lp.LoaiPhongID,
    tenLoaiPhong: lp.TenLoaiPhong,
  };
};

export const loaiPhongRepository = {
  getAllLoaiPhong,
  getLoaiPhongById,
};
