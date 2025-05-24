// src/modules/phong/phong.repository.js
import { executeQuery } from '../../utils/database.js';
import sql from 'mssql';
import MaTrangThaiYeuCauPhong from '../../enums/maTrangThaiYeuCauPhong.enum.js';

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

  let selectFields = `p.PhongID, p.TenPhong, p.MaPhong, p.SucChua, lp.TenLoaiPhong, lp.LoaiPhongID, p.ViTri `;
  let fromClause = `
        FROM Phong p
        JOIN LoaiPhong lp ON p.LoaiPhongID = lp.LoaiPhongID
        JOIN TrangThaiPhong ttp ON p.TrangThaiPhongID = ttp.TrangThaiPhongID
    `;
  let whereClause = ` WHERE ttp.TenTrangThai = @TrangThaiPhong `; // Giả sử TenTrangThai là mã hoặc bạn dùng MaTrangThai
  const queryParams = [
    { name: 'TrangThaiPhong', type: sql.NVarChar, value: trangThaiPhongMa },
  ]; // Hoặc VarChar nếu mã là varchar

  if (searchTerm) {
    whereClause += ` AND (p.TenPhong LIKE @SearchTerm OR p.MaPhong LIKE @SearchTerm OR p.ViTri LIKE @SearchTerm) `;
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
    viTri: p.ViTri,
  }));
  return { items, totalItems };
};

export const phongRepository = {
  // Hoặc tên export của bạn
  getPhongForSelect,
  // ... các hàm khác cho phòng
};
