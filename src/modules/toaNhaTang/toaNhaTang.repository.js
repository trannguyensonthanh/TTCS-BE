// src/modules/toaNhaTang/toaNhaTang.repository.js
import { executeQuery, getPool } from '../../utils/database.js';
import sql from 'mssql';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';

/**
 * Tạo mới tầng vật lý cho tòa nhà.
 * @param {number} toaNhaID - ID của tòa nhà.
 * @param {Object} toaNhaTangData - Dữ liệu tầng vật lý (loaiTangID, soPhong, moTa).
 * @returns {Promise<Object>} Đối tượng tầng vật lý vừa tạo.
 */
const createToaNhaTang = async (toaNhaID, toaNhaTangData) => {
  const { loaiTangID, soPhong, moTa } = toaNhaTangData;
  const query = `
    INSERT INTO ToaNha_Tang (ToaNhaID, LoaiTangID, SoPhong, MoTa)
    OUTPUT inserted.ToaNhaTangID, inserted.ToaNhaID, inserted.LoaiTangID, inserted.SoPhong, inserted.MoTa
    VALUES (@ToaNhaID, @LoaiTangID, @SoPhong, @MoTa);
  `;
  const params = [
    { name: 'ToaNhaID', type: sql.Int, value: toaNhaID },
    { name: 'LoaiTangID', type: sql.Int, value: loaiTangID },
    { name: 'SoPhong', type: sql.Int, value: soPhong },
    { name: 'MoTa', type: sql.NVarChar(500), value: moTa },
  ];
  const result = await executeQuery(query, params);
  return result.recordset[0];
};

/**
 * Lấy chi tiết tầng vật lý theo ID.
 * @param {number} toaNhaTangID - ID tầng vật lý.
 * @returns {Promise<Object|null>} Đối tượng tầng vật lý hoặc null nếu không tồn tại.
 */
const getToaNhaTangById = async (toaNhaTangID) => {
  const query = `
    SELECT
        tnt.ToaNhaTangID, tnt.SoPhong, tnt.MoTa,
        tn.ToaNhaID AS TN_ToaNhaID, tn.MaToaNha AS TN_MaToaNha, tn.TenToaNha AS TN_TenToaNha,
        cs.DonViID AS CS_DonViID, cs.TenDonVi AS CS_TenDonVi, cs.MaDonVi AS CS_MaDonVi, cs.LoaiDonVi AS CS_LoaiDonVi, -- Cơ sở của tòa nhà
        lt.LoaiTangID AS LT_LoaiTangID, lt.MaLoaiTang AS LT_MaLoaiTang, lt.TenLoaiTang AS LT_TenLoaiTang, lt.SoThuTu AS LT_SoThuTu, lt.MoTa AS LT_MoTa
    FROM ToaNha_Tang tnt
    JOIN ToaNha tn ON tnt.ToaNhaID = tn.ToaNhaID
    JOIN DonVi cs ON tn.CoSoID = cs.DonViID -- Join để lấy thông tin cơ sở
    JOIN LoaiTang lt ON tnt.LoaiTangID = lt.LoaiTangID
    WHERE tnt.ToaNhaTangID = @ToaNhaTangID;
  `;
  const params = [{ name: 'ToaNhaTangID', type: sql.Int, value: toaNhaTangID }];
  const result = await executeQuery(query, params);
  if (result.recordset.length === 0) return null;

  const row = result.recordset[0];
  return {
    toaNhaTangID: row.ToaNhaTangID,
    toaNha: {
      toaNhaID: row.TN_ToaNhaID,
      maToaNha: row.TN_MaToaNha,
      tenToaNha: row.TN_TenToaNha,
      coSo: {
        donViID: row.CS_DonViID,
        tenDonVi: row.CS_TenDonVi,
        maDonVi: row.CS_MaDonVi,
        loaiDonVi: row.CS_LoaiDonVi,
      },
    },
    loaiTang: {
      loaiTangID: row.LT_LoaiTangID,
      maLoaiTang: row.LT_MaLoaiTang,
      tenLoaiTang: row.LT_TenLoaiTang,
      soThuTu: row.LT_SoThuTu,
      moTa: row.LT_MoTa,
    },
    soPhong: row.SoPhong,
    moTa: row.MoTa,
  };
};

/**
 * Kiểm tra tầng vật lý đã tồn tại trong tòa nhà với loại tầng nhất định (trừ ID loại trừ nếu có).
 * @param {number} toaNhaID - ID tòa nhà.
 * @param {number} loaiTangID - ID loại tầng.
 * @param {number|null} [excludeToaNhaTangID] - ID tầng loại trừ (tùy chọn).
 * @returns {Promise<Object|null>} Trả về bản ghi nếu tồn tại, null nếu không.
 */
const checkToaNhaTangExists = async (
  toaNhaID,
  loaiTangID,
  excludeToaNhaTangID = null
) => {
  let query = `SELECT ToaNhaTangID FROM ToaNha_Tang WHERE ToaNhaID = @ToaNhaID AND LoaiTangID = @LoaiTangID`;
  const params = [
    { name: 'ToaNhaID', type: sql.Int, value: toaNhaID },
    { name: 'LoaiTangID', type: sql.Int, value: loaiTangID },
  ];
  if (excludeToaNhaTangID) {
    query += ` AND ToaNhaTangID <> @ExcludeToaNhaTangID`;
    params.push({
      name: 'ExcludeToaNhaTangID',
      type: sql.Int,
      value: excludeToaNhaTangID,
    });
  }
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Lấy danh sách tầng vật lý của tòa nhà (có phân trang, tìm kiếm).
 * @param {number} toaNhaId - ID tòa nhà.
 * @param {Object} params - Tham số truy vấn (searchTerm, page, limit, sortBy, sortOrder).
 * @returns {Promise<Object>} { items, totalItems, thongTinToaNhaCha }
 */
const getToaNhaTangListByToaNhaId = async (toaNhaId, params) => {
  const {
    searchTerm,
    page = 1,
    limit = 10,
    sortBy = 'lt.SoThuTu',
    sortOrder = 'ASC',
  } = params;

  let querySelect = `
        SELECT
            tnt.ToaNhaTangID, tnt.SoPhong, tnt.MoTa,
            tn.ToaNhaID AS TN_ToaNhaID, tn.MaToaNha AS TN_MaToaNha, tn.TenToaNha AS TN_TenToaNha,
            cs_tn.DonViID AS CS_TN_DonViID, cs_tn.TenDonVi AS CS_TN_TenDonVi, cs_tn.MaDonVi AS CS_TN_MaDonVi, cs_tn.LoaiDonVi AS CS_TN_LoaiDonVi,
            lt.LoaiTangID AS LT_LoaiTangID, lt.MaLoaiTang AS LT_MaLoaiTang, lt.TenLoaiTang AS LT_TenLoaiTang, lt.SoThuTu AS LT_SoThuTu, lt.MoTa AS LT_MoTa
    `;
  let queryFromWhere = `
        FROM ToaNha_Tang tnt
        JOIN ToaNha tn ON tnt.ToaNhaID = tn.ToaNhaID
        JOIN DonVi cs_tn ON tn.CoSoID = cs_tn.DonViID
        JOIN LoaiTang lt ON tnt.LoaiTangID = lt.LoaiTangID
        WHERE tnt.ToaNhaID = @ToaNhaID
    `;
  const queryParams = [{ name: 'ToaNhaID', type: sql.Int, value: toaNhaId }];

  if (searchTerm) {
    queryFromWhere += ` AND (lt.TenLoaiTang LIKE @SearchTerm OR tnt.MoTa LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }

  const countQuery = `SELECT COUNT(tnt.ToaNhaTangID) AS TotalItems ${queryFromWhere}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = ['lt.SoThuTu', 'lt.TenLoaiTang', 'tnt.SoPhong'];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'lt.SoThuTu';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        ${querySelect}
        ${queryFromWhere}
        ORDER BY ${safeSortBy} ${safeSortOrder}, tnt.ToaNhaTangID ${safeSortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
    `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);
  const items = itemsResult.recordset.map((row) => ({
    toaNhaTangID: row.ToaNhaTangID,
    toaNha: {
      toaNhaID: row.TN_ToaNhaID,
      maToaNha: row.TN_MaToaNha,
      tenToaNha: row.TN_TenToaNha,
      coSo: {
        donViID: row.CS_TN_DonViID,
        tenDonVi: row.CS_TN_TenDonVi,
        maDonVi: row.CS_TN_MaDonVi,
        loaiDonVi: row.CS_TN_LoaiDonVi,
      },
    },
    loaiTang: {
      loaiTangID: row.LT_LoaiTangID,
      maLoaiTang: row.LT_MaLoaiTang,
      tenLoaiTang: row.LT_TenLoaiTang,
      soThuTu: row.LT_SoThuTu,
      moTa: row.LT_MoTa,
    },
    soPhong: row.SoPhong,
    moTa: row.MoTa,
  }));

  let thongTinToaNhaCha = null;
  if (items.length > 0) {
    // Lấy từ item đầu tiên
    thongTinToaNhaCha = items[0].toaNha;
  } else if (totalItems === 0) {
    // Nếu không có tầng nào, vẫn cố lấy thông tin tòa nhà
    const toaNhaChaQuery = `
            SELECT tn.ToaNhaID, tn.MaToaNha, tn.TenToaNha,
                   cs.DonViID AS CoSo_DonViID, cs.TenDonVi AS CoSo_TenDonVi, cs.MaDonVi AS CoSo_MaDonVi, cs.LoaiDonVi AS CoSo_LoaiDonVi
            FROM ToaNha tn
            JOIN DonVi cs ON tn.CoSoID = cs.DonViID
            WHERE tn.ToaNhaID = @ToaNhaID`;
    const tncResult = await executeQuery(toaNhaChaQuery, [
      { name: 'ToaNhaID', type: sql.Int, value: toaNhaId },
    ]);
    if (tncResult.recordset.length > 0) {
      const tncRow = tncResult.recordset[0];
      thongTinToaNhaCha = {
        toaNhaID: tncRow.ToaNhaID,
        maToaNha: tncRow.MaToaNha,
        tenToaNha: tncRow.TenToaNha,
        coSo: {
          donViID: tncRow.CoSo_DonViID,
          tenDonVi: tncRow.CoSo_TenDonVi,
          maDonVi: tncRow.CoSo_MaDonVi,
          loaiDonVi: tncRow.CoSo_LoaiDonVi,
        },
      };
    }
  }

  return { items, totalItems, thongTinToaNhaCha };
};

/**
 * Cập nhật thông tin tầng vật lý theo ID.
 * @param {number} toaNhaTangID - ID tầng vật lý cần cập nhật.
 * @param {Object} updateData - Dữ liệu cập nhật (soPhong, moTa).
 * @returns {Promise<Object|null>} Đối tượng tầng sau khi cập nhật hoặc null nếu không tồn tại.
 */
const updateToaNhaTangById = async (toaNhaTangID, updateData) => {
  const setClauses = [];
  const params = [{ name: 'ToaNhaTangID', type: sql.Int, value: toaNhaTangID }];

  // Không cho sửa LoaiTangID hoặc ToaNhaID
  if (updateData.soPhong !== undefined) {
    setClauses.push('SoPhong = @SoPhong');
    params.push({ name: 'SoPhong', type: sql.Int, value: updateData.soPhong });
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
    return getToaNhaTangById(toaNhaTangID);
  }

  const query = `
        UPDATE ToaNha_Tang
        SET ${setClauses.join(', ')}
        OUTPUT inserted.ToaNhaTangID
        WHERE ToaNhaTangID = @ToaNhaTangID;
    `;
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Xóa tầng vật lý theo ID (chỉ xóa nếu không có phòng liên kết).
 * @param {number} toaNhaTangID - ID tầng vật lý cần xóa.
 * @param {Object|null} [transaction] - Transaction SQL (tùy chọn).
 * @returns {Promise<number>} Số bản ghi bị xóa (1 nếu thành công).
 * @throws {ApiError} Nếu tầng đang có phòng liên kết.
 */
const deleteToaNhaTangById = async (toaNhaTangID, transaction = null) => {
  const checkUsageQuery = `SELECT COUNT(*) as count FROM Phong WHERE ToaNhaTangID = @ToaNhaTangID`;
  const usageParams = [
    { name: 'ToaNhaTangID', type: sql.Int, value: toaNhaTangID },
  ];
  let request = transaction
    ? transaction.request()
    : (await getPool()).request();
  usageParams.forEach((p) => request.input(p.name, p.type, p.value));
  const usageResult = await request.query(checkUsageQuery);

  if (usageResult.recordset[0].count > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Tầng vật lý này đang có các phòng được liên kết. Không thể xóa.'
    );
  }

  const deleteQuery = `DELETE FROM ToaNha_Tang WHERE ToaNhaTangID = @ToaNhaTangID;`;
  request = transaction ? transaction.request() : (await getPool()).request();
  request.input('ToaNhaTangID', sql.Int, toaNhaTangID);
  const result = await request.query(deleteQuery);
  return result.rowsAffected[0];
};

/**
 * Lấy danh sách tầng vật lý để chọn (select option).
 * @param {Object} params - Tham số truy vấn (toaNhaID, searchTerm, limit).
 * @returns {Promise<Array>} Danh sách tầng vật lý phù hợp để chọn.
 */
const getToaNhaTangForSelect = async (params) => {
  const { toaNhaID, searchTerm, limit = 100 } = params;
  let query = `
        SELECT
            tnt.ToaNhaTangID,
            tn.ToaNhaID,
            tn.TenToaNha,
            lt.LoaiTangID,
            lt.TenLoaiTang,
            tnt.MoTa AS MoTaTangVatLy -- Mô tả của ToaNha_Tang
        FROM ToaNha_Tang tnt
        JOIN ToaNha tn ON tnt.ToaNhaID = tn.ToaNhaID
        JOIN LoaiTang lt ON tnt.LoaiTangID = lt.LoaiTangID
        WHERE 1=1
    `;

  const queryParams = [];
  if (toaNhaID) {
    query += ` AND tnt.ToaNhaID = @ToaNhaID `;
    queryParams.push({ name: 'ToaNhaID', type: sql.Int, value: toaNhaID });
  }
  if (searchTerm) {
    query += ` AND (tn.TenToaNha LIKE @SearchTerm OR lt.TenLoaiTang LIKE @SearchTerm OR tnt.MoTa LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }

  query += ` ORDER BY tn.TenToaNha ASC, lt.SoThuTu ASC, lt.TenLoaiTang ASC `;
  query = query.replace(/^(\s*SELECT\s+)/i, '$1TOP 100 PERCENT ');

  query = `SELECT TOP (@Limit) * FROM (${query}) AS SubQuery`;
  queryParams.push({ name: 'Limit', type: sql.Int, value: limit });

  const result = await executeQuery(query, queryParams);
  return result.recordset.map((row) => ({
    toaNhaTangID: row.ToaNhaTangID,
    tenHienThi: `${row.TenToaNha} - ${row.TenLoaiTang}${row.MoTaTangVatLy ? ' (' + row.MoTaTangVatLy + ')' : ''}`,
    toaNhaID: row.ToaNhaID,
    tenToaNha: row.TenToaNha,
    loaiTangID: row.LoaiTangID,
    tenLoaiTang: row.TenLoaiTang,
    moTaTang: row.MoTaTangVatLy,
  }));
};

export const toaNhaTangRepository = {
  createToaNhaTang,
  getToaNhaTangById,
  checkToaNhaTangExists,
  getToaNhaTangListByToaNhaId,
  updateToaNhaTangById,
  deleteToaNhaTangById,
  getToaNhaTangForSelect,
};
