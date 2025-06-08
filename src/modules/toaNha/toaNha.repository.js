// src/modules/danhMuc/toaNha.repository.js
import { executeQuery, getPool } from '../../utils/database.js';
import sql from 'mssql';

/**
 * Tạo mới một tòa nhà.
 * @param {object} toaNhaData - Thông tin tòa nhà
 * @returns {Promise<object>} Bản ghi tòa nhà vừa tạo
 */
const createToaNha = async (toaNhaData) => {
  const { maToaNha, tenToaNha, coSoID, moTaToaNha } = toaNhaData;
  const query = `
    INSERT INTO ToaNha (MaToaNha, TenToaNha, CoSoID, MoTaToaNha) 
    OUTPUT inserted.ToaNhaID, inserted.MaToaNha, inserted.TenToaNha, inserted.CoSoID, inserted.MoTaToaNha
    VALUES (@MaToaNha, @TenToaNha, @CoSoID, @MoTaToaNha);
  `;

  const params = [
    { name: 'MaToaNha', type: sql.VarChar(20), value: maToaNha },
    { name: 'TenToaNha', type: sql.NVarChar(100), value: tenToaNha },
    { name: 'CoSoID', type: sql.Int, value: coSoID },
    { name: 'MoTaToaNha', type: sql.NVarChar(255), value: moTaToaNha },
  ];
  const result = await executeQuery(query, params);
  return result.recordset[0];
};

/**
 * Lấy chi tiết một tòa nhà theo ID.
 * @param {number} toaNhaID - ID tòa nhà
 * @returns {Promise<object|null>} Thông tin chi tiết tòa nhà hoặc null nếu không tìm thấy
 */
const getToaNhaById = async (toaNhaID) => {
  const query = `
    SELECT
        tn.ToaNhaID, tn.MaToaNha, tn.TenToaNha, tn.MoTaToaNha,
        cs.DonViID AS CoSo_DonViID, cs.TenDonVi AS CoSo_TenDonVi, cs.MaDonVi AS CoSo_MaDonVi, cs.LoaiDonVi AS CoSo_LoaiDonVi
    FROM ToaNha tn
    JOIN DonVi cs ON tn.CoSoID = cs.DonViID AND cs.LoaiDonVi = 'CO_SO'
    WHERE tn.ToaNhaID = @ToaNhaID;
  `;
  const params = [{ name: 'ToaNhaID', type: sql.Int, value: toaNhaID }];
  const result = await executeQuery(query, params);
  if (result.recordset.length === 0) return null;
  const row = result.recordset[0];
  return {
    toaNhaID: row.ToaNhaID,
    maToaNha: row.MaToaNha,
    tenToaNha: row.TenToaNha,
    coSo: {
      donViID: row.CoSo_DonViID,
      tenDonVi: row.CoSo_TenDonVi,
      maDonVi: row.CoSo_MaDonVi,
      loaiDonVi: row.CoSo_LoaiDonVi,
    },
    moTaToaNha: row.MoTaToaNha,
  };
};

/**
 * Lấy tòa nhà theo mã.
 * @param {string} maToaNha - Mã tòa nhà
 * @returns {Promise<object|null>} Thông tin tòa nhà hoặc null nếu không tìm thấy
 */
const getToaNhaByMa = async (maToaNha) => {
  const query = `SELECT ToaNhaID, MaToaNha FROM ToaNha WHERE MaToaNha = @MaToaNha;`;
  const params = [{ name: 'MaToaNha', type: sql.VarChar(20), value: maToaNha }];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Lấy danh sách tòa nhà với phân trang và bộ lọc.
 * @param {object} params - Tham số lọc, phân trang, sắp xếp
 * @returns {Promise<{items: object[], totalItems: number}>}
 */
const getToaNhaListWithPagination = async (params) => {
  const {
    searchTerm,
    coSoID,
    page = 1,
    limit = 10,
    sortBy = 'tn.TenToaNha',
    sortOrder = 'ASC',
  } = params;
  let querySelect = `
        SELECT
            tn.ToaNhaID, tn.MaToaNha, tn.TenToaNha, tn.MoTaToaNha,
            cs.DonViID AS CoSo_DonViID, cs.TenDonVi AS CoSo_TenDonVi, cs.MaDonVi AS CoSo_MaDonVi, cs.LoaiDonVi AS CoSo_LoaiDonVi

    `;
  let queryFrom = `
        FROM ToaNha tn
        JOIN DonVi cs ON tn.CoSoID = cs.DonViID AND cs.LoaiDonVi = 'CO_SO'
    `;
  let queryWhere = ` WHERE 1=1 `;
  const queryParams = [];

  if (searchTerm) {
    queryWhere += ` AND (tn.TenToaNha LIKE @SearchTerm OR tn.MaToaNha LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }
  if (coSoID) {
    queryWhere += ` AND tn.CoSoID = @CoSoID `;
    queryParams.push({ name: 'CoSoID', type: sql.Int, value: coSoID });
  }

  const countQuery = `SELECT COUNT(tn.ToaNhaID) AS TotalItems ${queryFrom} ${queryWhere}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = [
    'tn.ToaNhaID',
    'tn.MaToaNha',
    'tn.TenToaNha',
    'cs.TenDonVi',
  ];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'tn.TenToaNha';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        ${querySelect}
        ${queryFrom}
        ${queryWhere}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
    `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);
  const items = itemsResult.recordset.map((row) => ({
    toaNhaID: row.ToaNhaID,
    maToaNha: row.MaToaNha,
    tenToaNha: row.TenToaNha,
    coSo: {
      donViID: row.CoSo_DonViID,
      tenDonVi: row.CoSo_TenDonVi,
      maDonVi: row.CoSo_MaDonVi,
      loaiDonVi: row.CoSo_LoaiDonVi,
    },
    moTaToaNha: row.MoTaToaNha,
  }));
  return { items, totalItems };
};

/**
 * Cập nhật thông tin một tòa nhà theo ID.
 * @param {number} toaNhaID - ID tòa nhà
 * @param {object} updateData - Dữ liệu cập nhật
 * @returns {Promise<object|null>} Bản ghi tòa nhà đã cập nhật hoặc null nếu không tìm thấy
 */
const updateToaNhaById = async (toaNhaID, updateData) => {
  const setClauses = [];
  const params = [{ name: 'ToaNhaID', type: sql.Int, value: toaNhaID }];

  if (updateData.maToaNha !== undefined) {
    setClauses.push('MaToaNha = @MaToaNha');
    params.push({
      name: 'MaToaNha',
      type: sql.VarChar(20),
      value: updateData.maToaNha,
    });
  }
  if (updateData.tenToaNha !== undefined) {
    setClauses.push('TenToaNha = @TenToaNha');
    params.push({
      name: 'TenToaNha',
      type: sql.NVarChar(100),
      value: updateData.tenToaNha,
    });
  }
  if (updateData.coSoID !== undefined) {
    setClauses.push('CoSoID = @CoSoID');
    params.push({ name: 'CoSoID', type: sql.Int, value: updateData.coSoID });
  }
  if (updateData.moTaToaNha !== undefined) {
    setClauses.push('MoTaToaNha = @MoTaToaNha');
    params.push({
      name: 'MoTaToaNha',
      type: sql.NVarChar(255),
      value: updateData.moTaToaNha,
    });
  }

  if (setClauses.length === 0) {
    return getToaNhaById(toaNhaID);
  }

  const query = `
        UPDATE ToaNha
        SET ${setClauses.join(', ')}
        OUTPUT inserted.ToaNhaID, inserted.MaToaNha, inserted.TenToaNha, inserted.CoSoID, inserted.MoTaToaNha -- Bỏ IsActive
        WHERE ToaNhaID = @ToaNhaID;
    `;
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Xóa một tòa nhà theo ID (nếu không còn tầng liên kết).
 * @param {number} toaNhaID - ID tòa nhà
 * @param {object|null} [transaction=null] - Transaction SQL nếu có
 * @returns {Promise<void>}
 * @throws {ApiError} Nếu tòa nhà còn tầng liên kết
 */
const deleteToaNhaById = async (toaNhaID, transaction = null) => {
  const checkUsageQuery = `SELECT COUNT(*) as count FROM ToaNha_Tang WHERE ToaNhaID = @ToaNhaID`;
  const usageParams = [{ name: 'ToaNhaID', type: sql.Int, value: toaNhaID }];
  let request = transaction
    ? transaction.request()
    : (await getPool()).request();
  usageParams.forEach((p) => request.input(p.name, p.type, p.value));
  const usageResult = await request.query(checkUsageQuery);

  if (usageResult.recordset[0].count > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Tòa nhà này đang có các tầng được liên kết. Không thể xóa.'
    );
  }

  const deleteQuery = `DELETE FROM ToaNha WHERE ToaNhaID = @ToaNhaID;`;
  request = transaction ? transaction.request() : (await getPool()).request();
  request.input('ToaNhaID', sql.Int, toaNhaID);
  await request.query(deleteQuery);
};

export const toaNhaRepository = {
  createToaNha,
  getToaNhaById,
  getToaNhaByMa,
  getToaNhaListWithPagination,
  updateToaNhaById,
  deleteToaNhaById,
};
