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
  const selectFields = `p.PhongID, p.TenPhong, p.MaPhong, p.SucChua, lp.TenLoaiPhong, lp.LoaiPhongID, p.SoThuTuPhong, p.ToaNhaTangID `;
  const fromClause = `
        FROM Phong p
        JOIN LoaiPhong lp ON p.LoaiPhongID = lp.LoaiPhongID
        JOIN TrangThaiPhong ttp ON p.TrangThaiPhongID = ttp.TrangThaiPhongID
        JOIN ToaNha_Tang tn ON p.ToaNhaTangID = tn.ToaNhaTangID
        JOIN LoaiTang lt ON tn.LoaiTangID = lt.LoaiTangID
        JOIN ToaNha t ON tn.ToaNhaID = t.ToaNhaID
   
    `;
  let whereClause = ` WHERE ttp.MaTrangThai = @TrangThaiPhong `;
  const queryParams = [
    { name: 'TrangThaiPhong', type: sql.NVarChar, value: trangThaiPhongMa },
  ];

  if (searchTerm) {
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

  // Logic kiểm tra phòng trống nếu có thời gian
  if (thoiGianMuon && thoiGianTra) {
    whereClause += `
            AND p.PhongID NOT IN (
                SELECT DISTINCT cdp.PhongID
                FROM ChiTietDatPhong cdp
                JOIN YcMuonPhongChiTiet yct ON cdp.YcMuonPhongCtID = yct.YcMuonPhongCtID
                JOIN TrangThaiYeuCauPhong tt_ct ON yct.TrangThaiCtID = tt_ct.TrangThaiYcpID
                WHERE tt_ct.MaTrangThai = @MaTrangThaiDaXepPhong -- Chỉ xét các phòng đã được xếp
                  AND (
                       (cdp.TgNhanPhongTT < @ThoiGianTra AND cdp.TgTraPhongTT > @ThoiGianMuon)
                       -- Các trường hợp trùng lặp khác nếu cần
                      )
            )
        `;
    queryParams.push({
      name: 'ThoiGianMuon',
      type: sql.DateTime,
      value: new Date(thoiGianMuon),
    });
    queryParams.push({
      name: 'ThoiGianTra',
      type: sql.DateTime,
      value: new Date(thoiGianTra),
    });
    queryParams.push({
      name: 'MaTrangThaiDaXepPhong',
      type: sql.VarChar,
      value: MaTrangThaiYeuCauPhong.YCCPCT_DA_XEP_PHONG,
    });
  }

  const countQuery = `SELECT COUNT(DISTINCT p.PhongID) AS TotalItems ${fromClause} ${whereClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = [
    'p.TenPhong',
    'p.MaPhong',
    'p.SucChua',
    'lp.TenLoaiPhong',
  ];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'p.TenPhong';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        SELECT ${selectFields}
        ${fromClause}
        ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
    `;
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
