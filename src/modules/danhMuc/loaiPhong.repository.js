// src/modules/phong/loaiPhong.repository.js
import { executeQuery } from '../../utils/database.js';
import sql from 'mssql';

const getAllLoaiPhong = async (params) => {
  const {
    isActive = true,
    searchTerm,
    page = 1,
    limit = 100,
    sortBy = 'TenLoaiPhong',
    sortOrder = 'ASC',
  } = params;
  let query = `FROM LoaiPhong WHERE IsActive = @IsActive`; // Giả sử LoaiPhong có cột IsActive
  const queryParams = [{ name: 'IsActive', type: sql.Bit, value: isActive }];

  if (searchTerm) {
    query += ` AND (TenLoaiPhong LIKE @SearchTerm OR MoTa LIKE @SearchTerm)`;
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
  // Map để khớp LoaiPhongResponseMin
  const items = itemsResult.recordset.map((lp) => ({
    loaiPhongID: lp.LoaiPhongID,
    tenLoaiPhong: lp.TenLoaiPhong,
  }));
  return { items, totalItems };
};

export const loaiPhongRepository = {
  getAllLoaiPhong,
};
