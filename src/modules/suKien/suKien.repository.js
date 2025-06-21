// src/modules/suKien/suKien.repository.js
import sql from 'mssql';
import MaTrangThaiSK from '../../enums/maTrangThaiSK.enum.js';
import { executeQuery, getPool } from '../../utils/database.js';
import logger from '../../utils/logger.util.js';
import MaTrangThaiYeuCauPhong from '../../enums/maTrangThaiYeuCauPhong.enum.js';

const PUBLIC_VISIBLE_STATUS_CODES = [
  MaTrangThaiSK.DA_DUYET_BGH,
  MaTrangThaiSK.CHO_DUYET_PHONG,
  MaTrangThaiSK.DA_XAC_NHAN_PHONG,
  MaTrangThaiSK.HOAN_THANH,
];

/**
 * Lấy danh sách sự kiện có phân trang và bộ lọc.
 * @param {object} params - Tham số filter và pagination.
 * @returns {Promise<{ items: Array<object>, totalItems: number }>}
 */
const getSuKienListWithPagination = async (params) => {
  const {
    searchTerm,
    trangThaiSkMa,
    loaiSuKienMa,
    donViChuTriID,
    tuNgay,
    denNgay,
    isCongKhaiNoiBo,
    sapDienRa,
    nguoiTaoID,
    thamGiaDonViID,
    thamGiaNguoiDungID,
    page = 1,
    limit = 10,
    sortBy = 'sk.NgayTaoSK',
    sortOrder = 'DESC',
  } = params;

  let query = `
    FROM SuKien sk
    JOIN DonVi dv_chutri ON sk.DonViChuTriID = dv_chutri.DonViID
    JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
    JOIN NguoiDung nd_tao ON sk.NguoiTaoID = nd_tao.NguoiDungID
    LEFT JOIN LoaiSuKien lsk ON sk.LoaiSuKienID = lsk.LoaiSuKienID 
    LEFT JOIN (
        SELECT yc_main.SuKienID, COUNT(DISTINCT ctdp.PhongID) AS SoLuongPhongDaXep
        FROM YeuCauMuonPhong yc_main
        JOIN YcMuonPhongChiTiet yct ON yc_main.YcMuonPhongID = yct.YcMuonPhongID
        JOIN ChiTietDatPhong ctdp ON yct.YcMuonPhongCtID = ctdp.YcMuonPhongCtID
        GROUP BY yc_main.SuKienID
    ) phong_xep ON sk.SuKienID = phong_xep.SuKienID
    WHERE 1=1
      AND (lsk.IsActive = 1 OR lsk.LoaiSuKienID IS NULL) -- Chỉ lấy loại sự kiện active hoặc sự kiện không có loại
  `;

  const queryParams = [];

  if (searchTerm) {
    query += ` AND (sk.TenSK LIKE @SearchTerm OR sk.MoTaChiTiet LIKE @SearchTerm OR dv_chutri.TenDonVi LIKE @SearchTerm OR lsk.TenLoaiSK LIKE @SearchTerm)`; // Thêm tìm theo tên loại SK
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }
  if (trangThaiSkMa) {
    const arrTrangThai = trangThaiSkMa
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (arrTrangThai.length === 1) {
      query += ` AND ttsk.MaTrangThai = @TrangThaiSkMa`;
      queryParams.push({
        name: 'TrangThaiSkMa',
        type: sql.VarChar,
        value: arrTrangThai[0],
      });
    } else if (arrTrangThai.length > 1) {
      const inParams = arrTrangThai
        .map((v, idx) => `@TrangThaiSkMa${idx}`)
        .join(', ');
      query += ` AND ttsk.MaTrangThai IN (${inParams})`;
      arrTrangThai.forEach((v, idx) => {
        queryParams.push({
          name: `TrangThaiSkMa${idx}`,
          type: sql.VarChar,
          value: v,
        });
      });
    }
  }
  if (loaiSuKienMa) {
    query += ` AND lsk.MaLoaiSK = @LoaiSuKienMa`;
    queryParams.push({
      name: 'LoaiSuKienMa',
      type: sql.VarChar,
      value: loaiSuKienMa,
    });
  }
  if (donViChuTriID) {
    query += ` AND sk.DonViChuTriID = @DonViChuTriID`;
    queryParams.push({
      name: 'DonViChuTriID',
      type: sql.Int,
      value: donViChuTriID,
    });
  }
  if (tuNgay) {
    query += ` AND sk.TgBatDauDK >= @TuNgay`;
    queryParams.push({
      name: 'TuNgay',
      type: sql.DateTime,
      value: new Date(tuNgay),
    });
  }
  if (denNgay) {
    // Để bao gồm cả ngày kết thúc, có thể cần +1 ngày hoặc so sánh với phần cuối của ngày đó
    const denNgayEnd = new Date(denNgay);
    denNgayEnd.setHours(23, 59, 59, 999); // Kết thúc của ngày
    query += ` AND sk.TgBatDauDK <= @DenNgay`; // Hoặc sk.TgKetThucDK <= @DenNgay tùy nghiệp vụ
    queryParams.push({
      name: 'DenNgay',
      type: sql.DateTime,
      value: denNgayEnd,
    });
  }
  if (typeof isCongKhaiNoiBo === 'boolean') {
    query += ` AND sk.IsCongKhaiNoiBo = @IsCongKhaiNoiBo`;
    queryParams.push({
      name: 'IsCongKhaiNoiBo',
      type: sql.Bit,
      value: isCongKhaiNoiBo,
    });
  }
  if (typeof sapDienRa === 'boolean' && sapDienRa) {
    query += ` AND sk.TgBatDauDK > GETDATE() AND ttsk.MaTrangThai NOT IN (
        '${MaTrangThaiSK.DA_HUY}',
        '${MaTrangThaiSK.HOAN_THANH}',
        '${MaTrangThaiSK.BI_TU_CHOI_BGH}',
        '${MaTrangThaiSK.DA_HUY_BOI_NGUOI_TAO}'
        -- Thêm các trạng thái đã kết thúc/hủy khác nếu cần
    )`;
  }
  if (nguoiTaoID) {
    query += ` AND sk.NguoiTaoID = @NguoiTaoID`;
    queryParams.push({ name: 'NguoiTaoID', type: sql.Int, value: nguoiTaoID });
  }
  if (thamGiaDonViID) {
    query += ` AND EXISTS (SELECT 1 FROM SK_DonViThamGia skdv WHERE skdv.SuKienID = sk.SuKienID AND skdv.DonViID = @ThamGiaDonViID)`;
    queryParams.push({
      name: 'ThamGiaDonViID',
      type: sql.Int,
      value: thamGiaDonViID,
    });
  }
  if (thamGiaNguoiDungID) {
    query += ` AND EXISTS (SELECT 1 FROM SK_MoiThamGia skm WHERE skm.SuKienID = sk.SuKienID AND skm.NguoiDuocMoiID = @ThamGiaNguoiDungID AND skm.IsChapNhanMoi = 1)`; // Giả sử chỉ tính khi đã chấp nhận mời
    queryParams.push({
      name: 'ThamGiaNguoiDungID',
      type: sql.Int,
      value: thamGiaNguoiDungID,
    });
  }

  // Query để đếm tổng số items
  const countQuery = `SELECT COUNT(DISTINCT sk.SuKienID) AS TotalItems ${query}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = [
    'sk.TenSK',
    'sk.TgBatDauDK',
    'sk.NgayTaoSK',
    'dv_chutri.TenDonVi',
    'lsk.TenLoaiSK',
  ];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'sk.NgayTaoSK';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;
  // + (CASE WHEN p.ViTri IS NOT NULL THEN ' (' + p.ViTri + ')' ELSE '' END)
  const itemsQuery = `
    SELECT DISTINCT
        sk.SuKienID, sk.TenSK, sk.TgBatDauDK, sk.TgKetThucDK, sk.NgayTaoSK,
        (SELECT TOP 1 p.TenPhong
         FROM ChiTietDatPhong ctdp
         JOIN YcMuonPhongChiTiet yct_phong ON ctdp.YcMuonPhongCtID = yct_phong.YcMuonPhongCtID
         JOIN YeuCauMuonPhong yc_phong ON yct_phong.YcMuonPhongID = yc_phong.YcMuonPhongID
         JOIN Phong p ON ctdp.PhongID = p.PhongID
         WHERE yc_phong.SuKienID = sk.SuKienID ORDER BY ctdp.DatPhongID ASC
        ) AS DiaDiemToChucDaXep,
        dv_chutri.DonViID AS DvChuTri_DonViID, dv_chutri.TenDonVi AS DvChuTri_TenDonVi,
        dv_chutri.MaDonVi AS DvChuTri_MaDonVi, dv_chutri.LoaiDonVi AS DvChuTri_LoaiDonVi,
        ttsk.TrangThaiSkID AS TrangThaiSK_ID, ttsk.MaTrangThai AS TrangThaiSK_Ma, ttsk.TenTrangThai AS TrangThaiSK_Ten,
        lsk.LoaiSuKienID AS LoaiSK_ID, lsk.MaLoaiSK AS LoaiSK_Ma, lsk.TenLoaiSK AS LoaiSK_Ten, -- <<<<<< THÊM CỘT LOẠI SỰ KIỆN
        sk.IsCongKhaiNoiBo, sk.SlThamDuDK,
        CASE WHEN ISNULL(phong_xep.SoLuongPhongDaXep, 0) > 0 THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS DaCoPhong,
        nd_tao.NguoiDungID AS NguoiTao_ID, nd_tao.HoTen AS NguoiTao_HoTen, nd_tao.Email AS NguoiTao_Email
    ${query}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    OFFSET ${offset} ROWS
    FETCH NEXT ${limit} ROWS ONLY;
  `;

  const itemsResult = await executeQuery(itemsQuery, queryParams);

  const items = itemsResult.recordset.map((row) => ({
    suKienID: row.SuKienID,
    tenSK: row.TenSK,
    tgBatDauDK: row.TgBatDauDK.toISOString(),
    tgKetThucDK: row.TgKetThucDK.toISOString(),
    diaDiemToChucDaXep: row.DiaDiemToChucDaXep,
    donViChuTri: {
      donViID: row.DvChuTri_DonViID,
      tenDonVi: row.DvChuTri_TenDonVi,
      maDonVi: row.DvChuTri_MaDonVi,
      loaiDonVi: row.DvChuTri_LoaiDonVi,
    },
    trangThaiSK: {
      trangThaiSkID: row.TrangThaiSK_ID,
      maTrangThai: row.TrangThaiSK_Ma,
      tenTrangThai: row.TrangThaiSK_Ten,
    },
    loaiSuKien: row.LoaiSK_ID
      ? {
          loaiSuKienID: row.LoaiSK_ID,
          maLoaiSK: row.LoaiSK_Ma,
          tenLoaiSK: row.LoaiSK_Ten,
        }
      : null,
    isCongKhaiNoiBo: row.IsCongKhaiNoiBo,
    slThamDuDK: row.SlThamDuDK,
    daCoPhong: row.DaCoPhong,
    nguoiTao: {
      nguoiDungID: row.NguoiTao_ID,
      hoTen: row.NguoiTao_HoTen,
      email: row.NguoiTao_Email,
    },
  }));

  return { items, totalItems };
};

/**
 * Lấy thông tin chi tiết của một sự kiện bằng ID.
 * @param {number} suKienID - ID sự kiện.
 * @returns {Promise<object|null>} Chi tiết sự kiện hoặc null nếu không tìm thấy.
 */
const getSuKienDetailById = async (suKienID) => {
  // --- 1. Lấy thông tin cơ bản của sự kiện ---
  const suKienQuery = `
    SELECT
        sk.SuKienID, sk.TenSK, sk.TgBatDauDK, sk.TgKetThucDK, sk.MoTaChiTiet,
        sk.DonViChuTriID, dv_chutri.TenDonVi AS TenDVChuTri, dv_chutri.MaDonVi AS MaDVChuTri, dv_chutri.LoaiDonVi AS LoaiDVChuTri,
        lsk.LoaiSuKienID AS LoaiSK_ID, lsk.MaLoaiSK AS LoaiSK_Ma, lsk.TenLoaiSK AS LoaiSK_Ten,
        sk.NguoiChuTriID, nd_chutri.HoTen AS HoTenNguoiChuTri, nd_chutri.Email AS EmailNguoiChuTri,
        sk.TenChuTriNgoai, sk.DonViChuTriNgoai,
        sk.NguoiTaoID, nd_tao.HoTen AS HoTenNguoiTao, nd_tao.Email AS EmailNguoiTao,
        sk.NgayTaoSK,
        sk.IsCongKhaiNoiBo, sk.SlThamDuDK, sk.KhachMoiNgoaiGhiChu,
        ttsk.TrangThaiSkID, ttsk.MaTrangThai AS MaTrangThaiSK, ttsk.TenTrangThai AS TenTrangThaiSK,
        nd_duyetBGH.NguoiDungID AS NguoiDuyetBGH_ID, nd_duyetBGH.HoTen AS HoTenNguoiDuyetBGH, nd_duyetBGH.Email AS EmailNguoiDuyetBGH,
        sk.NgayDuyetBGH, sk.LyDoTuChoiBGH, sk.LyDoHuyNguoiTao
    FROM SuKien sk
    JOIN DonVi dv_chutri ON sk.DonViChuTriID = dv_chutri.DonViID
    JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
    JOIN NguoiDung nd_tao ON sk.NguoiTaoID = nd_tao.NguoiDungID
    LEFT JOIN LoaiSuKien lsk ON sk.LoaiSuKienID = lsk.LoaiSuKienID
    LEFT JOIN NguoiDung nd_chutri ON sk.NguoiChuTriID = nd_chutri.NguoiDungID
    LEFT JOIN NguoiDung nd_duyetBGH ON sk.NguoiDuyetBGHID = nd_duyetBGH.NguoiDungID
    WHERE sk.SuKienID = @SuKienID;
  `;
  const suKienParams = [{ name: 'SuKienID', type: sql.Int, value: suKienID }];
  const suKienResult = await executeQuery(suKienQuery, suKienParams);

  if (suKienResult.recordset.length === 0) {
    return null;
  }
  const suKienData = suKienResult.recordset[0];

  // --- 2. Lấy danh sách đơn vị tham gia ---
  const donViThamGiaQuery = `
    SELECT dv.DonViID, dv.TenDonVi, dv.MaDonVi, dv.LoaiDonVi
    FROM SK_DonViThamGia skdv
    JOIN DonVi dv ON skdv.DonViID = dv.DonViID
    WHERE skdv.SuKienID = @SuKienID;
  `;
  const donViThamGiaResult = await executeQuery(
    donViThamGiaQuery,
    suKienParams
  );
  const donViThamGiaData = donViThamGiaResult.recordset.map((dv) => ({
    donViID: dv.DonViID,
    tenDonVi: dv.TenDonVi,
    maDonVi: dv.MaDonVi,
    loaiDonVi: dv.LoaiDonVi,
  }));

  // --- 3. Lấy danh sách người được mời (nội bộ) ---
  const nguoiDuocMoiQuery = `
    SELECT nd.NguoiDungID, nd.HoTen, nd.Email, skm.IsChapNhanMoi --, skm.TgPhanHoiMoi
    FROM SK_MoiThamGia skm
    JOIN NguoiDung nd ON skm.NguoiDuocMoiID = nd.NguoiDungID
    WHERE skm.SuKienID = @SuKienID;
  `;
  const nguoiDuocMoiResult = await executeQuery(
    nguoiDuocMoiQuery,
    suKienParams
  );
  const nguoiDuocMoiData = nguoiDuocMoiResult.recordset.map((ndm) => ({
    nguoiDung: {
      nguoiDungID: ndm.NguoiDungID,
      hoTen: ndm.HoTen,
      email: ndm.Email,
    },
    isChapNhanMoi: ndm.IsChapNhanMoi,
  }));

  // --- 4. Lấy chi tiết phòng đã đặt ---
  const chiTietDatPhongQuery = `
        WITH CurrentBookings AS (
            SELECT 
                cdp.DatPhongID,
                yct.YcMuonPhongCtID,
                -- Ưu tiên phòng từ yêu cầu đổi đã được duyệt
                COALESCE(ycdp_approved.DatPhongID_Moi, cdp.DatPhongID) AS ActiveDatPhongID
            FROM YcMuonPhongChiTiet yct
            JOIN ChiTietDatPhong cdp ON yct.YcMuonPhongCtID = cdp.YcMuonPhongCtID
            LEFT JOIN (
                -- Tìm yêu cầu đổi phòng đã được duyệt gần nhất cho mỗi chi tiết
                SELECT 
                    ycdp_inner.YcMuonPhongCtID, -- Chỉ chọn các cột cần thiết
                    ycdp_inner.DatPhongID_Moi,
                    ROW_NUMBER() OVER(PARTITION BY ycdp_inner.YcMuonPhongCtID ORDER BY ycdp_inner.NgayDuyetDoiCSVC DESC) as rn -- Sửa tên cột
                FROM YeuCauDoiPhong ycdp_inner
                JOIN TrangThaiYeuCauDoiPhong tt ON ycdp_inner.TrangThaiYcDoiPID = tt.TrangThaiYcDoiPID
                WHERE tt.MaTrangThai = 'DA_DUYET_DOI_PHONG'
            ) ycdp_approved ON yct.YcMuonPhongCtID = ycdp_approved.YcMuonPhongCtID AND ycdp_approved.rn = 1
            JOIN YeuCauMuonPhong yc ON yct.YcMuonPhongID = yc.YcMuonPhongID
            WHERE yc.SuKienID = @SuKienID
        )
        SELECT 
            p.PhongID, p.TenPhong, p.MaPhong, 
            cdp_active.TgNhanPhongTT, cdp_active.TgTraPhongTT
        FROM CurrentBookings cb
        JOIN ChiTietDatPhong cdp_active ON cb.ActiveDatPhongID = cdp_active.DatPhongID
        JOIN Phong p ON cdp_active.PhongID = p.PhongID;
    `;

  const chiTietDatPhongResult = await executeQuery(
    chiTietDatPhongQuery,
    suKienParams
  );
  const chiTietDatPhongData = chiTietDatPhongResult.recordset.map((p) => ({
    phongID: p.PhongID,
    tenPhong: p.TenPhong,
    maPhong: p.MaPhong,
    tgNhanPhongTT: p.TgNhanPhongTT ? p.TgNhanPhongTT.toISOString() : null,
    tgTraPhongTT: p.TgTraPhongTT ? p.TgTraPhongTT.toISOString() : null,
  }));

  // --- 5. Lấy thông tin yêu cầu hủy gần nhất  ---
  const yeuCauHuyQuery = `
    SELECT TOP 1
        ych.YcHuySkID, ych.LyDoHuy, ttyc.MaTrangThai AS MaTrangThaiYcHuy, ttyc.TenTrangThai AS TenTrangThaiYcHuy,
        ych.NgayYeuCauHuy, nd_ych.NguoiDungID AS NguoiYeuCauHuy_ID, nd_ych.HoTen AS HoTenNguoiYeuCauHuy, nd_ych.Email AS EmailNguoiYeuCauHuy
    FROM YeuCauHuySK ych
    JOIN TrangThaiYeuCauHuySK ttyc ON ych.TrangThaiYcHuySkID = ttyc.TrangThaiYcHuySkID
    JOIN NguoiDung nd_ych ON ych.NguoiYeuCauID = nd_ych.NguoiDungID
    WHERE ych.SuKienID = @SuKienID
    ORDER BY ych.NgayYeuCauHuy DESC;
  `;
  const yeuCauHuyResult = await executeQuery(yeuCauHuyQuery, suKienParams);
  let yeuCauHuyData = null;
  if (yeuCauHuyResult.recordset.length > 0) {
    const ych = yeuCauHuyResult.recordset[0];
    yeuCauHuyData = {
      ycHuySkID: ych.YcHuySkID,
      lyDoHuy: ych.LyDoHuy,
      trangThaiYcHuySK: {
        maTrangThai: ych.MaTrangThaiYcHuy,
        tenTrangThai: ych.TenTrangThaiYcHuy,
      },
      ngayYeuCauHuy: ych.NgayYeuCauHuy.toISOString(),
      nguoiYeuCau: {
        nguoiDungID: ych.NguoiYeuCauHuy_ID,
        hoTen: ych.HoTenNguoiYeuCauHuy,
        email: ych.EmailNguoiYeuCauHuy,
      },
    };
  }

  // --- Tổng hợp kết quả ---
  return {
    suKienID: suKienData.SuKienID,
    tenSK: suKienData.TenSK,
    tgBatDauDK: suKienData.TgBatDauDK.toISOString(),
    tgKetThucDK: suKienData.TgKetThucDK.toISOString(),
    moTaChiTiet: suKienData.MoTaChiTiet,
    donViChuTri: {
      donViID: suKienData.DonViChuTriID,
      tenDonVi: suKienData.TenDVChuTri,
      maDonVi: suKienData.MaDVChuTri,
      loaiDonVi: suKienData.LoaiDVChuTri,
    },
    nguoiChuTri: suKienData.NguoiChuTriID
      ? {
          nguoiDungID: suKienData.NguoiChuTriID,
          hoTen: suKienData.HoTenNguoiChuTri,
          email: suKienData.EmailNguoiChuTri,
        }
      : null,
    tenChuTriNgoai: suKienData.TenChuTriNgoai,
    donViChuTriNgoai: suKienData.DonViChuTriNgoai,
    nguoiTao: {
      nguoiDungID: suKienData.NguoiTaoID,
      hoTen: suKienData.HoTenNguoiTao,
      email: suKienData.EmailNguoiTao,
    },
    ngayTaoSK: suKienData.NgayTaoSK.toISOString(),
    isCongKhaiNoiBo: suKienData.IsCongKhaiNoiBo,
    slThamDuDK: suKienData.SlThamDuDK,
    trangThaiSK: {
      trangThaiSkID: suKienData.TrangThaiSkID,
      maTrangThai: suKienData.MaTrangThaiSK,
      tenTrangThai: suKienData.TenTrangThaiSK,
    },
    diaDiemToChucDaXep:
      chiTietDatPhongData.length > 0
        ? chiTietDatPhongData
            .map((p) => p.tenPhong + (p.maPhong ? ` (${p.maPhong})` : ''))
            .join(', ')
        : null,
    daCoPhong: chiTietDatPhongData.length > 0,
    donViThamGia: donViThamGiaData,
    nguoiDuocMoi: nguoiDuocMoiData,
    khachMoiNgoaiGhiChu: suKienData.KhachMoiNgoaiGhiChu,
    nguoiDuyetBGH: suKienData.NguoiDuyetBGH_ID
      ? {
          nguoiDungID: suKienData.NguoiDuyetBGH_ID,
          hoTen: suKienData.HoTenNguoiDuyetBGH,
          email: suKienData.EmailNguoiDuyetBGH,
        }
      : null,
    ngayDuyetBGH: suKienData.NgayDuyetBGH
      ? suKienData.NgayDuyetBGH.toISOString()
      : null,
    loaiSuKien: suKienData.LoaiSK_ID
      ? {
          loaiSuKienID: suKienData.LoaiSK_ID,
          maLoaiSK: suKienData.LoaiSK_Ma,
          tenLoaiSK: suKienData.LoaiSK_Ten,
        }
      : null,
    lyDoTuChoiBGH: suKienData.LyDoTuChoiBGH,
    lyDoHuyNguoiTao: suKienData.LyDoHuyNguoiTao,
    chiTietDatPhong:
      chiTietDatPhongData.length > 0 ? chiTietDatPhongData : undefined,
    yeuCauHuy: yeuCauHuyData,
  };
};

/**
 * Tìm một sự kiện theo ID và trả về thông tin cơ bản và trạng thái hiện tại
 * @param {number} suKienID
 * @returns {Promise<object|null>}
 */
const findSuKienForStatusUpdate = async (suKienID) => {
  const query = `
    SELECT sk.SuKienID, sk.NguoiTaoID, ttsk.MaTrangThai AS MaTrangThaiHienTai
    FROM SuKien sk
    JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
    WHERE sk.SuKienID = @SuKienID;
  `;
  const params = [{ name: 'SuKienID', type: sql.Int, value: suKienID }];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Cập nhật TrangThaiSkID và LyDoHuyNguoiTao cho một SuKien
 * @param {number} suKienID
 * @param {number} trangThaiSkIDMoi
 * @param {string|null} lyDoHuyNguoiTao (nếu là hủy bởi người tạo)
 * @returns {Promise<void>}
 */
const updateSuKienTrangThaiVaLyDo = async (
  suKienID,
  trangThaiSkIDMoi,
  lyDoHuyNguoiTao = null
) => {
  let query = `
    UPDATE SuKien
    SET TrangThaiSkID = @TrangThaiSkIDMoi
  `;
  const params = [
    { name: 'TrangThaiSkIDMoi', type: sql.Int, value: trangThaiSkIDMoi },
    { name: 'SuKienID', type: sql.Int, value: suKienID },
  ];

  if (lyDoHuyNguoiTao !== null) {
    query += `, LyDoHuyNguoiTao = @LyDoHuyNguoiTao`;
    params.push({
      name: 'LyDoHuyNguoiTao',
      type: sql.NVarChar,
      value: lyDoHuyNguoiTao,
    });
  }
  // Thêm các trường khác cần cập nhật
  // query += `, NgayCapNhat = GETDATE()`;

  query += ` WHERE SuKienID = @SuKienID;`;

  await executeQuery(query, params);
};

/**
 * Lấy ID của một trạng thái từ mã trạng thái, tên bảng, tên cột ID, tên cột Mã.
 * @param {string} maTrangThai Mã trạng thái cần tìm
 * @param {string} tenBangTrangThai Tên bảng trạng thái (VD: 'TrangThaiSK', 'TrangThaiYeuCauPhong')
 * @param {string} tenCotID Tên cột ID trong bảng trạng thái (VD: 'TrangThaiSkID', 'TrangThaiYcpID')
 * @param {string} tenCotMa Tên cột chứa mã trạng thái (VD: 'MaTrangThai')
 * @param {sql.Transaction} [transaction=null] Transaction đang hoạt động (nếu có)
 * @returns {Promise<number|null>} ID của trạng thái hoặc null nếu không tìm thấy
 */
const getTrangThaiIDByMaGeneric = async (
  maTrangThai,
  tenBangTrangThai,
  tenCotID,
  tenCotMa,
  transaction = null
) => {
  const query = `SELECT ${tenCotID} FROM ${tenBangTrangThai} WHERE ${tenCotMa} = @MaTrangThai;`;
  const params = [
    { name: 'MaTrangThai', type: sql.VarChar, value: maTrangThai },
  ];
  let request;
  try {
    if (transaction && typeof transaction.request === 'function') {
      if (transaction.finished || transaction._aborted) {
        throw new Error('Transaction is not active.');
      }
      request = transaction.request();
    } else {
      const pool = await getPool();
      request = pool.request();
    }
    if (request.timeout) request.timeout = 10000;
    params.forEach((param) =>
      request.input(param.name, param.type, param.value)
    );
    const result = await request.query(query);
    if (result.recordset.length > 0) {
      return result.recordset[0][tenCotID];
    }
    throw new Error(
      `Lỗi cấu hình: Không tìm thấy mã trạng thái '${maTrangThai}' trong bảng '${tenBangTrangThai}'.`
    );
  } catch (error) {
    logger.error(
      `Error in getTrangThaiIDByMaGeneric for ${tenBangTrangThai} with MaTrangThai ${maTrangThai}:`,
      error
    );
    throw error;
  }
};

const getTrangThaiSkIDByMa = async (maTrangThai, transaction = null) => {
  return getTrangThaiIDByMaGeneric(
    maTrangThai,
    'TrangThaiSK',
    'TrangThaiSkID',
    'MaTrangThai',
    transaction
  );
};

/**
 * Lấy danh sách sự kiện CÔNG KHAI có phân trang và bộ lọc
 * @param {object} params - GetPublicSuKienParams
 * @returns {Promise<{ items: Array<object>, totalItems: number }>}
 */
const getPublicSuKienListWithPagination = async (params) => {
  const {
    searchTerm,
    loaiSuKienMa,
    tuNgay,
    denNgay,
    sapDienRa,
    page = 1,
    limit = 9,
    sortBy = 'sk.TgBatDauDK',
    sortOrder = 'ASC',
  } = params;

  const statusCodesInClause = PUBLIC_VISIBLE_STATUS_CODES.map(
    (code) => `'${code.replace(/'/g, "''")}'`
  ).join(',');

  let query = `
    FROM SuKien sk
    JOIN DonVi dv_chutri ON sk.DonViChuTriID = dv_chutri.DonViID
    JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
    JOIN NguoiDung nd_tao ON sk.NguoiTaoID = nd_tao.NguoiDungID
    LEFT JOIN LoaiSuKien lsk ON sk.LoaiSuKienID = lsk.LoaiSuKienID 
    LEFT JOIN (
        SELECT yc_main.SuKienID, COUNT(DISTINCT ctdp.PhongID) AS SoLuongPhongDaXep
        FROM YeuCauMuonPhong yc_main
        JOIN YcMuonPhongChiTiet yct ON yc_main.YcMuonPhongID = yct.YcMuonPhongID
        JOIN ChiTietDatPhong ctdp ON yct.YcMuonPhongCtID = ctdp.YcMuonPhongCtID
        GROUP BY yc_main.SuKienID
    ) phong_xep ON sk.SuKienID = phong_xep.SuKienID
    WHERE sk.IsCongKhaiNoiBo = 1
      AND ttsk.MaTrangThai IN (${statusCodesInClause})
      AND (lsk.IsActive = 1 OR lsk.LoaiSuKienID IS NULL)
  `;
  const queryParams = [];

  if (searchTerm) {
    query += ` AND (sk.TenSK LIKE @SearchTerm OR dv_chutri.TenDonVi LIKE @SearchTerm OR lsk.TenLoaiSK LIKE @SearchTerm)`;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }
  if (loaiSuKienMa) {
    query += ` AND lsk.MaLoaiSK = @LoaiSuKienMa`;
    queryParams.push({
      name: 'LoaiSuKienMa',
      type: sql.VarChar,
      value: loaiSuKienMa,
    });
  }
  if (tuNgay) {
    query += ` AND sk.TgBatDauDK >= @TuNgay`;
    queryParams.push({ name: 'TuNgay', type: sql.Date, value: tuNgay }); // Dùng Date nếu chỉ có ngày
  }
  if (denNgay) {
    const denNgayEnd = new Date(denNgay);
    denNgayEnd.setDate(denNgayEnd.getDate() + 1); // Để bao gồm cả ngày kết thúc
    query += ` AND sk.TgBatDauDK < @DenNgay`;
    queryParams.push({
      name: 'DenNgay',
      type: sql.Date,
      value: denNgayEnd.toISOString().split('T')[0],
    });
  }

  if (typeof sapDienRa === 'boolean') {
    if (sapDienRa) {
      query += ` AND sk.TgBatDauDK >= GETDATE() AND ttsk.MaTrangThai <> @MaTrangThaiHoanThanh`;
      queryParams.push({
        name: 'MaTrangThaiHoanThanh',
        type: sql.VarChar,
        value: MaTrangThaiSK.HOAN_THANH,
      });
    } else {
      // Lấy cả sắp diễn ra và đã hoàn thành gần đây (ví dụ trong 30 ngày)
      query += ` AND (sk.TgBatDauDK >= GETDATE() OR (ttsk.MaTrangThai = @MaTrangThaiHoanThanh AND sk.TgKetThucDK >= DATEADD(day, -30, GETDATE())))`;
      queryParams.push({
        name: 'MaTrangThaiHoanThanh',
        type: sql.VarChar,
        value: MaTrangThaiSK.HOAN_THANH,
      });
      // Hoặc đơn giản là không thêm điều kiện thời gian nếu false/undefined, lấy tất cả (đã lọc theo trạng thái)
    }
  }

  const countQuery = `SELECT COUNT(DISTINCT sk.SuKienID) AS TotalItems ${query}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortByPublic = [
    'sk.TenSK',
    'sk.TgBatDauDK',
    'dv_chutri.TenDonVi',
    'lsk.TenLoaiSK',
  ];
  const safeSortBy = allowedSortByPublic.includes(sortBy)
    ? sortBy
    : 'sk.TgBatDauDK';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;
  // + (CASE WHEN p.ViTri IS NOT NULL THEN ' (' + p.ViTri + ')' ELSE '' END)
  const itemsQuery = `
    SELECT DISTINCT
        sk.SuKienID, sk.TenSK, sk.TgBatDauDK, sk.TgKetThucDK,
        (SELECT TOP 1 p.TenPhong
         FROM ChiTietDatPhong ctdp
         JOIN YcMuonPhongChiTiet yct_phong ON ctdp.YcMuonPhongCtID = yct_phong.YcMuonPhongCtID
         JOIN YeuCauMuonPhong yc_phong ON yct_phong.YcMuonPhongID = yc_phong.YcMuonPhongID
         JOIN Phong p ON ctdp.PhongID = p.PhongID
         WHERE yc_phong.SuKienID = sk.SuKienID ORDER BY ctdp.DatPhongID ASC
        ) AS DiaDiemToChucDaXep,
        dv_chutri.DonViID AS DvChuTri_DonViID, dv_chutri.TenDonVi AS DvChuTri_TenDonVi,
        dv_chutri.MaDonVi AS DvChuTri_MaDonVi, dv_chutri.LoaiDonVi AS DvChuTri_LoaiDonVi,
        ttsk.TrangThaiSkID AS TrangThaiSK_ID, ttsk.MaTrangThai AS TrangThaiSK_Ma, ttsk.TenTrangThai AS TrangThaiSK_Ten,
        lsk.LoaiSuKienID AS LoaiSK_ID, lsk.MaLoaiSK AS LoaiSK_Ma, lsk.TenLoaiSK AS LoaiSK_Ten,
        sk.IsCongKhaiNoiBo, sk.SlThamDuDK,
        CASE WHEN ISNULL(phong_xep.SoLuongPhongDaXep, 0) > 0 THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS DaCoPhong,
        nd_tao.NguoiDungID AS NguoiTao_ID, nd_tao.HoTen AS NguoiTao_HoTen, nd_tao.Email AS NguoiTao_Email
    ${query}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    OFFSET ${offset} ROWS
    FETCH NEXT ${limit} ROWS ONLY;
  `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);

  const items = itemsResult.recordset.map((row) => ({
    suKienID: row.SuKienID,
    tenSK: row.TenSK,
    tgBatDauDK: row.TgBatDauDK.toISOString(),
    tgKetThucDK: row.TgKetThucDK.toISOString(),
    diaDiemToChucDaXep: row.DiaDiemToChucDaXep,
    donViChuTri: {
      donViID: row.DvChuTri_DonViID,
      tenDonVi: row.DvChuTri_TenDonVi,
      maDonVi: row.DvChuTri_MaDonVi,
      loaiDonVi: row.DvChuTri_LoaiDonVi,
    },
    trangThaiSK: {
      trangThaiSkID: row.TrangThaiSK_ID,
      maTrangThai: row.TrangThaiSK_Ma,
      tenTrangThai: row.TrangThaiSK_Ten,
    },
    loaiSuKien: row.LoaiSK_ID
      ? {
          // <<<<<< THÊM
          loaiSuKienID: row.LoaiSK_ID,
          maLoaiSK: row.LoaiSK_Ma,
          tenLoaiSK: row.LoaiSK_Ten,
        }
      : null,
    isCongKhaiNoiBo: row.IsCongKhaiNoiBo,
    slThamDuDK: row.SlThamDuDK,
    daCoPhong: row.DaCoPhong,
    nguoiTao: {
      nguoiDungID: row.NguoiTao_ID,
      hoTen: row.NguoiTao_HoTen,
      email: row.NguoiTao_Email,
    },
  }));

  return { items, totalItems };
};

/**
 * Lấy chi tiết sự kiện CÔNG KHAI bằng ID
 * @param {number} suKienID
 * @returns {Promise<object|null>}
 */
const getPublicSuKienDetailById = async (suKienID) => {
  const suKienDetail = await getSuKienDetailById(suKienID);

  if (suKienDetail) {
    if (
      suKienDetail.isCongKhaiNoiBo !== true ||
      !PUBLIC_VISIBLE_STATUS_CODES.includes(
        suKienDetail.trangThaiSK.maTrangThai
      )
    ) {
      return null;
    }
  }
  return suKienDetail;
};

const createSuKien = async (suKienData, transaction = null) => {
  const query = `
    INSERT INTO SuKien (
        TenSK, TgBatDauDK, TgKetThucDK, MoTaChiTiet, DonViChuTriID, LoaiSuKienID,
        NguoiChuTriID, TenChuTriNgoai, DonViChuTriNgoai, SlThamDuDK, IsCongKhaiNoiBo,
        KhachMoiNgoaiGhiChu, TrangThaiSkID, NguoiTaoID, NgayTaoSK,
        TgBatDauThucTe, TgKetThucThucTe
        -- Bỏ các trường không có trong payload hoặc có default: NguoiDuyetBGHID, NgayDuyetBGH, LyDoTuChoiBGH, LyDoHuyNguoiTao
    )
    OUTPUT inserted.SuKienID, inserted.TenSK, inserted.NgayTaoSK -- Trả về các cột cần thiết
    VALUES (
        @TenSK, @TgBatDauDK, @TgKetThucDK, @MoTaChiTiet, @DonViChuTriID, @LoaiSuKienID,
        @NguoiChuTriID, @TenChuTriNgoai, @DonViChuTriNgoai, @SlThamDuDK, @IsCongKhaiNoiBo,
        @KhachMoiNgoaiGhiChu, @TrangThaiSkID, @NguoiTaoID, GETDATE(),
        @TgBatDauThucTe, @TgKetThucThucTe
    );
  `;
  const params = [
    { name: 'TenSK', type: sql.NVarChar(300), value: suKienData.tenSK },
    {
      name: 'TgBatDauDK',
      type: sql.DateTime,
      value: new Date(suKienData.tgBatDauDK),
    },
    {
      name: 'TgKetThucDK',
      type: sql.DateTime,
      value: new Date(suKienData.tgKetThucDK),
    },
    {
      name: 'MoTaChiTiet',
      type: sql.NVarChar(sql.MAX),
      value: suKienData.moTaChiTiet,
    },
    { name: 'DonViChuTriID', type: sql.Int, value: suKienData.donViChuTriID },
    { name: 'LoaiSuKienID', type: sql.Int, value: suKienData.loaiSuKienID }, // Đã thêm
    { name: 'NguoiChuTriID', type: sql.Int, value: suKienData.nguoiChuTriID },
    {
      name: 'TenChuTriNgoai',
      type: sql.NVarChar(150),
      value: suKienData.tenChuTriNgoai,
    },
    {
      name: 'DonViChuTriNgoai',
      type: sql.NVarChar(200),
      value: suKienData.donViChuTriNgoai,
    },
    { name: 'SlThamDuDK', type: sql.Int, value: suKienData.slThamDuDK },
    {
      name: 'IsCongKhaiNoiBo',
      type: sql.Bit,
      value: suKienData.isCongKhaiNoiBo,
    },
    {
      name: 'KhachMoiNgoaiGhiChu',
      type: sql.NVarChar(sql.MAX),
      value: suKienData.khachMoiNgoaiGhiChu,
    },
    { name: 'TrangThaiSkID', type: sql.Int, value: suKienData.trangThaiSkID },
    { name: 'NguoiTaoID', type: sql.Int, value: suKienData.nguoiTaoID },
    {
      name: 'TgBatDauThucTe',
      type: sql.DateTime,
      value: suKienData.tgBatDauThucTe,
    },
    {
      name: 'TgKetThucThucTe',
      type: sql.DateTime,
      value: suKienData.tgKetThucThucTe,
    },
  ];

  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));

  const result = await request.query(query);
  return result.recordset[0];
};

/**
 * Thêm các đơn vị tham gia vào một sự kiện.
 * Sử dụng vòng lặp để INSERT từng bản ghi.
 * @param {number} suKienID
 * @param {number[]} donViIDs Mảng các DonViID
 * @param {sql.Transaction} [transaction=null] Transaction đang hoạt động (nếu có)
 * @returns {Promise<void>}
 */
const addDonViThamGiaToSuKien = async (
  suKienID,
  donViIDs,
  transaction = null
) => {
  if (!donViIDs || donViIDs.length === 0) {
    return;
  }

  // Sử dụng Cách 1: Vòng lặp và nhiều lệnh INSERT
  for (const donViID of donViIDs) {
    const query = `
        IF NOT EXISTS (SELECT 1 FROM SK_DonViThamGia WHERE SuKienID = @SuKienID AND DonViID = @DonViID)
        BEGIN
            INSERT INTO SK_DonViThamGia (SuKienID, DonViID)
            VALUES (@SuKienID, @DonViID);
        END
    `;

    // const query = `INSERT INTO SK_DonViThamGia (SuKienID, DonViID) VALUES (@SuKienID, @DonViID);`;

    const params = [
      { name: 'SuKienID', type: sql.Int, value: suKienID },
      { name: 'DonViID', type: sql.Int, value: donViID },
    ];

    const request = transaction
      ? transaction.request()
      : (await getPool()).request();
    params.forEach((param) =>
      request.input(param.name, param.type, param.value)
    );

    try {
      await request.query(query);
    } catch (error) {
      console.error(
        `Error inserting DonViID ${donViID} for SuKienID ${suKienID}:`,
        error
      );
      throw error;
    }
  }
};

const updateSuKienById = async (suKienID, updateData, transaction = null) => {
  const setClauses = [];
  const params = [{ name: 'SuKienID', type: sql.Int, value: suKienID }];

  const addUpdateParam = (fieldName, sqlParamName, sqlParamType, value) => {
    if (value !== undefined) {
      setClauses.push(`${fieldName} = @${sqlParamName}`);
      params.push({ name: sqlParamName, type: sqlParamType, value });
    }
  };

  addUpdateParam('TenSK', 'TenSK', sql.NVarChar(300), updateData.tenSK);
  addUpdateParam(
    'MoTaChiTiet',
    'MoTaChiTiet',
    sql.NVarChar(sql.MAX),
    updateData.moTaChiTiet
  );
  addUpdateParam(
    'TgBatDauDK',
    'TgBatDauDK',
    sql.DateTime,
    updateData.tgBatDauDK ? new Date(updateData.tgBatDauDK) : undefined
  );
  addUpdateParam(
    'TgKetThucDK',
    'TgKetThucDK',
    sql.DateTime,
    updateData.tgKetThucDK ? new Date(updateData.tgKetThucDK) : undefined
  );
  addUpdateParam('SlThamDuDK', 'SlThamDuDK', sql.Int, updateData.slThamDuDK);
  // addUpdateParam('DonViChuTriID', 'DonViChuTriID', sql.Int, updateData.donViChuTriID); // Cân nhắc không cho sửa
  addUpdateParam(
    'NguoiChuTriID',
    'NguoiChuTriID',
    sql.Int,
    updateData.nguoiChuTriID
  );
  addUpdateParam(
    'TenChuTriNgoai',
    'TenChuTriNgoai',
    sql.NVarChar(150),
    updateData.tenChuTriNgoai
  );
  addUpdateParam(
    'DonViChuTriNgoai',
    'DonViChuTriNgoai',
    sql.NVarChar(200),
    updateData.donViChuTriNgoai
  );
  addUpdateParam(
    'KhachMoiNgoaiGhiChu',
    'KhachMoiNgoaiGhiChu',
    sql.NVarChar(sql.MAX),
    updateData.khachMoiNgoaiGhiChu
  );
  addUpdateParam(
    'IsCongKhaiNoiBo',
    'IsCongKhaiNoiBo',
    sql.Bit,
    updateData.isCongKhaiNoiBo
  );
  addUpdateParam(
    'LoaiSuKienID',
    'LoaiSuKienID',
    sql.Int,
    updateData.loaiSuKienID
  );

  if (setClauses.length === 0 && !updateData.cacDonViThamGiaIDs) {
    return { SuKienID: suKienID };
  }
  if (setClauses.length > 0) {
    const query = `UPDATE SuKien SET ${setClauses.join(', ')} WHERE SuKienID = @SuKienID;`;
    const request = transaction
      ? transaction.request()
      : (await getPool()).request();
    params.forEach((param) =>
      request.input(param.name, param.type, param.value)
    );
    await request.query(query);
  }
  return { SuKienID: suKienID };
};

const clearDonViThamGiaFromSuKien = async (suKienID, transaction = null) => {
  const query = `DELETE FROM SK_DonViThamGia WHERE SuKienID = @SuKienID;`;
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  request.input('SuKienID', sql.Int, suKienID);
  await request.query(query);
};

const updateSuKienTrangThai = async (
  suKienID,
  trangThaiSkIDMoi,
  transaction = null
) => {
  console.log(
    `Updating SuKienID ${suKienID} to TrangThaiSkID ${trangThaiSkIDMoi}`
  );
  const query = `UPDATE SuKien SET TrangThaiSkID = @TrangThaiSkIDMoi WHERE SuKienID = @SuKienID;`;
  const params = [
    { name: 'TrangThaiSkIDMoi', type: sql.Int, value: trangThaiSkIDMoi },
    { name: 'SuKienID', type: sql.Int, value: suKienID },
  ];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  await request.query(query);
};

/**
 * Cập nhật sự kiện khi BGH duyệt hoặc từ chối
 * @param {number} suKienID
 * @param {number} nguoiDuyetBGHID
 * @param {Date} ngayDuyetBGH
 * @param {number} trangThaiSkIDMoi
 * @param {string | null} [ghiChuBGH=null] - Ghi chú khi duyệt (nếu có)
 * @param {string | null} [lyDoTuChoiBGH=null] - Lý do khi từ chối (nếu có)
 * @returns {Promise<object|null>} Bản ghi SuKien đã được cập nhật (hoặc chỉ các trường cần thiết)
 */
const updateSuKienByBGHAction = async (
  suKienID,
  nguoiDuyetBGHID,
  ngayDuyetBGH,
  trangThaiSkIDMoi,
  ghiChuBGH = null, // Thêm cột này vào bảng SuKien nếu bạn muốn lưu ghi chú riêng của BGH khi duyệt
  lyDoTuChoiBGH = null
) => {
  let setClauses = `
    TrangThaiSkID = @TrangThaiSkIDMoi,
    NguoiDuyetBGHID = @NguoiDuyetBGHID,
    NgayDuyetBGH = @NgayDuyetBGH
  `;
  const params = [
    { name: 'SuKienID', type: sql.Int, value: suKienID },
    { name: 'NguoiDuyetBGHID', type: sql.Int, value: nguoiDuyetBGHID },
    { name: 'NgayDuyetBGH', type: sql.DateTime, value: ngayDuyetBGH },
    { name: 'TrangThaiSkIDMoi', type: sql.Int, value: trangThaiSkIDMoi },
  ];

  if (ghiChuBGH !== null) {
    console.warn(
      'Cột GhiChuBGH chưa được thêm vào bảng SuKien, ghi chú này sẽ không được lưu vào DB trực tiếp từ hàm này.'
    );
  }

  if (lyDoTuChoiBGH !== null) {
    setClauses += `, LyDoTuChoiBGH = @LyDoTuChoiBGH`;
    params.push({
      name: 'LyDoTuChoiBGH',
      type: sql.NVarChar(sql.MAX),
      value: lyDoTuChoiBGH,
    });
  } else {
    setClauses += `, LyDoTuChoiBGH = NULL`;
  }

  const query = `
    UPDATE SuKien
    SET ${setClauses}
    OUTPUT inserted.SuKienID -- Chỉ cần ID để gọi getSuKienDetailById sau
    WHERE SuKienID = @SuKienID;
  `;

  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Lấy danh sách sự kiện đã được BGH duyệt và chưa có YC phòng hoặc YC phòng đã hủy
 * @param {object} params - { nguoiTaoID, donViChuTriID, searchTerm, page, limit }
 * @returns {Promise<{ items: Array<object>, totalItems: number }>}
 */

/**
 * Lấy danh sách sự kiện để chọn khi tạo yêu cầu phòng
 * @param {object} params - { nguoiTaoID, donViChuTriID, searchTerm, page, limit, coTheTaoYeuCauPhongMoi }
 * @returns {Promise<{ items: Array<object>, totalItems: number }>}
 */
const getSuKienForYeuCauPhongSelect = async (params) => {
  const {
    nguoiTaoID,
    donViChuTriID,
    searchTerm,
    page = 1,
    limit = 20,
    coTheTaoYeuCauPhongMoi = true,
    sortBy = 'sk.TgBatDauDK',
    sortOrder = 'ASC',
  } = params;

  let baseQuery = `
        FROM SuKien sk
        JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
        JOIN DonVi dv_chutri ON sk.DonViChuTriID = dv_chutri.DonViID
        WHERE 1=1
    `;
  const queryParams = [];

  if (coTheTaoYeuCauPhongMoi) {
    baseQuery += ` AND ttsk.MaTrangThai = @MaTrangThaiDaDuyetBGH `;
    queryParams.push({
      name: 'MaTrangThaiDaDuyetBGH',
      type: sql.VarChar,
      value: MaTrangThaiSK.DA_DUYET_BGH,
    });

    baseQuery += `
            AND NOT EXISTS (
                SELECT 1
                FROM YeuCauMuonPhong yc_check
                JOIN TrangThaiYeuCauPhong tt_yc_check ON yc_check.TrangThaiChungID = tt_yc_check.TrangThaiYcpID
                WHERE yc_check.SuKienID = sk.SuKienID
                  AND tt_yc_check.MaTrangThai NOT IN (
                        '${MaTrangThaiYeuCauPhong.YCCP_DA_HUY_BOI_NGUOI_TAO}',
                        '${MaTrangThaiYeuCauPhong.YCCP_TU_CHOI_TOAN_BO}'

                  )
            )
        `;
  } else {
    baseQuery += ` AND ttsk.MaTrangThai = @MaTrangThaiDaDuyetBGH_All `;
    queryParams.push({
      name: 'MaTrangThaiDaDuyetBGH_All',
      type: sql.VarChar,
      value: MaTrangThaiSK.DA_DUYET_BGH,
    });
  }

  if (nguoiTaoID) {
    baseQuery += ` AND sk.NguoiTaoID = @NguoiTaoID`;
    queryParams.push({ name: 'NguoiTaoID', type: sql.Int, value: nguoiTaoID });
  }
  if (donViChuTriID) {
    baseQuery += ` AND sk.DonViChuTriID = @DonViChuTriID`;
    queryParams.push({
      name: 'DonViChuTriID',
      type: sql.Int,
      value: donViChuTriID,
    });
  }
  if (searchTerm) {
    baseQuery += ` AND sk.TenSK LIKE @SearchTerm`;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }

  const countQuery = `SELECT COUNT(DISTINCT sk.SuKienID) AS TotalItems ${baseQuery}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortByForSelect = [
    'sk.TenSK',
    'sk.TgBatDauDK',
    'dv_chutri.TenDonVi',
  ];
  const safeSortBy = allowedSortByForSelect.includes(sortBy)
    ? sortBy
    : 'sk.TgBatDauDK';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const offset = (page - 1) * limit;
  const itemsQuery = `
        SELECT
            sk.SuKienID,
            sk.TenSK,
            sk.TgBatDauDK,
            sk.TgKetThucDK,
            dv_chutri.TenDonVi AS TenDonViChuTri
        ${baseQuery}
        ORDER BY ${safeSortBy} ${safeSortOrder} -- <<<< SỬ DỤNG sortBy VÀ sortOrder
        OFFSET ${offset} ROWS
        FETCH NEXT ${limit} ROWS ONLY;
    `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);
  const items = itemsResult.recordset.map((row) => ({
    suKienID: row.SuKienID,
    tenSK: row.TenSK,
    tgBatDauDK: row.TgBatDauDK.toISOString(),
    tgKetThucDK: row.TgKetThucDK.toISOString(),
    donViChuTri: {
      tenDonVi: row.TenDonViChuTri,
    },
  }));

  return { items, totalItems };
};

/**
 * Tìm các sự kiện đang chờ BGH duyệt quá X ngày
 * @param {number} soNgayQuaHan Số ngày được coi là quá hạn
 * @returns {Promise<Array<object>>} Danh sách sự kiện { SuKienID, TenSK, NguoiTaoID, EmailNguoiTao }
 */
const findSuKienChoBGHQuaHan = async (soNgayQuaHan) => {
  const query = `
    SELECT sk.SuKienID, sk.TenSK, sk.NguoiTaoID, nd.Email AS EmailNguoiTao
    FROM SuKien sk
    JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
    JOIN NguoiDung nd ON sk.NguoiTaoID = nd.NguoiDungID
    WHERE ttsk.MaTrangThai = @MaChoDuyetBGH
      AND sk.NgayTaoSK < DATEADD(day, -@SoNgayQuaHan, GETDATE());
  `;
  const params = [
    {
      name: 'MaChoDuyetBGH',
      type: sql.VarChar,
      value: MaTrangThaiSK.CHO_DUYET_BGH,
    },
    { name: 'SoNgayQuaHan', type: sql.Int, value: soNgayQuaHan },
  ];
  const result = await executeQuery(query, params);
  return result.recordset;
};

/**
 * Tìm các sự kiện sắp diễn ra nhưng vẫn đang chờ BGH duyệt để tự động hủy
 * @returns {Promise<Array<object>>} Danh sách sự kiện { SuKienID, TenSK, NguoiTaoID, EmailNguoiTao }
 */
const findSuKienSapDienRaChoBGHDeHuy = async () => {
  const query = `
    SELECT sk.SuKienID, sk.TenSK, sk.NguoiTaoID, nd.Email AS EmailNguoiTao
    FROM SuKien sk
    JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
    JOIN NguoiDung nd ON sk.NguoiTaoID = nd.NguoiDungID
    WHERE ttsk.MaTrangThai = @MaChoDuyetBGH
      AND sk.TgBatDauDK <= GETDATE(); -- Thời gian bắt đầu dự kiến đã đến hoặc đã qua
  `;
  const params = [
    {
      name: 'MaChoDuyetBGH',
      type: sql.VarChar,
      value: MaTrangThaiSK.CHO_DUYET_BGH,
    },
  ];
  const result = await executeQuery(query, params);
  return result.recordset;
};

/**
 * Cập nhật trạng thái cho nhiều sự kiện (dùng cho tự động hủy)
 * @param {Array<number>} suKienIDs Mảng các SuKienID
 * @param {number} trangThaiSkIDMoi ID của trạng thái mới
 * @param {sql.Transaction} [transaction=null]
 * @returns {Promise<void>}
 */
const updateTrangThaiNhieuSuKien = async (
  suKienIDs,
  trangThaiSkIDMoi,
  transaction = null
) => {
  if (!suKienIDs || suKienIDs.length === 0) return;

  for (const suKienID of suKienIDs) {
    const query = `
      UPDATE SuKien
      SET TrangThaiSkID = @TrangThaiSkIDMoi
      WHERE SuKienID = @SuKienID;
    `;
    const request = transaction
      ? transaction.request()
      : (await getPool()).request();
    request.input('TrangThaiSkIDMoi', sql.Int, trangThaiSkIDMoi);
    request.input('SuKienID', sql.Int, suKienID);
    await request.query(query);
  }
};

/**
 * Tìm các sự kiện đã kết thúc nhưng chưa được cập nhật trạng thái Hoàn thành.
 * @returns {Promise<Array<number>>} Mảng các SuKienID
 */
const findFinishedEventsToUpdateStatus = async () => {
  const query = `
    SELECT sk.SuKienID
    FROM SuKien sk
    JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
    WHERE 
      -- Đã qua thời gian kết thúc dự kiến
      sk.TgKetThucDK < GETDATE() 
      -- Và trạng thái hiện tại là các trạng thái "đang diễn ra"
      AND ttsk.MaTrangThai IN (
        '${MaTrangThaiSK.DA_XAC_NHAN_PHONG}', 
        '${MaTrangThaiSK.DA_DUYET_BGH}', 
        '${MaTrangThaiSK.CHO_DUYET_PHONG}'
      );
  `;

  // WHERE COALESCE(sk.TgKetThucThucTe, sk.TgKetThucDK) < GETDATE()

  const result = await executeQuery(query);
  return result.recordset.map((row) => row.SuKienID);
};

/**
 * [MỚI] Lấy danh sách sự kiện đủ điều kiện để mời, có phân trang và bộ lọc.
 * @param {object} params - Tham số lọc và phân trang
 * @returns {Promise<{items: Array<object>, totalItems: number}>}
 */
const getSuKienCoTheMoiList = async (params) => {
  const {
    searchTerm,
    donViToChucID,
    loaiSuKienID,
    page = 1,
    limit = 10,
    sortBy = 'sk.TgBatDauDK',
    sortOrder = 'DESC',
  } = params;

  const allowedStatusCodes = [MaTrangThaiSK.DA_XAC_NHAN_PHONG]
    .map((code) => `'${code}'`)
    .join(',');

  const fromClause = `
    FROM SuKien sk
    JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
    JOIN DonVi dv ON sk.DonViChuTriID = dv.DonViID
    LEFT JOIN LoaiSuKien lsk ON sk.LoaiSuKienID = lsk.LoaiSuKienID
    -- Subquery để đếm số người đã mời
    LEFT JOIN (
        SELECT SuKienID, COUNT(MoiThamGiaID) AS SoLuongDaMoi
        FROM SK_MoiThamGia
        GROUP BY SuKienID
    ) moi ON sk.SuKienID = moi.SuKienID
  `;
  let whereClause = ` WHERE ttsk.MaTrangThai IN (${allowedStatusCodes}) AND sk.TgKetThucDK > GETDATE() `;
  const queryParams = [];

  if (searchTerm) {
    whereClause += ` AND (sk.TenSK LIKE @SearchTerm OR dv.TenDonVi LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }
  if (donViToChucID) {
    whereClause += ` AND sk.DonViChuTriID = @DonViToChucID `;
    queryParams.push({
      name: 'DonViToChucID',
      type: sql.Int,
      value: donViToChucID,
    });
  }
  if (loaiSuKienID) {
    whereClause += ` AND sk.LoaiSuKienID = @LoaiSuKienID `;
    queryParams.push({
      name: 'LoaiSuKienID',
      type: sql.Int,
      value: loaiSuKienID,
    });
  }

  const countQuery = `SELECT COUNT(DISTINCT sk.SuKienID) AS TotalItems ${fromClause} ${whereClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems =
    countResult.recordset.length > 0 ? countResult.recordset[0].TotalItems : 0;

  const allowedSortBy = ['sk.TgBatDauDK', 'sk.TenSK', 'dv.TenDonVi'];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'sk.TgBatDauDK';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
    SELECT
        sk.SuKienID, sk.TenSK, sk.TgBatDauDK, sk.TgKetThucDK, sk.SlThamDuDK,
        lsk.TenLoaiSK,
        dv.TenDonVi AS TenDonViChuTri,
        ISNULL(moi.SoLuongDaMoi, 0) AS SoLuongDaMoi
    ${fromClause}
    ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
  `;
  queryParams.push({ name: 'Offset', type: sql.Int, value: offset });
  queryParams.push({ name: 'Limit', type: sql.Int, value: limit });

  const itemsResult = await executeQuery(itemsQuery, queryParams);
  return { items: itemsResult.recordset, totalItems };
};

/**
 * [MỚI] Thêm một hoặc nhiều lời mời vào bảng SK_MoiThamGia.
 * @param {number} suKienID - ID của sự kiện.
 * @param {Array<object>} invitations - Mảng các đối tượng lời mời, mỗi object chứa { nguoiDuocMoiID, vaiTroDuKienSK, ghiChuMoi }.
 * @param {sql.Transaction} transaction - Transaction đang hoạt động.
 * @returns {Promise<Array<object>>} Mảng các bản ghi đã được tạo thành công, chứa MoiThamGiaID.
 */
const addInvitationsToSuKien = async (suKienID, invitations, transaction) => {
  console.log(`Adding invitations for SuKienID ${suKienID}:`, invitations);
  if (!invitations || invitations.length === 0) {
    return [];
  }

  // Tạo câu lệnh INSERT với nhiều VALUES để tối ưu hơn việc gọi nhiều lần
  const valuesClauses = [];
  const params = [{ name: 'SuKienID', type: sql.Int, value: suKienID }];

  invitations.forEach((invite, index) => {
    const paramSuffix = index;
    valuesClauses.push(
      `(@SuKienID, @NguoiDuocMoiID${paramSuffix}, @VaiTroDuKienSK${paramSuffix}, @GhiChuMoi${paramSuffix})`
    );

    params.push({
      name: `NguoiDuocMoiID${paramSuffix}`,
      type: sql.Int,
      value: invite.nguoiDuocMoiID,
    });
    params.push({
      name: `VaiTroDuKienSK${paramSuffix}`,
      type: sql.NVarChar(200),
      value: invite.vaiTroDuKienSK,
    });
    params.push({
      name: `GhiChuMoi${paramSuffix}`,
      type: sql.NVarChar(500),
      value: invite.ghiChuMoi,
    });
  });

  const query = `
        INSERT INTO SK_MoiThamGia (SuKienID, NguoiDuocMoiID, VaiTroDuKienSK, GhiChuMoi)
        OUTPUT inserted.MoiThamGiaID, inserted.NguoiDuocMoiID
        VALUES ${valuesClauses.join(',\n')};
    `;

  const request = transaction.request();
  params.forEach((p) => request.input(p.name, p.type, p.value));

  const result = await request.query(query);
  return result.recordset; // Trả về mảng [{ MoiThamGiaID, NguoiDuocMoiID }]
};

/**
 * [MỚI] Lấy danh sách ID của những người đã được mời cho một sự kiện.
 * @param {number} suKienID - ID của sự kiện.
 * @param {sql.Transaction} transaction - Transaction đang hoạt động.
 * @returns {Promise<Set<number>>} Một Set chứa các NguoiDungID đã được mời.
 */
const getInvitedUserIdsForSuKien = async (suKienID, transaction) => {
  const query = `SELECT NguoiDuocMoiID FROM SK_MoiThamGia WHERE SuKienID = @SuKienID;`;
  const params = [{ name: 'SuKienID', type: sql.Int, value: suKienID }];
  const request = transaction.request();
  params.forEach((p) => request.input(p.name, p.type, p.value));

  const result = await request.query(query);
  const idSet = new Set(result.recordset.map((row) => row.NguoiDuocMoiID));
  return idSet;
};

/**
 * [MỚI] Lấy danh sách người đã được mời cho một sự kiện, có phân trang và bộ lọc.
 * @param {number} suKienID - ID của sự kiện.
 * @param {object} params - Tham số lọc và phân trang.
 * @returns {Promise<{items: Array<object>, totalItems: number}>}
 */
const getInvitedListForSuKien = async (suKienID, params) => {
  const {
    searchTerm,
    trangThaiPhanHoi,
    page = 1,
    limit = 10,
    sortBy = 'nd.HoTen',
    sortOrder = 'ASC',
  } = params;

  const fromClause = `
        FROM SK_MoiThamGia skm
        JOIN NguoiDung nd ON skm.NguoiDuocMoiID = nd.NguoiDungID
    `;
  let whereClause = ` WHERE skm.SuKienID = @SuKienID `;
  const queryParams = [{ name: 'SuKienID', type: sql.Int, value: suKienID }];

  if (searchTerm) {
    whereClause += ` AND (nd.HoTen LIKE @SearchTerm OR nd.Email LIKE @SearchTerm OR nd.MaDinhDanh LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }

  if (trangThaiPhanHoi) {
    if (trangThaiPhanHoi === 'CHUA_PHAN_HOI') {
      whereClause += ` AND skm.IsChapNhanMoi IS NULL `;
    } else if (trangThaiPhanHoi === 'CHAP_NHAN') {
      whereClause += ` AND skm.IsChapNhanMoi = 1 `;
    } else if (trangThaiPhanHoi === 'TU_CHOI') {
      whereClause += ` AND skm.IsChapNhanMoi = 0 `;
    }
  }

  const countQuery = `SELECT COUNT(skm.MoiThamGiaID) AS TotalItems ${fromClause} ${whereClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems =
    countResult.recordset.length > 0 ? countResult.recordset[0].TotalItems : 0;

  const allowedSortBy = ['nd.HoTen', 'nd.MaDinhDanh', 'skm.TgPhanHoiMoi'];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'nd.HoTen';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        SELECT
            skm.MoiThamGiaID,
            skm.VaiTroDuKienSK,
            skm.IsChapNhanMoi,
            skm.TgPhanHoiMoi,
            skm.GhiChuMoi,
            nd.NguoiDungID,
            nd.MaDinhDanh,
            nd.HoTen,
            nd.Email,
            nd.AnhDaiDien
        ${fromClause}
        ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
    `;
  queryParams.push({ name: 'Offset', type: sql.Int, value: offset });
  queryParams.push({ name: 'Limit', type: sql.Int, value: limit });

  const itemsResult = await executeQuery(itemsQuery, queryParams);
  return { items: itemsResult.recordset, totalItems };
};

/**
 * [MỚI] Lấy thông tin chi tiết một lời mời để kiểm tra trước khi xóa.
 * @param {number} moiThamGiaID - ID của lời mời trong SK_MoiThamGia.
 * @returns {Promise<object|null>} Thông tin lời mời hoặc null nếu không tồn tại.
 */
const getInvitationForDeletionCheck = async (moiThamGiaID) => {
  const query = `
        SELECT 
            skm.MoiThamGiaID, 
            skm.SuKienID, 
            skm.IsChapNhanMoi,
            sk.NguoiTaoID AS SuKien_NguoiTaoID, -- Người tạo sự kiện
            sk.DonViChuTriID AS SuKien_DonViChuTriID
        FROM SK_MoiThamGia skm
        JOIN SuKien sk ON skm.SuKienID = sk.SuKienID
        WHERE skm.MoiThamGiaID = @MoiThamGiaID;
    `;
  const params = [
    { name: 'MoiThamGiaID', type: sql.BigInt, value: moiThamGiaID },
  ];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * [MỚI] Xóa một bản ghi lời mời khỏi SK_MoiThamGia.
 * @param {number} moiThamGiaID - ID của lời mời cần xóa.
 * @returns {Promise<number>} Số dòng bị ảnh hưởng (0 hoặc 1).
 */
const deleteInvitationById = async (moiThamGiaID) => {
  const query = `DELETE FROM SK_MoiThamGia WHERE MoiThamGiaID = @MoiThamGiaID;`;
  const params = [
    { name: 'MoiThamGiaID', type: sql.BigInt, value: moiThamGiaID },
  ];
  const result = await executeQuery(query, params);
  return result.rowsAffected[0];
};

/**
 * [MỚI] Lấy danh sách lời mời của một người dùng, có phân trang và bộ lọc.
 * @param {number} nguoiDungID - ID của người dùng đang xem lời mời.
 * @param {object} params - Các tham số lọc và phân trang.
 * @returns {Promise<{items: Array<object>, totalItems: number}>}
 */
const getMyInvitations = async (nguoiDungID, params) => {
  const {
    trangThaiPhanHoi = 'CHUA_PHAN_HOI',
    sapDienRa = true,
    page = 1,
    limit = 10,
    sortBy = 'sk.TgBatDauDK',
    sortOrder = 'ASC',
  } = params;

  const fromClause = `
        FROM SK_MoiThamGia skm
        JOIN SuKien sk ON skm.SuKienID = sk.SuKienID
        JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
        JOIN DonVi dv_chutri ON sk.DonViChuTriID = dv_chutri.DonViID
        LEFT JOIN LoaiSuKien lsk ON sk.LoaiSuKienID = lsk.LoaiSuKienID
        LEFT JOIN NguoiDung nd_tao_sk ON sk.NguoiTaoID = nd_tao_sk.NguoiDungID -- Người tạo sự kiện, có thể là người gửi mời
        -- ... (Logic lấy đơn vị người tạo sự kiện sẽ phức tạp, tạm thời lấy họ tên) ...
        -- Lấy địa điểm đã xếp
        OUTER APPLY (
            SELECT TOP 1 p.TenPhong AS DiaDiem
            FROM YeuCauMuonPhong yc_p
            JOIN YcMuonPhongChiTiet yct_p ON yc_p.YcMuonPhongID = yct_p.YcMuonPhongID
            JOIN ChiTietDatPhong cdp ON yct_p.YcMuonPhongCtID = cdp.YcMuonPhongCtID
            JOIN Phong p ON cdp.PhongID = p.PhongID
            WHERE yc_p.SuKienID = sk.SuKienID
            ORDER BY cdp.DatPhongID ASC
        ) AS DiaDiem
    `;
  let whereClause = ` WHERE skm.NguoiDuocMoiID = @NguoiDungID `;
  const queryParams = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
  ];

  if (trangThaiPhanHoi) {
    if (trangThaiPhanHoi === 'CHUA_PHAN_HOI')
      whereClause += ' AND skm.IsChapNhanMoi IS NULL ';
    else if (trangThaiPhanHoi === 'DA_CHAP_NHAN')
      whereClause += ' AND skm.IsChapNhanMoi = 1 ';
    else if (trangThaiPhanHoi === 'DA_TU_CHOI')
      whereClause += ' AND skm.IsChapNhanMoi = 0 ';
  }

  if (sapDienRa === true) {
    whereClause += ' AND sk.TgKetThucDK >= GETDATE() ';
  }

  const countQuery = `SELECT COUNT(DISTINCT skm.MoiThamGiaID) AS TotalItems ${fromClause} ${whereClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0]?.TotalItems || 0;

  const allowedSortBy = ['sk.TgBatDauDK', 'sk.TenSK'];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'sk.TgBatDauDK';
  const safeSortOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        SELECT DISTINCT
            skm.MoiThamGiaID, skm.VaiTroDuKienSK, skm.GhiChuMoi, skm.IsChapNhanMoi, skm.TgPhanHoiMoi,
            sk.SuKienID, sk.TenSK, sk.TgBatDauDK, sk.TgKetThucDK,
            lsk.TenLoaiSK,
            dv_chutri.TenDonVi AS TenDonViChuTri,
            DiaDiem.DiaDiem AS DiaDiemDaXep,
            nd_tao_sk.HoTen AS HoTenNguoiGuiMoi -- Tạm lấy người tạo sự kiện là người mời
        ${fromClause}
        ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
    `;
  queryParams.push({ name: 'Offset', type: sql.Int, value: offset });
  queryParams.push({ name: 'Limit', type: sql.Int, value: limit });

  const itemsResult = await executeQuery(itemsQuery, queryParams);
  return { items: itemsResult.recordset, totalItems };
};

/**
 * [MỚI] Cập nhật phản hồi cho một lời mời.
 * @param {number} moiThamGiaID - ID của lời mời.
 * @param {boolean} chapNhan - Trạng thái chấp nhận (true/false).
 * @param {string | null} lyDoTuChoi - Lý do từ chối (nếu có).
 * @returns {Promise<object|null>} Bản ghi lời mời đã được cập nhật hoặc null nếu không tìm thấy.
 */
const updateInvitationResponse = async (moiThamGiaID, chapNhan, lyDoTuChoi) => {
  const query = `
        UPDATE SK_MoiThamGia
        SET 
            IsChapNhanMoi = @IsChapNhanMoi,
            TgPhanHoiMoi = GETDATE(),
            LyDoTuChoiMoi = @LyDoTuChoiMoi
        OUTPUT 
            inserted.MoiThamGiaID,
            inserted.IsChapNhanMoi,
            inserted.TgPhanHoiMoi,
            inserted.LyDoTuChoiMoi
        WHERE 
            MoiThamGiaID = @MoiThamGiaID;
    `;
  const params = [
    { name: 'MoiThamGiaID', type: sql.BigInt, value: moiThamGiaID },
    { name: 'IsChapNhanMoi', type: sql.Bit, value: chapNhan },
    { name: 'LyDoTuChoiMoi', type: sql.NVarChar(sql.MAX), value: lyDoTuChoi },
  ];

  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

const getMoiMoi = async (moiThamGiaID) => {
  const query = `SELECT * FROM SK_MoiThamGia WHERE MoiThamGiaID = @MoiThamGiaID`;
  const params = [
    { name: 'MoiThamGiaID', type: sql.BigInt, value: moiThamGiaID },
  ];
  const result = await executeQuery(query, params);
  return result.recordset[0];
};

/**
 * [MỚI] Lấy danh sách sự kiện người dùng đã tham gia, kèm thông tin đánh giá.
 * @param {number} nguoiDungID - ID của người dùng.
 * @param {object} params - Các tham số lọc và phân trang.
 * @returns {Promise<{items: Array<object>, totalItems: number}>}
 */
const getMyAttendedEvents = async (nguoiDungID, params) => {
  const {
    trangThaiSuKien,
    daDanhGia,
    tuNgay,
    denNgay,
    page = 1,
    limit = 10,
    sortBy = 'tgKetThuc',
    sortOrder = 'DESC',
  } = params;

  const fromClause = `
        FROM SK_MoiThamGia skm
        JOIN SuKien sk ON skm.SuKienID = sk.SuKienID
        JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
        JOIN DonVi dv_chutri ON sk.DonViChuTriID = dv_chutri.DonViID
        LEFT JOIN LoaiSuKien lsk ON sk.LoaiSuKienID = lsk.LoaiSuKienID
        -- Lấy thông tin đánh giá của người dùng này cho sự kiện này
        LEFT JOIN DanhGiaSK dg ON sk.SuKienID = dg.SuKienID AND dg.NguoiDanhGiaID = skm.NguoiDuocMoiID
        -- Lấy địa điểm đã xếp
        OUTER APPLY (
            SELECT TOP 1 p.TenPhong AS DiaDiem
            FROM YeuCauMuonPhong yc_p
            JOIN YcMuonPhongChiTiet yct_p ON yc_p.YcMuonPhongID = yct_p.YcMuonPhongID
            JOIN ChiTietDatPhong cdp ON yct_p.YcMuonPhongCtID = cdp.YcMuonPhongCtID
            JOIN Phong p ON cdp.PhongID = p.PhongID
            WHERE yc_p.SuKienID = sk.SuKienID
            ORDER BY cdp.DatPhongID ASC
        ) AS DiaDiem
    `;
  let whereClause = ` WHERE skm.NguoiDuocMoiID = @NguoiDungID AND skm.IsChapNhanMoi = 1 `;
  const queryParams = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
  ];

  // Logic lọc theo trạng thái sự kiện
  if (trangThaiSuKien) {
    const now = 'GETDATE()';
    if (trangThaiSuKien === 'SAP_DIEN_RA') {
      whereClause += ` AND sk.TgBatDauDK > ${now} AND ttsk.MaTrangThai NOT IN ('${MaTrangThaiSK.DA_HUY}', '${MaTrangThaiSK.HOAN_THANH}') `;
    } else if (trangThaiSuKien === 'DANG_DIEN_RA') {
      whereClause += ` AND ${now} BETWEEN sk.TgBatDauDK AND sk.TgKetThucDK AND ttsk.MaTrangThai NOT IN ('${MaTrangThaiSK.DA_HUY}', '${MaTrangThaiSK.HOAN_THANH}') `;
    } else if (trangThaiSuKien === 'DA_HOAN_THANH') {
      whereClause += ` AND ttsk.MaTrangThai = '${MaTrangThaiSK.HOAN_THANH}' `;
    } else if (trangThaiSuKien === 'DA_HUY') {
      whereClause += ` AND ttsk.MaTrangThai = '${MaTrangThaiSK.DA_HUY}' `;
    }
  }

  // Logic lọc theo đã đánh giá hay chưa
  if (typeof daDanhGia === 'boolean') {
    if (daDanhGia) {
      whereClause += ` AND dg.DanhGiaSkID IS NOT NULL `;
    } else {
      // Chưa đánh giá
      whereClause += ` AND dg.DanhGiaSkID IS NULL `;
    }
  }

  if (tuNgay) {
    whereClause += ` AND COALESCE(sk.TgKetThucThucTe, sk.TgKetThucDK) >= @TuNgay `;
    queryParams.push({ name: 'TuNgay', type: sql.Date, value: tuNgay });
  }
  if (denNgay) {
    whereClause += ` AND COALESCE(sk.TgKetThucThucTe, sk.TgKetThucDK) <= @DenNgay `;
    queryParams.push({ name: 'DenNgay', type: sql.Date, value: denNgay });
  }

  const countQuery = `SELECT COUNT(DISTINCT skm.MoiThamGiaID) AS TotalItems ${fromClause} ${whereClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0]?.TotalItems || 0;

  const selectFields = `
        SELECT DISTINCT
            skm.MoiThamGiaID, skm.IsChapNhanMoi,
            sk.SuKienID, sk.TenSK,
            COALESCE(sk.TgBatDauThucTe, sk.TgBatDauDK) AS tgBatDau,
            COALESCE(sk.TgKetThucThucTe, sk.TgKetThucDK) AS tgKetThuc,
            lsk.TenLoaiSK,
            dv_chutri.TenDonVi AS TenDonViChuTri,
            ttsk.MaTrangThai AS MaTrangThaiSK, ttsk.TenTrangThai AS TenTrangThaiSK,
            DiaDiem.DiaDiem AS DiaDiemDaXep,
            dg.DanhGiaSkID, dg.DiemNoiDung, dg.DiemToChuc, dg.DiemDiaDiem, dg.YKienDongGop, dg.TgDanhGia
    `;

  const allowedSortBy = {
    'SuKien.TgKetThucDK': 'tgKetThuc',
    TenSK: 'sk.TenSK',
  };
  const safeSortBy = allowedSortBy[sortBy] || 'tgKetThuc';
  const safeSortOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        ${selectFields}
        ${fromClause}
        ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
    `;
  queryParams.push({ name: 'Offset', type: sql.Int, value: offset });
  queryParams.push({ name: 'Limit', type: sql.Int, value: limit });

  const itemsResult = await executeQuery(itemsQuery, queryParams);
  return { items: itemsResult.recordset, totalItems };
};

/**
 * [MỚI] Lấy các sự kiện đang chờ BGH duyệt cho dashboard.
 * @param {number} limit - Giới hạn số lượng.
 * @returns {Promise<Array<object>>}
 */
const getPendingApprovalEventsForDashboard = async (limit) => {
  const query = `
        SELECT TOP (@Limit)
            sk.SuKienID,
            sk.TenSK,
            nd_tao.HoTen AS HoTenNguoiTao,
            dv_chutri.TenDonVi AS TenDonViChuTri,
            sk.NgayTaoSK
        FROM SuKien sk
        JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
        JOIN NguoiDung nd_tao ON sk.NguoiTaoID = nd_tao.NguoiDungID
        JOIN DonVi dv_chutri ON sk.DonViChuTriID = dv_chutri.DonViID
        WHERE ttsk.MaTrangThai = @MaTrangThai
        ORDER BY sk.NgayTaoSK DESC;
    `;
  const params = [
    { name: 'Limit', type: sql.Int, value: limit },
    {
      name: 'MaTrangThai',
      type: sql.VarChar,
      value: MaTrangThaiSK.CHO_DUYET_BGH,
    },
  ];
  const result = await executeQuery(query, params);
  return result.recordset;
};

export const suKienRepository = {
  addDonViThamGiaToSuKien,
  getSuKienListWithPagination,
  getSuKienDetailById,
  findSuKienForStatusUpdate,
  updateSuKienTrangThaiVaLyDo,
  getTrangThaiSkIDByMa,
  getTrangThaiIDByMaGeneric,
  updateSuKienTrangThai,
  getPublicSuKienListWithPagination,
  getPublicSuKienDetailById,
  createSuKien,
  updateSuKienById,
  updateSuKienByBGHAction,
  getSuKienForYeuCauPhongSelect,
  findSuKienChoBGHQuaHan,
  findSuKienSapDienRaChoBGHDeHuy,
  updateTrangThaiNhieuSuKien,
  clearDonViThamGiaFromSuKien,
  findFinishedEventsToUpdateStatus,
  getSuKienCoTheMoiList,
  addInvitationsToSuKien,
  getInvitedUserIdsForSuKien,
  getInvitedListForSuKien,
  getInvitationForDeletionCheck,
  deleteInvitationById,
  getMyInvitations,
  updateInvitationResponse,
  getMoiMoi,
  getMyAttendedEvents,
  getPendingApprovalEventsForDashboard,
};
