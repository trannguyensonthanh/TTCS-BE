// src/modules/lichSuDungPhong/lichSuDungPhong.repository.js
import { executeQuery, getPool } from '../../utils/database.js';
import sql from 'mssql';
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

export const lichSuDungPhongRepository = {
  getLichDatPhongRecords,
};
