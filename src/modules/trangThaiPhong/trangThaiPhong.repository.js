// src/modules/danhMuc/trangThaiPhong.repository.js
import { executeQuery } from '../../utils/database.js';
import sql from 'mssql';

/**
 * Lấy danh sách trạng thái phòng (có thể giới hạn số lượng).
 * @param {Object} params - Tham số truy vấn (limit).
 * @param {number} [params.limit=20] - Số lượng trạng thái phòng tối đa trả về.
 * @returns {Promise<Array>} Danh sách trạng thái phòng.
 */
const getAllTrangThaiPhong = async (params) => {
  const { limit = 20 } = params;
  let query = `SELECT TOP (@Limit) TrangThaiPhongID, MaTrangThai, TenTrangThai, MoTa FROM TrangThaiPhong`;
  const queryParams = [{ name: 'Limit', type: sql.Int, value: limit }];

  query += ` ORDER BY TenTrangThai ASC;`;

  const result = await executeQuery(query, queryParams);
  return result.recordset.map((row) => ({
    trangThaiPhongID: row.TrangThaiPhongID,
    maTrangThai: row.MaTrangThai,
    tenTrangThai: row.TenTrangThai,
  }));
};

export const trangThaiPhongRepository = {
  getAllTrangThaiPhong,
};
