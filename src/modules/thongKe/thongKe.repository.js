// File: src/modules/thongKe/thongKe.repository.js
// Chứa các hàm truy vấn thống kê cho module Thống Kê

import sql from 'mssql';
import { executeQuery } from '../../utils/database.js';

/**
 * [MỚI] Lấy dữ liệu KPI tổng quan cho sự kiện.
 * @param {object} params - { tuNgay, denNgay, donViID }
 * @returns {Promise<object>} Dữ liệu KPI thô từ CSDL.
 */
const getKpiData = async (params) => {
  const { tuNgay, denNgay, donViID } = params;

  let whereClause = ' WHERE 1=1 ';
  const queryParams = [];

  if (tuNgay) {
    whereClause += ' AND sk.TgBatDauDK >= @TuNgay ';
    queryParams.push({ name: 'TuNgay', type: sql.Date, value: tuNgay });
  }
  if (denNgay) {
    whereClause += ' AND sk.TgBatDauDK <= @DenNgay ';
    queryParams.push({ name: 'DenNgay', type: sql.Date, value: denNgay });
  }
  if (donViID) {
    whereClause += ' AND sk.DonViChuTriID = @DonViID ';
    queryParams.push({ name: 'DonViID', type: sql.Int, value: donViID });
  }

  const query = `
        SELECT
            COUNT(DISTINCT sk.SuKienID) AS TongSuKien,
            SUM(CASE WHEN sk.TgBatDauDK > GETDATE() AND ttsk.MaTrangThai NOT IN ('DA_HUY', 'HOAN_THANH') THEN 1 ELSE 0 END) AS SuKienSapToi,
            SUM(ISNULL(sk.SlThamDuDK, 0)) AS TongLuotThamGiaDuKien,
            COUNT(dg.DanhGiaSkID) AS SoLuotDanhGia,
            AVG(CAST(dg.DiemNoiDung AS FLOAT)) AS DiemNoiDungTrungBinh,
            AVG(CAST(dg.DiemToChuc AS FLOAT)) AS DiemToChucTrungBinh,
            AVG(CAST(dg.DiemDiaDiem AS FLOAT)) AS DiemDiaDiemTrungBinh
        FROM SuKien sk
        LEFT JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
        LEFT JOIN DanhGiaSK dg ON sk.SuKienID = dg.SuKienID
        ${whereClause};
    `;

  const result = await executeQuery(query, queryParams);
  return result.recordset[0];
};

/**
 * [MỚI] Lấy dữ liệu thống kê sự kiện theo loại.
 * @param {object} params - { tuNgay, denNgay, donViID }
 * @returns {Promise<Array<object>>} Mảng dữ liệu thống kê theo loại.
 */
const getStatsByEventType = async (params) => {
  const { tuNgay, denNgay, donViID } = params;

  let whereClause = ' WHERE lsk.LoaiSuKienID IS NOT NULL ';
  const queryParams = [];

  if (tuNgay) {
    whereClause += ' AND sk.TgBatDauDK >= @TuNgay ';
    queryParams.push({ name: 'TuNgay', type: sql.Date, value: tuNgay });
  }
  if (denNgay) {
    whereClause += ' AND sk.TgBatDauDK <= @DenNgay ';
    queryParams.push({ name: 'DenNgay', type: sql.Date, value: denNgay });
  }
  if (donViID) {
    whereClause += ' AND sk.DonViChuTriID = @DonViID ';
    queryParams.push({ name: 'DonViID', type: sql.Int, value: donViID });
  }

  const query = `
        SELECT 
            lsk.LoaiSuKienID,
            lsk.TenLoaiSK,
            lsk.MaLoaiSK,
            COUNT(sk.SuKienID) AS SoLuongSuKien
        FROM LoaiSuKien lsk
        JOIN SuKien sk ON lsk.LoaiSuKienID = sk.LoaiSuKienID
        ${whereClause}
        GROUP BY lsk.LoaiSuKienID, lsk.TenLoaiSK, lsk.MaLoaiSK
        ORDER BY SoLuongSuKien DESC;
    `;

  const result = await executeQuery(query, queryParams);
  return result.recordset;
};

/**
 * [MỚI] Lấy dữ liệu thống kê sự kiện và người tham gia theo đơn vị thời gian.
 * @param {object} params - { tuNgay, denNgay, donViThoiGian, donViID }
 * @returns {Promise<Array<object>>} Mảng dữ liệu thống kê thô.
 */
const getStatsOverTime = async (params) => {
  const { tuNgay, denNgay, donViThoiGian, donViID } = params;

  let timeFormat;
  let timeGroup;
  switch (donViThoiGian) {
    case 'TUAN':
      timeFormat = `CONCAT(YEAR(sk.TgBatDauDK), '-W', FORMAT(DATEPART(iso_week, sk.TgBatDauDK), '00'))`;
      timeGroup = `YEAR(sk.TgBatDauDK), DATEPART(iso_week, sk.TgBatDauDK)`;
      break;
    case 'QUY':
      timeFormat = `CONCAT(YEAR(sk.TgBatDauDK), '-Q', DATEPART(quarter, sk.TgBatDauDK))`;
      timeGroup = `YEAR(sk.TgBatDauDK), DATEPART(quarter, sk.TgBatDauDK)`;
      break;
    case 'THANG':
    default:
      timeFormat = `FORMAT(sk.TgBatDauDK, 'yyyy-MM')`;
      timeGroup = `FORMAT(sk.TgBatDauDK, 'yyyy-MM')`;
      break;
  }

  let whereClause =
    ' WHERE sk.TgBatDauDK >= @TuNgay AND sk.TgBatDauDK < @DenNgayNextDay ';
  const queryParams = [
    { name: 'TuNgay', type: sql.Date, value: tuNgay },
    {
      name: 'DenNgayNextDay',
      type: sql.Date,
      value: new Date(
        new Date(denNgay).setDate(new Date(denNgay).getDate() + 1)
      ),
    },
  ];

  if (donViID) {
    whereClause += ' AND sk.DonViChuTriID = @DonViID ';
    queryParams.push({ name: 'DonViID', type: sql.Int, value: donViID });
  }

  const query = `
        SELECT
            ${timeFormat} AS ThoiGian,
            COUNT(sk.SuKienID) AS SoLuongSuKien,
            SUM(ISNULL(sk.SlThamDuDK, 0)) AS SoNguoiThamGiaDuKien
        FROM SuKien sk
        ${whereClause}
        GROUP BY ${timeGroup}
        ORDER BY ${timeGroup};
    `;

  const result = await executeQuery(query, queryParams);
  return result.recordset;
};

/**
 * [MỚI] Lấy danh sách các sự kiện sắp diễn ra cho Dashboard.
 * @param {object} params - { limit, donViID }
 * @returns {Promise<Array<object>>} Danh sách sự kiện sắp diễn ra.
 */
const getUpcomingEventsForDashboard = async (params) => {
  const { limit, donViID } = params;

  let whereClause = ` WHERE sk.TgBatDauDK > GETDATE() AND ttsk.MaTrangThai NOT IN ('DA_HUY', 'HOAN_THANH') `;
  const queryParams = [{ name: 'Limit', type: sql.Int, value: limit }];

  if (donViID) {
    whereClause += ` AND sk.DonViChuTriID = @DonViID `;
    queryParams.push({ name: 'DonViID', type: sql.Int, value: donViID });
  }

  const query = `
        SELECT TOP (@Limit)
            sk.suKienID,
            sk.tenSK,
            sk.tgBatDauDK,
            sk.tgKetThucDK,
            sk.slThamDuDK,
            (
                SELECT TOP 1 p.TenPhong 
                FROM YeuCauMuonPhong yc JOIN YcMuonPhongChiTiet yct ON yc.YcMuonPhongID = yct.YcMuonPhongID
                JOIN ChiTietDatPhong cdp ON yct.YcMuonPhongCtID = cdp.YcMuonPhongCtID
                JOIN Phong p ON cdp.PhongID = p.PhongID
                WHERE yc.SuKienID = sk.SuKienID
            ) AS DiaDiemDaXep,
            dv.TenDonVi AS TenDonViChuTri,
            lsk.TenLoaiSK,
            (
                SELECT COUNT(*) FROM SK_MoiThamGia skm WHERE skm.SuKienID = sk.SuKienID AND skm.IsChapNhanMoi = 1
            ) AS SoNguoiDaChapNhanMoi
        FROM SuKien sk
        JOIN DonVi dv ON sk.DonViChuTriID = dv.DonViID
        JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
        LEFT JOIN LoaiSuKien lsk ON sk.LoaiSuKienID = lsk.LoaiSuKienID
        ${whereClause}
        ORDER BY sk.TgBatDauDK ASC;
    `;

  const result = await executeQuery(query, queryParams);
  return result.recordset;
};

/**
 * [MỚI] Lấy dữ liệu thống kê số lượt đánh giá theo từng mức điểm.
 * @param {object} params - { tuNgay, denNgay, donViID, loaiSuKienID, tieuChiDiem }
 * @returns {Promise<Array<object>>} Mảng kết quả thô, mỗi object chứa { MucDiem, SoLuotDanhGia }.
 */
const getEventRatingStats = async (params) => {
  const {
    tuNgaySuKienKetThuc,
    denNgaySuKienKetThuc,
    donViID,
    loaiSuKienID,
    tieuChiDiem = 'TONG_QUAT',
  } = params;

  let diemField;
  switch (tieuChiDiem) {
    case 'NOI_DUNG':
      diemField = 'dg.DiemNoiDung';
      break;
    case 'TO_CHUC':
      diemField = 'dg.DiemToChuc';
      break;
    case 'DIA_DIEM':
      diemField = 'dg.DiemDiaDiem';
      break;
    case 'TONG_QUAT':
    default:
      diemField =
        'ROUND((CAST(dg.DiemNoiDung AS FLOAT) + CAST(dg.DiemToChuc AS FLOAT) + CAST(dg.DiemDiaDiem AS FLOAT)) / 3, 0)';
      break;
  }

  let whereClause = ' WHERE 1=1 ';
  const queryParams = [];

  if (tuNgaySuKienKetThuc) {
    whereClause +=
      ' AND COALESCE(sk.TgKetThucThucTe, sk.TgKetThucDK) >= @TuNgay ';
    queryParams.push({
      name: 'TuNgay',
      type: sql.Date,
      value: tuNgaySuKienKetThuc,
    });
  }
  if (denNgaySuKienKetThuc) {
    whereClause +=
      ' AND COALESCE(sk.TgKetThucThucTe, sk.TgKetThucDK) <= @DenNgay ';
    queryParams.push({
      name: 'DenNgay',
      type: sql.Date,
      value: denNgaySuKienKetThuc,
    });
  }
  if (donViID) {
    whereClause += ' AND sk.DonViChuTriID = @DonViID ';
    queryParams.push({ name: 'DonViID', type: sql.Int, value: donViID });
  }
  if (loaiSuKienID) {
    whereClause += ' AND sk.LoaiSuKienID = @LoaiSuKienID ';
    queryParams.push({
      name: 'LoaiSuKienID',
      type: sql.Int,
      value: loaiSuKienID,
    });
  }

  const query = `
        SELECT
            ${diemField} AS MucDiem,
            COUNT(*) AS SoLuotDanhGia
        FROM DanhGiaSK dg
        JOIN SuKien sk ON dg.SuKienID = sk.SuKienID
        ${whereClause}
        GROUP BY ${diemField}
        ORDER BY MucDiem ASC;
    `;

  const result = await executeQuery(query, queryParams);
  return result.recordset;
};

/**
 * [MỚI] Lấy dữ liệu KPI tổng quan cho Cơ sở vật chất.
 * @param {object} params - { toaNhaID, coSoID, ngayHienTai }
 * @returns {Promise<object>} Dữ liệu KPI thô từ CSDL.
 */
const getFacilityKpiData = async (params) => {
  const { toaNhaID, coSoID, ngayHienTai } = params;

  let phongFilterClause = ' WHERE 1=1 ';
  const phongFilterParams = [];
  if (toaNhaID) {
    phongFilterClause += ` AND tnt.ToaNhaID = @ToaNhaID `;
    phongFilterParams.push({
      name: 'ToaNhaID',
      type: sql.Int,
      value: toaNhaID,
    });
  }
  if (coSoID) {
    phongFilterClause += ` AND tn.CoSoID = @CoSoID `;
    phongFilterParams.push({ name: 'CoSoID', type: sql.Int, value: coSoID });
  }

  const phongStatsQuery = `
        SELECT
            COUNT(p.PhongID) AS TongSoPhong,
            SUM(CASE WHEN ttp.MaTrangThai = 'SAN_SANG' THEN 1 ELSE 0 END) AS PhongSanSang,
            SUM(CASE WHEN ttp.MaTrangThai = 'DANG_BAO_TRI' THEN 1 ELSE 0 END) AS PhongDangBaoTri,
            SUM(CASE WHEN ttp.MaTrangThai = 'NGUNG_SU_DUNG' THEN 1 ELSE 0 END) AS PhongNgungSuDung
        FROM Phong p
        JOIN TrangThaiPhong ttp ON p.TrangThaiPhongID = ttp.TrangThaiPhongID
        LEFT JOIN ToaNha_Tang tnt ON p.ToaNhaTangID = tnt.ToaNhaTangID
        LEFT JOIN ToaNha tn ON tnt.ToaNhaID = tn.ToaNhaID
        ${phongFilterClause};
    `;

  const phongDangSuDungQuery = `
        SELECT COUNT(DISTINCT p.PhongID) AS PhongDangSuDung
        FROM Phong p
        JOIN ChiTietDatPhong cdp ON p.PhongID = cdp.PhongID
        LEFT JOIN ToaNha_Tang tnt ON p.ToaNhaTangID = tnt.ToaNhaTangID
        LEFT JOIN ToaNha tn ON tnt.ToaNhaID = tn.ToaNhaID
        ${phongFilterClause}
        AND @NgayHienTai BETWEEN CAST(cdp.TgNhanPhongTT AS DATE) AND CAST(cdp.TgTraPhongTT AS DATE);
    `;
  const phongDangSuDungParams = [
    ...phongFilterParams,
    { name: 'NgayHienTai', type: sql.Date, value: ngayHienTai },
  ];

  const thietBiStatsQuery = `
        SELECT
            SUM(ptb.SoLuong) AS TongSoThietBi,
            SUM(CASE WHEN ptb.TinhTrang LIKE N'%Tốt%' THEN ptb.SoLuong ELSE 0 END) AS ThietBiTot,
            SUM(CASE WHEN ptb.TinhTrang NOT LIKE N'%Tốt%' AND ptb.TinhTrang IS NOT NULL THEN ptb.SoLuong ELSE 0 END) AS ThietBiCanBaoTri
        FROM Phong_ThietBi ptb
        JOIN Phong p ON ptb.PhongID = p.PhongID
        LEFT JOIN ToaNha_Tang tnt ON p.ToaNhaTangID = tnt.ToaNhaTangID
        LEFT JOIN ToaNha tn ON tnt.ToaNhaID = tn.ToaNhaID
        ${phongFilterClause};
    `;

  const yeuCauMuonPhongQuery = `
        SELECT COUNT(*) AS YeuCauMuonPhongChoDuyet
        FROM YeuCauMuonPhong yc
        JOIN TrangThaiYeuCauPhong ttyc ON yc.TrangThaiChungID = ttyc.TrangThaiYcpID
        WHERE ttyc.MaTrangThai IN ('YCCP_CHO_XU_LY', 'YCCP_DANG_XU_LY');
    `;
  const yeuCauDoiPhongQuery = `
        SELECT COUNT(*) AS YeuCauDoiPhongChoDuyet
        FROM YeuCauDoiPhong ycdp
        JOIN TrangThaiYeuCauDoiPhong tt_ycdp ON ycdp.TrangThaiYcDoiPID = tt_ycdp.TrangThaiYcDoiPID
        WHERE tt_ycdp.MaTrangThai = 'CHO_DUYET_DOI_PHONG';
    `;

  const [
    phongStatsResult,
    phongDangSuDungResult,
    thietBiStatsResult,
    yeuCauMuonPhongResult,
    yeuCauDoiPhongResult,
  ] = await Promise.all([
    executeQuery(phongStatsQuery, phongFilterParams),
    executeQuery(phongDangSuDungQuery, phongDangSuDungParams),
    executeQuery(thietBiStatsQuery, phongFilterParams),
    executeQuery(yeuCauMuonPhongQuery),
    executeQuery(yeuCauDoiPhongQuery),
  ]);

  return {
    phongStats: phongStatsResult.recordset[0],
    phongDangSuDung: phongDangSuDungResult.recordset[0].PhongDangSuDung,
    thietBiStats: thietBiStatsResult.recordset[0],
    yeuCauMuonPhongChoDuyet:
      yeuCauMuonPhongResult.recordset[0].YeuCauMuonPhongChoDuyet,
    yeuCauDoiPhongChoDuyet:
      yeuCauDoiPhongResult.recordset[0].YeuCauDoiPhongChoDuyet,
  };
};

/**
 * [MỚI] Lấy dữ liệu thống kê sử dụng phòng theo đơn vị thời gian.
 * @param {object} params - { tuNgay, denNgay, donViThoiGian, toaNhaID, loaiPhongID }
 * @returns {Promise<Array<object>>} Mảng dữ liệu thống kê.
 */
const getRoomUsageOverTime = async (params) => {
  const { tuNgay, denNgay, donViThoiGian, toaNhaID, loaiPhongID } = params;

  let timeFormat;
  let timeGroup;
  switch (donViThoiGian) {
    case 'TUAN':
      timeFormat = `CONCAT(YEAR(cdp.TgNhanPhongTT), '-W', FORMAT(DATEPART(iso_week, cdp.TgNhanPhongTT), '00'))`;
      timeGroup = `YEAR(cdp.TgNhanPhongTT), DATEPART(iso_week, cdp.TgNhanPhongTT)`;
      break;
    case 'THANG':
      timeFormat = `FORMAT(cdp.TgNhanPhongTT, 'yyyy-MM')`;
      timeGroup = `FORMAT(cdp.TgNhanPhongTT, 'yyyy-MM')`;
      break;
    case 'NGAY':
    default:
      timeFormat = `FORMAT(cdp.TgNhanPhongTT, 'yyyy-MM-dd')`;
      timeGroup = `FORMAT(cdp.TgNhanPhongTT, 'yyyy-MM-dd')`;
      break;
  }

  const fromClause = `
        FROM ChiTietDatPhong cdp
        JOIN Phong p ON cdp.PhongID = p.PhongID
        LEFT JOIN ToaNha_Tang tnt ON p.ToaNhaTangID = tnt.ToaNhaTangID
    `;
  let whereClause =
    ' WHERE cdp.TgNhanPhongTT >= @TuNgay AND cdp.TgNhanPhongTT < @DenNgayNextDay ';
  const queryParams = [
    { name: 'TuNgay', type: sql.Date, value: tuNgay },
    {
      name: 'DenNgayNextDay',
      type: sql.Date,
      value: new Date(
        new Date(denNgay).setDate(new Date(denNgay).getDate() + 1)
      ),
    },
  ];

  if (toaNhaID) {
    whereClause += ` AND tnt.ToaNhaID = @ToaNhaID `;
    queryParams.push({ name: 'ToaNhaID', type: sql.Int, value: toaNhaID });
  }
  if (loaiPhongID) {
    whereClause += ` AND p.LoaiPhongID = @LoaiPhongID `;
    queryParams.push({
      name: 'LoaiPhongID',
      type: sql.Int,
      value: loaiPhongID,
    });
  }

  const query = `
        SELECT
            ${timeFormat} AS ThoiGian,
            COUNT(cdp.DatPhongID) AS SoLuotDatPhong,
            SUM(CAST(DATEDIFF(minute, cdp.TgNhanPhongTT, cdp.TgTraPhongTT) AS FLOAT) / 60.0) AS TongGioSuDung
        ${fromClause}
        ${whereClause}
        GROUP BY ${timeGroup}
        ORDER BY ${timeGroup};
    `;

  const result = await executeQuery(query, queryParams);
  return result.recordset;
};

/**
 * [MỚI] Lấy dữ liệu thống kê các loại phòng được sử dụng nhiều nhất.
 * @param {object} params - { tuNgay, denNgay, limit }
 * @returns {Promise<Array<object>>} Mảng dữ liệu thống kê.
 */
const getPopularRoomTypes = async (params) => {
  const { tuNgay, denNgay, limit = 5 } = params;

  let whereClause = ' WHERE 1=1 ';
  const queryParams = [];

  if (tuNgay) {
    whereClause += ' AND cdp.TgNhanPhongTT >= @TuNgay ';
    queryParams.push({ name: 'TuNgay', type: sql.Date, value: tuNgay });
  }
  if (denNgay) {
    whereClause += ' AND cdp.TgNhanPhongTT <= @DenNgay ';
    queryParams.push({ name: 'DenNgay', type: sql.Date, value: denNgay });
  }

  const query = `
        SELECT TOP (@Limit)
            lp.LoaiPhongID,
            lp.TenLoaiPhong,
            COUNT(cdp.DatPhongID) AS SoLuotDat,
            SUM(CAST(DATEDIFF(minute, cdp.TgNhanPhongTT, cdp.TgTraPhongTT) AS FLOAT) / 60.0) AS TongGioSuDung
        FROM ChiTietDatPhong cdp
        JOIN Phong p ON cdp.PhongID = p.PhongID
        JOIN LoaiPhong lp ON p.LoaiPhongID = lp.LoaiPhongID
        ${whereClause}
        GROUP BY lp.LoaiPhongID, lp.TenLoaiPhong
        ORDER BY SoLuotDat DESC, TongGioSuDung DESC;
    `;
  queryParams.push({ name: 'Limit', type: sql.Int, value: limit });

  const result = await executeQuery(query, queryParams);
  return result.recordset;
};

/**
 * [MỚI] Lấy dữ liệu thống kê tình trạng thiết bị.
 * @param {object} params - { toaNhaID, loaiPhongID }
 * @returns {Promise<Array<object>>} Mảng kết quả thô, mỗi object chứa { TinhTrang, SoLuong }.
 */
const getEquipmentStatusStats = async (params) => {
  const { toaNhaID, loaiPhongID } = params;

  let whereClause = " WHERE ptb.TinhTrang IS NOT NULL AND ptb.TinhTrang != '' ";
  const queryParams = [];

  let fromClause = `
        FROM Phong_ThietBi ptb
    `;
  if (toaNhaID || loaiPhongID) {
    fromClause += `
            JOIN Phong p ON ptb.PhongID = p.PhongID
            LEFT JOIN ToaNha_Tang tnt ON p.ToaNhaTangID = tnt.ToaNhaTangID
        `;
    if (toaNhaID) {
      whereClause += ` AND tnt.ToaNhaID = @ToaNhaID `;
      queryParams.push({ name: 'ToaNhaID', type: sql.Int, value: toaNhaID });
    }
    if (loaiPhongID) {
      whereClause += ` AND p.LoaiPhongID = @LoaiPhongID `;
      queryParams.push({
        name: 'LoaiPhongID',
        type: sql.Int,
        value: loaiPhongID,
      });
    }
  }

  const query = `
        SELECT 
            ISNULL(ptb.TinhTrang, 'Không xác định') AS TinhTrang,
            SUM(ptb.SoLuong) AS SoLuong
        ${fromClause}
        ${whereClause}
        GROUP BY ISNULL(ptb.TinhTrang, 'Không xác định')
        ORDER BY SoLuong DESC;
    `;

  const result = await executeQuery(query, queryParams);
  return result.recordset;
};

export const thongKeRepository = {
  getKpiData,
  getStatsByEventType,
  getStatsOverTime,
  getUpcomingEventsForDashboard,
  getEventRatingStats,
  getFacilityKpiData,
  getRoomUsageOverTime,
  getPopularRoomTypes,
  getEquipmentStatusStats,
};
