// src/modules/donVi/donVi.repository.js
import { executeQuery } from '../../utils/database.js';
import sql from 'mssql';

const getAllDonViWithPagination = async (params) => {
  const {
    loaiDonVi,
    searchTerm,
    page = 1,
    limit = 20,
    sortBy = 'TenDonVi',
    sortOrder = 'ASC',
  } = params;
  let query = `FROM DonVi WHERE 1=1`;
  const queryParams = [];

  if (loaiDonVi) {
    query += ` AND LoaiDonVi = @LoaiDonVi`;
    queryParams.push({
      name: 'LoaiDonVi',
      type: sql.NVarChar(100),
      value: loaiDonVi,
    });
  }
  if (searchTerm) {
    query += ` AND (TenDonVi LIKE @SearchTerm OR MaDonVi LIKE @SearchTerm)`;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }

  const countQuery = `SELECT COUNT(*) AS TotalItems ${query}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = ['DonViID', 'TenDonVi', 'MaDonVi', 'LoaiDonVi'];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'TenDonVi';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        SELECT DonViID, TenDonVi, MaDonVi, LoaiDonVi
        ${query}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
    `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);
  return { items: itemsResult.recordset, totalItems };
};

export const donViRepository = {
  getAllDonViWithPagination,
};
