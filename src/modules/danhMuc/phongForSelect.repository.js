// src/modules/phong/phong.repository.js
import sql from 'mssql';
import { executeQuery } from '../../utils/database.js';
import MaTrangThaiYeuCauPhong from '../../enums/maTrangThaiYeuCauPhong.enum.js';

/**
 * Lấy danh sách phòng cho select theo các tiêu chí lọc, phân trang, kiểm tra phòng trống nếu có thời gian.
 * @param {object} params - Tham số lọc, phân trang, kiểm tra phòng trống (searchTerm, loaiPhongID, sucChuaToiThieu, thoiGianMuon, thoiGianTra, trangThaiPhongMa, page, limit, sortBy, sortOrder)
 * @returns {Promise<{items: Array<object>, totalItems: number}>} Danh sách phòng phù hợp và tổng số phòng
 */
const getPhongForSelect = async (params) => {
  const {
    searchTerm,
    loaiPhongID,
    sucChuaToiThieu,
    thoiGianMuon,
    thoiGianTra,
    trangThaiPhongMa = 'SAN_SANG', // Mã cho 'Sẵn sàng'
    page = 1,
    limit = 50,
    sortBy = 'p.TenPhong',
    sortOrder = 'ASC',
  } = params;
  const queryParams = [];

  // [SỬA LỖI 1] Đặt alias nhất quán
  const fromClause = `
        FROM Phong p
        JOIN LoaiPhong lp ON p.LoaiPhongID = lp.LoaiPhongID
        JOIN TrangThaiPhong ttp ON p.TrangThaiPhongID = ttp.TrangThaiPhongID
        LEFT JOIN ToaNha_Tang tnt ON p.ToaNhaTangID = tnt.ToaNhaTangID
        LEFT JOIN ToaNha tn ON tnt.ToaNhaID = tn.ToaNhaID
        LEFT JOIN LoaiTang lt ON tnt.LoaiTangID = lt.LoaiTangID
    `;
  let whereClause = ` WHERE ttp.MaTrangThai = @TrangThaiPhong `;
  queryParams.push({
    name: 'TrangThaiPhong',
    type: sql.NVarChar,
    value: trangThaiPhongMa,
  });

  if (searchTerm) {
    // [SỬA LỖI 1] Sử dụng đúng alias: tn.TenToaNha
    whereClause += ` AND (p.TenPhong LIKE @SearchTerm OR p.MaPhong LIKE @SearchTerm OR p.SoThuTuPhong LIKE @SearchTerm OR tn.TenToaNha LIKE @SearchTerm OR lt.TenLoaiTang LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }
  if (loaiPhongID) {
    whereClause += ` AND p.LoaiPhongID = @LoaiPhongID `;
    queryParams.push({
      name: 'LoaiPhongID',
      type: sql.Int,
      value: loaiPhongID,
    });
  }
  if (sucChuaToiThieu) {
    whereClause += ` AND p.SucChua >= @SucChuaToiThieu `;
    queryParams.push({
      name: 'SucChuaToiThieu',
      type: sql.Int,
      value: sucChuaToiThieu,
    });
  }

  // [TỐI ƯU 2 & 3] Logic kiểm tra phòng trống
  if (thoiGianMuon && thoiGianTra) {
    // Chuyển từ NOT IN sang NOT EXISTS để có hiệu năng tốt hơn
    whereClause += `
            AND NOT EXISTS (
                SELECT 1
                FROM ChiTietDatPhong cdp
                WHERE cdp.PhongID = p.PhongID
                  AND (cdp.TgNhanPhongTT < @ThoiGianTra AND cdp.TgTraPhongTT > @ThoiGianMuon)
            )
        `;
    // Sử dụng DateTimeOffset để xử lý múi giờ chính xác
    queryParams.push({
      name: 'ThoiGianMuon',
      type: sql.DateTimeOffset,
      value: new Date(thoiGianMuon),
    });
    queryParams.push({
      name: 'ThoiGianTra',
      type: sql.DateTimeOffset,
      value: new Date(thoiGianTra),
    });
  }

  // Câu query đếm tổng số bản ghi
  const countQuery = `SELECT COUNT(DISTINCT p.PhongID) AS TotalItems ${fromClause} ${whereClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems =
    countResult.recordset.length > 0 ? countResult.recordset[0].TotalItems : 0;

  // Logic phân trang và sắp xếp giữ nguyên
  const allowedSortBy = [
    'p.TenPhong',
    'p.MaPhong',
    'p.SucChua',
    'lp.TenLoaiPhong',
  ];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'p.TenPhong';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  // Câu query lấy dữ liệu
  const selectFields = `p.PhongID, p.TenPhong, p.MaPhong, p.SucChua, lp.TenLoaiPhong, lp.LoaiPhongID, p.SoThuTuPhong, p.ToaNhaTangID`;
  const itemsQuery = `
        SELECT ${selectFields}
        ${fromClause}
        ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
    `;
  queryParams.push({ name: 'Offset', type: sql.Int, value: offset });
  queryParams.push({ name: 'Limit', type: sql.Int, value: limit });

  const itemsResult = await executeQuery(itemsQuery, queryParams);
  const items = itemsResult.recordset.map((p) => ({
    phongID: p.PhongID,
    tenPhong: p.TenPhong,
    maPhong: p.MaPhong,
    sucChua: p.SucChua,
    tenLoaiPhong: p.TenLoaiPhong,
    loaiPhongID: p.LoaiPhongID,
    toaNhaTangID: p.ToaNhaTangID,
  }));

  return { items, totalItems };
};

export const phongRepository = {
  getPhongForSelect,
};
