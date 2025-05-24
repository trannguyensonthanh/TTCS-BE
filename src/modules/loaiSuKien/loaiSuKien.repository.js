// src/modules/loaiSuKien/loaiSuKien.repository.js
import { executeQuery } from '../../utils/database.js';
import sql from 'mssql';

const createLoaiSK = async (maLoaiSK, tenLoaiSK, moTaLoaiSK, isActive) => {
  const query = `
    INSERT INTO LoaiSuKien (MaLoaiSK, TenLoaiSK, MoTaLoaiSK, IsActive)
    OUTPUT inserted.LoaiSuKienID, inserted.MaLoaiSK, inserted.TenLoaiSK, inserted.MoTaLoaiSK, inserted.IsActive
    VALUES (@MaLoaiSK, @TenLoaiSK, @MoTaLoaiSK, @IsActive);
  `;
  const params = [
    { name: 'MaLoaiSK', type: sql.VarChar(50), value: maLoaiSK },
    { name: 'TenLoaiSK', type: sql.NVarChar(150), value: tenLoaiSK },
    { name: 'MoTaLoaiSK', type: sql.NVarChar(500), value: moTaLoaiSK },
    { name: 'IsActive', type: sql.Bit, value: isActive },
  ];
  const result = await executeQuery(query, params);
  return result.recordset[0];
};

const getAllLoaiSK = async (params) => {
  const {
    searchTerm,
    isActive,
    page = 1,
    limit = 10,
    sortBy = 'TenLoaiSK',
    sortOrder = 'ASC',
  } = params;
  let query = `FROM LoaiSuKien WHERE 1=1`;
  const queryParams = [];

  if (searchTerm) {
    query += ` AND (TenLoaiSK LIKE @SearchTerm OR MaLoaiSK LIKE @SearchTerm OR MoTaLoaiSK LIKE @SearchTerm)`;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }
  if (typeof isActive === 'boolean') {
    query += ` AND IsActive = @IsActive`;
    queryParams.push({ name: 'IsActive', type: sql.Bit, value: isActive });
  }

  const countQuery = `SELECT COUNT(*) AS TotalItems ${query}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = ['LoaiSuKienID', 'MaLoaiSK', 'TenLoaiSK', 'IsActive'];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'TenLoaiSK';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        SELECT LoaiSuKienID, MaLoaiSK, TenLoaiSK, MoTaLoaiSK, IsActive
        ${query}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
    `;

  const itemsResult = await executeQuery(itemsQuery, queryParams);
  console.log('itemsResult');
  return { items: itemsResult.recordset, totalItems };
};

const getLoaiSKById = async (loaiSuKienID) => {
  const query = `SELECT * FROM LoaiSuKien WHERE LoaiSuKienID = @LoaiSuKienID;`;
  const params = [{ name: 'LoaiSuKienID', type: sql.Int, value: loaiSuKienID }];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

const getLoaiSKByMa = async (maLoaiSK) => {
  const query = `SELECT * FROM LoaiSuKien WHERE MaLoaiSK = @MaLoaiSK;`;
  const params = [{ name: 'MaLoaiSK', type: sql.VarChar(50), value: maLoaiSK }];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

const updateLoaiSKById = async (loaiSuKienID, updateData) => {
  // updateData là object chứa các trường cần cập nhật: { maLoaiSK, tenLoaiSK, moTaLoaiSK, isActive }
  const setClauses = [];
  const params = [{ name: 'LoaiSuKienID', type: sql.Int, value: loaiSuKienID }];

  if (updateData.maLoaiSK !== undefined) {
    setClauses.push('MaLoaiSK = @MaLoaiSK');
    params.push({
      name: 'MaLoaiSK',
      type: sql.VarChar(50),
      value: updateData.maLoaiSK,
    });
  }
  if (updateData.tenLoaiSK !== undefined) {
    setClauses.push('TenLoaiSK = @TenLoaiSK');
    params.push({
      name: 'TenLoaiSK',
      type: sql.NVarChar(150),
      value: updateData.tenLoaiSK,
    });
  }
  if (updateData.moTaLoaiSK !== undefined) {
    setClauses.push('MoTaLoaiSK = @MoTaLoaiSK');
    params.push({
      name: 'MoTaLoaiSK',
      type: sql.NVarChar(500),
      value: updateData.moTaLoaiSK,
    });
  }
  if (updateData.isActive !== undefined) {
    setClauses.push('IsActive = @IsActive');
    params.push({
      name: 'IsActive',
      type: sql.Bit,
      value: updateData.isActive,
    });
  }

  if (setClauses.length === 0) {
    return getLoaiSKById(loaiSuKienID); // Không có gì để cập nhật, trả về bản ghi hiện tại
  }

  const query = `
    UPDATE LoaiSuKien
    SET ${setClauses.join(', ')}
    OUTPUT inserted.LoaiSuKienID, inserted.MaLoaiSK, inserted.TenLoaiSK, inserted.MoTaLoaiSK, inserted.IsActive
    WHERE LoaiSuKienID = @LoaiSuKienID;
  `;
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

const deleteLoaiSKById = async (loaiSuKienID) => {
  // Cân nhắc kiểm tra xem LoaiSuKienID có đang được sử dụng trong bảng SuKien không trước khi xóa
  // Hoặc dùng ON DELETE SET NULL / SET DEFAULT ở khóa ngoại trong bảng SuKien
  const checkUsageQuery = `SELECT COUNT(*) as count FROM SuKien WHERE LoaiSuKienID = @LoaiSuKienID`;
  const usageResult = await executeQuery(checkUsageQuery, [
    { name: 'LoaiSuKienID', type: sql.Int, value: loaiSuKienID },
  ]);
  if (usageResult.recordset[0].count > 0) {
    // Hoặc cập nhật IsActive = 0 thay vì xóa cứng
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Loại sự kiện đang được sử dụng, không thể xóa. Cân nhắc vô hiệu hóa.'
    );
  }

  const query = `DELETE FROM LoaiSuKien WHERE LoaiSuKienID = @LoaiSuKienID;`;
  const params = [{ name: 'LoaiSuKienID', type: sql.Int, value: loaiSuKienID }];
  await executeQuery(query, params);
  // DELETE không trả về OUTPUT inserted, nên không có return recordset ở đây
};

export const loaiSuKienRepository = {
  createLoaiSK,
  getAllLoaiSK,
  getLoaiSKById,
  getLoaiSKByMa,
  updateLoaiSKById,
  deleteLoaiSKById,
};
