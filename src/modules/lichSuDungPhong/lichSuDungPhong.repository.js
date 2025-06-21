// src/modules/lichSuDungPhong/lichSuDungPhong.repository.js
import sql from 'mssql';
import { executeQuery, getPool } from '../../utils/database.js';
import MaTrangThaiYeuCauPhong from '../../enums/maTrangThaiYeuCauPhong.enum.js';
import logger from '../../utils/logger.util.js';

/**
 * Lấy dữ liệu lịch đặt phòng dựa trên các bộ lọc.
 * @param {object} params - Tham số lọc (tuNgay, denNgay, phongIDs, toaNhaID, loaiPhongID, suKienID, donViToChucID)
 * @returns {Promise<Array<object>>} Danh sách lịch đặt phòng phù hợp
 */
const getLichDatPhongRecords = async (params) => {
  const {
    tuNgay,
    denNgay,
    phongIDs,
    toaNhaID,
    loaiPhongID,
    suKienID,
    donViToChucID,
  } = params;

  const denNgayThucTe = new Date(denNgay);
  denNgayThucTe.setHours(23, 59, 59, 999);

  let finalQuery = `
        WITH ActiveBookings AS (
            SELECT 
                yct.YcMuonPhongCtID,
                MAX(COALESCE(ycdp_approved.DatPhongID_Moi, cdp.DatPhongID)) AS ActiveDatPhongID -- Dùng hàm tổng hợp MAX() hoặc MIN()
            FROM YcMuonPhongChiTiet yct
            LEFT JOIN ChiTietDatPhong cdp ON yct.YcMuonPhongCtID = cdp.YcMuonPhongCtID
            JOIN TrangThaiYeuCauPhong tt_ct ON yct.TrangThaiCtID = tt_ct.TrangThaiYcpID
            LEFT JOIN (
                SELECT 
                    ycdp_inner.YcMuonPhongCtID,
                    ycdp_inner.DatPhongID_Moi,
                    ROW_NUMBER() OVER(PARTITION BY ycdp_inner.YcMuonPhongCtID ORDER BY ycdp_inner.NgayDuyetDoiCSVC DESC) as rn
                FROM YeuCauDoiPhong ycdp_inner
                JOIN TrangThaiYeuCauDoiPhong tt ON ycdp_inner.TrangThaiYcDoiPID = tt.TrangThaiYcDoiPID
                WHERE tt.MaTrangThai = 'DA_DUYET_DOI_PHONG'
            ) ycdp_approved ON yct.YcMuonPhongCtID = ycdp_approved.YcMuonPhongCtID AND ycdp_approved.rn = 1
            -- Chỉ lấy các chi tiết yêu cầu đã được duyệt, tránh các chi tiết đang chờ hoặc đã hủy
            WHERE tt_ct.MaTrangThai = @MaTrangThaiDaXepPhong
            GROUP BY yct.YcMuonPhongCtID -- <<== THÊM GROUP BY ĐỂ ĐẢM BẢO MỖI YcMuonPhongCtID CHỈ CÓ 1 DÒNG
        )
        SELECT
            cdp.DatPhongID, cdp.YcMuonPhongCtID, cdp.TgNhanPhongTT, cdp.TgTraPhongTT,
            p.PhongID, p.TenPhong, p.MaPhong, p.SucChua AS Phong_SucChua, p.ToaNhaTangID AS Phong_ToaNhaTangID,
            tt_dp.MaTrangThai AS TrangThaiPhong_Ma,
            lp.LoaiPhongID AS LoaiPhong_ID, lp.TenLoaiPhong AS LoaiPhong_Ten,
            sk.SuKienID, sk.TenSK,
            dv_tc.DonViID AS DonViToChuc_ID, dv_tc.TenDonVi AS DonViToChuc_Ten, dv_tc.MaDonVi AS DonViToChuc_Ma, dv_tc.LoaiDonVi AS DonViToChuc_LoaiDonVi
        FROM ChiTietDatPhong cdp
        JOIN ActiveBookings ab ON cdp.DatPhongID = ab.ActiveDatPhongID
        JOIN Phong p ON cdp.PhongID = p.PhongID
        JOIN TrangThaiPhong tt_dp ON p.TrangThaiPhongID = tt_dp.TrangThaiPhongID
        JOIN LoaiPhong lp ON p.LoaiPhongID = lp.LoaiPhongID
        JOIN YcMuonPhongChiTiet yct ON cdp.YcMuonPhongCtID = yct.YcMuonPhongCtID
        JOIN YeuCauMuonPhong yc ON yct.YcMuonPhongID = yc.YcMuonPhongID
        JOIN SuKien sk ON yc.SuKienID = sk.SuKienID
        JOIN DonVi dv_tc ON sk.DonViChuTriID = dv_tc.DonViID
        LEFT JOIN ToaNha_Tang tnt ON p.ToaNhaTangID = tnt.ToaNhaTangID
        LEFT JOIN ToaNha tn ON tnt.ToaNhaID = tn.ToaNhaID
        WHERE 
            cdp.TgNhanPhongTT < @DenNgayThucTe 
            AND cdp.TgTraPhongTT > @TuNgay
            AND (@PhongIDs_TVP IS NULL OR p.PhongID IN (SELECT ID FROM @PhongIDs_TVP))
            AND (@ToaNhaID IS NULL OR tn.ToaNhaID = @ToaNhaID)
            AND (@LoaiPhongID IS NULL OR p.LoaiPhongID = @LoaiPhongID)
            AND (@SuKienID IS NULL OR sk.SuKienID = @SuKienID)
            AND (@DonViToChucID IS NULL OR sk.DonViChuTriID = @DonViToChucID)
        ORDER BY cdp.TgNhanPhongTT ASC, p.TenPhong ASC;
    `;

  // Chuẩn bị tham số
  const request = (await getPool()).request();
  request.input(
    'MaTrangThaiDaXepPhong',
    sql.VarChar,
    MaTrangThaiYeuCauPhong.YCCPCT_DA_XEP_PHONG
  );
  request.input('TuNgay', sql.DateTime, new Date(tuNgay));
  request.input('DenNgayThucTe', sql.DateTime, denNgayThucTe);
  request.input('ToaNhaID', sql.Int, toaNhaID);
  request.input('LoaiPhongID', sql.Int, loaiPhongID);
  request.input('SuKienID', sql.Int, suKienID);
  request.input('DonViToChucID', sql.Int, donViToChucID);

  if (phongIDs && phongIDs.length > 0) {
    // Tạo chuỗi ID cho truy vấn IN
    const phongIDsStr = phongIDs.map((id) => Number(id)).join(',');
    finalQuery = finalQuery.replace(
      '(@PhongIDs_TVP IS NULL OR p.PhongID IN (SELECT ID FROM @PhongIDs_TVP))',
      `(p.PhongID IN (${phongIDsStr}))`
    );
    request.input('PhongIDs_TVP', null);
  } else {
    finalQuery = finalQuery.replace(
      '(@PhongIDs_TVP IS NULL OR p.PhongID IN (SELECT ID FROM @PhongIDs_TVP))',
      '1=1'
    );
    request.input('PhongIDs_TVP', null);
  }

  const result = await request.query(finalQuery);
  logger.info('Lấy lịch đặt phòng thành công:', result.recordset);

  return result.recordset.map((row) => ({
    datPhongID: Number(row.DatPhongID),
    phong: {
      phongID: row.PhongID,
      tenPhong: row.TenPhong,
      maPhong: row.MaPhong,
      sucChua: row.Phong_SucChua,
      loaiPhong: row.LoaiPhong_ID
        ? { loaiPhongID: row.LoaiPhong_ID, tenLoaiPhong: row.LoaiPhong_Ten }
        : null,
      toaNhaTangID: row.Phong_ToaNhaTangID,
    },
    ycMuonPhongCtID: row.YcMuonPhongCtID,
    suKienID: row.SuKienID,
    tenSK: row.TenSK,
    maTrangThaiDatPhong: row.TrangThaiPhong_Ma,
    donViToChuc: {
      donViID: row.DonViToChuc_ID,
      tenDonVi: row.DonViToChuc_Ten,
      maDonVi: row.DonViToChuc_Ma,
      loaiDonVi: row.DonViToChuc_LoaiDonVi,
    },
    tgNhanPhongTT: row.TgNhanPhongTT.toISOString(),
    tgTraPhongTT: row.TgTraPhongTT.toISOString(),
  }));
};

/**
 * Lấy lịch đặt của một phòng cụ thể với phân trang và lọc thời gian
 * @param {number} phongId
 * @param {object} params - { tuNgay, denNgay, page, limit, sortBy, sortOrder }
 * @returns {Promise<{ items: Array<object>, totalItems: number }>}
 */
const getLichDatPhongByPhongId = async (phongId, params) => {
  const {
    tuNgay,
    denNgay,
    page = 1,
    limit = 10,
    sortBy = 'cdp.TgNhanPhongTT',
    sortOrder = 'DESC',
  } = params;

  const selectClause = `
        SELECT
            cdp.DatPhongID,
            cdp.YcMuonPhongCtID,
            cdp.TgNhanPhongTT,
            cdp.TgTraPhongTT,
            p.PhongID,
            p.TenPhong,
            p.MaPhong,
            p.SucChua AS Phong_SucChua,
            p.ToaNhaTangID AS Phong_ToaNhaTangID,
            lp.LoaiPhongID AS LoaiPhong_ID,
            lp.TenLoaiPhong AS LoaiPhong_Ten,
            sk.SuKienID,
            sk.TenSK,
            dv_tc.DonViID AS DonViToChuc_ID,
            dv_tc.TenDonVi AS DonViToChuc_Ten,
            dv_tc.MaDonVi AS DonViToChuc_Ma,
            dv_tc.LoaiDonVi AS DonViToChuc_LoaiDonVi,
            nd_yc.NguoiDungID AS NguoiYeuCau_ID,
            nd_yc.HoTen AS NguoiYeuCau_HoTen,
            nd_yc.Email AS NguoiYeuCau_Email,
            tt_yct.MaTrangThai AS MaTrangThaiDatPhong -- Trạng thái của chi tiết yêu cầu phòng
    `;
  const fromClause = `
        FROM ChiTietDatPhong cdp
        JOIN Phong p ON cdp.PhongID = p.PhongID
        JOIN LoaiPhong lp ON p.LoaiPhongID = lp.LoaiPhongID
        JOIN YcMuonPhongChiTiet yct ON cdp.YcMuonPhongCtID = yct.YcMuonPhongCtID
        JOIN YeuCauMuonPhong yc ON yct.YcMuonPhongID = yc.YcMuonPhongID
        JOIN NguoiDung nd_yc ON yc.NguoiYeuCauID = nd_yc.NguoiDungID -- Người yêu cầu phòng
        JOIN SuKien sk ON yc.SuKienID = sk.SuKienID
        JOIN DonVi dv_tc ON sk.DonViChuTriID = dv_tc.DonViID
        JOIN TrangThaiYeuCauPhong tt_yct ON yct.TrangThaiCtID = tt_yct.TrangThaiYcpID
    `;
  let whereClause = ` WHERE cdp.PhongID = @PhongID AND tt_yct.MaTrangThai = @MaTrangThaiDaXepPhong `;
  const queryParams = [
    { name: 'PhongID', type: sql.Int, value: phongId },
    {
      name: 'MaTrangThaiDaXepPhong',
      type: sql.VarChar,
      value: MaTrangThaiYeuCauPhong.YCCPCT_DA_XEP_PHONG,
    },
  ];

  if (tuNgay) {
    whereClause += ` AND cdp.TgTraPhongTT > @TuNgay `; // Kết thúc phải sau tuNgay
    queryParams.push({
      name: 'TuNgay',
      type: sql.DateTime,
      value: new Date(tuNgay),
    });
  }
  if (denNgay) {
    const denNgayThucTe = new Date(denNgay);
    denNgayThucTe.setHours(23, 59, 59, 999);
    whereClause += ` AND cdp.TgNhanPhongTT < @DenNgayThucTe `; // Bắt đầu phải trước denNgay
    queryParams.push({
      name: 'DenNgayThucTe',
      type: sql.DateTime,
      value: denNgayThucTe,
    });
  }

  const countQuery = `SELECT COUNT(cdp.DatPhongID) AS TotalItems ${fromClause} ${whereClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = [
    'cdp.TgNhanPhongTT',
    'cdp.TgTraPhongTT',
    'sk.TenSK',
    'p.TenPhong',
  ];
  const safeSortBy = allowedSortBy.includes(sortBy)
    ? sortBy
    : 'cdp.TgNhanPhongTT';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        ${selectClause}
        ${fromClause}
        ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        OFFSET ${offset} ROWS
        FETCH NEXT ${limit} ROWS ONLY;
    `;

  const itemsResult = await executeQuery(itemsQuery, queryParams);
  const items = itemsResult.recordset.map((row) => ({
    datPhongID: Number(row.DatPhongID),
    phong: {
      phongID: row.PhongID,
      tenPhong: row.TenPhong,
      maPhong: row.MaPhong,
      sucChua: row.Phong_SucChua,
      loaiPhong: row.LoaiPhong_ID
        ? {
            loaiPhongID: row.LoaiPhong_ID,
            tenLoaiPhong: row.LoaiPhong_Ten,
          }
        : null,
    },
    ycMuonPhongCtID: row.YcMuonPhongCtID,
    maTrangThaiDatPhong: row.MaTrangThaiDatPhong, // Trạng thái của YcMuonPhongChiTiet
    suKienID: row.SuKienID,
    tenSK: row.TenSK,
    donViToChuc: {
      donViID: row.DonViToChuc_ID,
      tenDonVi: row.DonViToChuc_Ten,
      maDonVi: row.DonViToChuc_Ma,
      loaiDonVi: row.DonViToChuc_LoaiDonVi,
    },
    nguoiYeuCau: row.NguoiYeuCau_ID
      ? {
          nguoiDungID: row.NguoiYeuCau_ID,
          hoTen: row.NguoiYeuCau_HoTen,
          email: row.NguoiYeuCau_Email,
        }
      : null,
    tgNhanPhongTT: row.TgNhanPhongTT.toISOString(),
    tgTraPhongTT: row.TgTraPhongTT.toISOString(),
  }));

  return { items, totalItems };
};

// /**
//  * [MỚI] Lấy dữ liệu các khung giờ bận của các phòng cho dashboard công khai.
//  * @param {object} params - { tuNgay, denNgay, toaNhaID, loaiPhongID }
//  * @returns {Promise<Array<object>>} Danh sách các bản ghi chứa thông tin phòng và khung giờ bận.
//  */
// const getPublicRoomUsage = async (params) => {
//   const { tuNgay, denNgay, toaNhaID, loaiPhongID } = params;

//   let whereClause =
//     ' WHERE cdp.TgNhanPhongTT < @DenNgayNextDay AND cdp.TgTraPhongTT > @TuNgay ';
//   const queryParams = [
//     { name: 'TuNgay', type: sql.Date, value: tuNgay },
//     // Thêm 1 ngày vào denNgay để bao gồm cả các lịch đặt trong ngày cuối cùng
//     {
//       name: 'DenNgayNextDay',
//       type: sql.Date,
//       value: new Date(
//         new Date(denNgay).setDate(new Date(denNgay).getDate() + 1)
//       ),
//     },
//   ];

//   let fromClause = `
//         FROM ChiTietDatPhong cdp
//         JOIN Phong p ON cdp.PhongID = p.PhongID
//     `;

//   if (toaNhaID) {
//     fromClause += `
//             JOIN ToaNha_Tang tnt ON p.ToaNhaTangID = tnt.ToaNhaTangID
//         `;
//     whereClause += ` AND tnt.ToaNhaID = @ToaNhaID `;
//     queryParams.push({ name: 'ToaNhaID', type: sql.Int, value: toaNhaID });
//   }
//   if (loaiPhongID) {
//     whereClause += ` AND p.LoaiPhongID = @LoaiPhongID `;
//     queryParams.push({
//       name: 'LoaiPhongID',
//       type: sql.Int,
//       value: loaiPhongID,
//     });
//   }

//   const query = `
//         SELECT
//             p.PhongID,
//             p.TenPhong,
//             p.MaPhong,
//             cdp.TgNhanPhongTT AS BatDau,
//             cdp.TgTraPhongTT AS KetThuc
//         ${fromClause}
//         ${whereClause}
//         ORDER BY p.PhongID, cdp.TgNhanPhongTT;
//     `;

//   const result = await executeQuery(query, queryParams);
//   return result.recordset;
// };

export const lichSuDungPhongRepository = {
  getLichDatPhongRecords,
  getLichDatPhongByPhongId,
  // getPublicRoomUsage,
};
