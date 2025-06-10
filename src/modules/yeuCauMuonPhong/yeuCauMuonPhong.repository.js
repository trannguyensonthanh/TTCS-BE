// src/modules/yeuCauMuonPhong/yeuCauMuonPhong.repository.js
import { executeQuery, getPool } from '../../utils/database.js';
import sql from 'mssql';
import MaTrangThaiSK from '../../enums/maTrangThaiSK.enum.js'; // Nếu cần lọc sự kiện theo trạng thái
import MaTrangThaiYeuCauPhong from '../../enums/maTrangThaiYeuCauPhong.enum.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

/**
 * Lấy danh sách YeuCauMuonPhong (Header) với phân trang và bộ lọc
 */
const getYeuCauMuonPhongListWithPagination = async (params, currentUser) => {
  const {
    searchTerm,
    trangThaiChungMa,
    suKienID,
    nguoiYeuCauID, // Dùng để lọc cho CBTC
    donViYeuCauID,
    tuNgayYeuCau,
    denNgayYeuCau,
    page = 1,
    limit = 10,
    sortBy = 'yc.NgayYeuCau',
    sortOrder = 'DESC',
  } = params;

  let querySelect = `
    SELECT DISTINCT
        yc.YcMuonPhongID,
        yc.NgayYeuCau,
        sk.SuKienID,
        sk.TenSK,
        sk.TgBatDauDK,
        sk.TgKetThucDK,
        nd_yc.NguoiDungID AS NguoiYeuCau_ID,
        nd_yc.HoTen AS NguoiYeuCau_HoTen,
        nd_yc.Email AS NguoiYeuCau_Email,
        dv_nguoi_yc.DonViID AS DonViYC_ID,
        dv_nguoi_yc.TenDonVi AS DonViYC_TenDonVi,
        dv_nguoi_yc.MaDonVi AS DonViYC_MaDonVi,
        dv_nguoi_yc.LoaiDonVi AS DonViYC_LoaiDonVi,
        tt_yc.TrangThaiYcpID AS TrangThaiChung_ID,
        tt_yc.MaTrangThai AS TrangThaiChung_Ma,
        tt_yc.TenTrangThai AS TrangThaiChung_Ten,
        (SELECT COUNT(*) FROM YcMuonPhongChiTiet yct_count WHERE yct_count.YcMuonPhongID = yc.YcMuonPhongID) AS SoLuongChiTietYeuCau,
        (SELECT COUNT(DISTINCT ctdp_count.PhongID)
         FROM YcMuonPhongChiTiet yct_count_xep
         JOIN ChiTietDatPhong ctdp_count ON yct_count_xep.YcMuonPhongCtID = ctdp_count.YcMuonPhongCtID
         WHERE yct_count_xep.YcMuonPhongID = yc.YcMuonPhongID
        ) AS SoLuongChiTietDaXepPhong
  `;
  let queryFrom = `
       FROM YeuCauMuonPhong yc
    JOIN SuKien sk ON yc.SuKienID = sk.SuKienID
    JOIN NguoiDung nd_yc ON yc.NguoiYeuCauID = nd_yc.NguoiDungID
    JOIN TrangThaiYeuCauPhong tt_yc ON yc.TrangThaiChungID = tt_yc.TrangThaiYcpID AND tt_yc.LoaiApDung = 'CHUNG'
    LEFT JOIN ThongTinGiangVien tgv_yc ON nd_yc.NguoiDungID = tgv_yc.NguoiDungID
    LEFT JOIN DonVi dv_tgv_yc ON tgv_yc.DonViCongTacID = dv_tgv_yc.DonViID
    LEFT JOIN NguoiDung_VaiTro ndvt_yc ON nd_yc.NguoiDungID = ndvt_yc.NguoiDungID
        AND (ndvt_yc.NgayKetThuc IS NULL OR ndvt_yc.NgayKetThuc >= GETDATE())
    LEFT JOIN VaiTroHeThong vt_yc ON ndvt_yc.VaiTroID = vt_yc.VaiTroID
        AND vt_yc.MaVaiTro = '${MaVaiTro.CB_TO_CHUC_SU_KIEN}' 
    LEFT JOIN DonVi dv_ndvt_yc ON ndvt_yc.DonViID = dv_ndvt_yc.DonViID
    OUTER APPLY (
        SELECT TOP 1 DonViID_src AS DonViID, TenDonVi_src AS TenDonVi, MaDonVi_src AS MaDonVi, LoaiDonVi_src AS LoaiDonVi
        FROM (
            -- Ưu tiên đơn vị từ vai trò được gán
            SELECT 
                dv_ndvt_yc.DonViID AS DonViID_src, 
                dv_ndvt_yc.TenDonVi AS TenDonVi_src, 
                dv_ndvt_yc.MaDonVi AS MaDonVi_src, 
                dv_ndvt_yc.LoaiDonVi AS LoaiDonVi_src, 
                1 as priority 
            WHERE dv_ndvt_yc.DonViID IS NOT NULL -- Chỉ lấy nếu join dv_ndvt_yc thành công
            UNION ALL
            -- Sau đó đến đơn vị công tác của giảng viên
            SELECT 
                dv_tgv_yc.DonViID AS DonViID_src, 
                dv_tgv_yc.TenDonVi AS TenDonVi_src, 
                dv_tgv_yc.MaDonVi AS MaDonVi_src, 
                dv_tgv_yc.LoaiDonVi AS LoaiDonVi_src, 
                2 as priority 
            WHERE dv_tgv_yc.DonViID IS NOT NULL -- Chỉ lấy nếu join dv_tgv_yc thành công
            -- Thêm logic lấy đơn vị cho các loại người dùng khác nếu cần (ví dụ: sinh viên thuộc CLB, CLB là đơn vị yêu cầu)
        ) AS dv_src_ordered
        ORDER BY priority ASC
    ) AS dv_nguoi_yc
  `;
  let queryWhere = ` WHERE 1=1 `;
  const queryParams = [];

  // Phân quyền xem:
  // ADMIN và CSVC thấy hết. CBTC chỉ thấy của mình hoặc của đơn vị mình (nếu có logic này)
  // if (!currentUser.roles.includes(MaVaiTro.ADMIN_HE_THONG) && !currentUser.roles.includes(MaVaiTro.QUAN_LY_CSVC)) {
  //   queryWhere += ` AND yc.NguoiYeuCauID = @CurrentUserID `;
  //   queryParams.push({ name: 'CurrentUserID', type: sql.Int, value: currentUser.nguoiDungID });
  // }
  // Logic phân quyền sẽ được xử lý kỹ hơn ở service dựa trên vai trò của currentUser

  if (searchTerm) {
    queryWhere += ` AND (sk.TenSK LIKE @SearchTerm OR nd_yc.HoTen LIKE @SearchTerm OR dv_nguoi_yc.TenDonVi LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }
  if (trangThaiChungMa) {
    queryWhere += ` AND tt_yc.MaTrangThai = @TrangThaiChungMa `;
    queryParams.push({
      name: 'TrangThaiChungMa',
      type: sql.VarChar,
      value: trangThaiChungMa,
    });
  }
  if (suKienID) {
    queryWhere += ` AND yc.SuKienID = @SuKienID `;
    queryParams.push({ name: 'SuKienID', type: sql.Int, value: suKienID });
  }
  if (nguoiYeuCauID) {
    queryWhere += ` AND yc.NguoiYeuCauID = @NguoiYeuCauID `;
    queryParams.push({
      name: 'NguoiYeuCauID',
      type: sql.Int,
      value: nguoiYeuCauID,
    });
  }
  if (donViYeuCauID) {
    queryWhere += ` AND dv_nguoi_yc.DonViID = @DonViYeuCauID `;
    queryParams.push({
      name: 'DonViYeuCauID',
      type: sql.Int,
      value: donViYeuCauID,
    });
  }
  if (tuNgayYeuCau) {
    queryWhere += ` AND yc.NgayYeuCau >= @TuNgayYeuCau `;
    queryParams.push({
      name: 'TuNgayYeuCau',
      type: sql.Date,
      value: tuNgayYeuCau,
    });
  }
  if (denNgayYeuCau) {
    const denNgayEnd = new Date(denNgayYeuCau);
    denNgayEnd.setDate(denNgayEnd.getDate() + 1);
    queryWhere += ` AND yc.NgayYeuCau < @DenNgayYeuCau `;
    queryParams.push({
      name: 'DenNgayYeuCau',
      type: sql.Date,
      value: denNgayEnd.toISOString().split('T')[0],
    });
  }

  const countQuery = `SELECT COUNT(DISTINCT yc.YcMuonPhongID) AS TotalItems ${queryFrom} ${queryWhere}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = [
    'yc.NgayYeuCau',
    'sk.TenSK',
    'nd_yc.HoTen',
    'dv_nguoi_yc.TenDonVi',
  ];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'yc.NgayYeuCau';
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
  console.log('itemsResult:', itemsResult);
  const items = itemsResult.recordset.map((row) => ({
    ycMuonPhongID: row.YcMuonPhongID,
    suKien: {
      suKienID: row.SuKienID,
      tenSK: row.TenSK,
      tgBatDauDK: row.TgBatDauDK.toISOString(),
      tgKetThucDK: row.TgKetThucDK.toISOString(),
    },
    nguoiYeuCau: {
      nguoiDungID: row.NguoiYeuCau_ID,
      hoTen: row.NguoiYeuCau_HoTen,
      email: row.NguoiYeuCau_Email,
    },
    donViYeuCau: row.DonViYC_ID
      ? {
          donViID: row.DonViYC_ID,
          tenDonVi: row.DonViYC_TenDonVi,
          maDonVi: row.DonViYC_MaDonVi,
          loaiDonVi: row.DonViYC_LoaiDonVi,
        }
      : null,
    ngayYeuCau: row.NgayYeuCau.toISOString(),
    trangThaiChung: {
      trangThaiYcpID: row.TrangThaiChung_ID,
      maTrangThai: row.TrangThaiChung_Ma,
      tenTrangThai: row.TrangThaiChung_Ten,
      loaiApDung: 'CHUNG', // Hardcode vì query này chỉ lấy trạng thái chung
    },
    soLuongChiTietYeuCau: row.SoLuongChiTietYeuCau,
    soLuongChiTietDaXepPhong: row.SoLuongChiTietDaXepPhong,
  }));
  return { items, totalItems };
};

/**
 * Lấy chi tiết YeuCauMuonPhong (Header) và các YcMuonPhongChiTiet (Detail) của nó
 */
const getYeuCauMuonPhongDetailById = async (ycMuonPhongID) => {
  // 1. Lấy thông tin Header
  const headerQuery = `
    SELECT
        yc.YcMuonPhongID, yc.NgayYeuCau, yc.GhiChuChungYc,
        sk.SuKienID, sk.TenSK, sk.TgBatDauDK, sk.TgKetThucDK,
        nd_yc.NguoiDungID AS NguoiYeuCau_ID, nd_yc.HoTen AS NguoiYeuCau_HoTen, nd_yc.Email AS NguoiYeuCau_Email,
        dv_nguoi_yc.DonViID AS DonViYC_ID, dv_nguoi_yc.TenDonVi AS DonViYC_TenDonVi, dv_nguoi_yc.MaDonVi AS DonViYC_MaDonVi, dv_nguoi_yc.LoaiDonVi AS DonViYC_LoaiDonVi,
        tt_yc.TrangThaiYcpID AS TrangThaiChung_ID, tt_yc.MaTrangThai AS TrangThaiChung_Ma, tt_yc.TenTrangThai AS TrangThaiChung_Ten,
        nd_duyet_tong.NguoiDungID AS NguoiDuyetTong_ID, nd_duyet_tong.HoTen AS NguoiDuyetTong_HoTen, nd_duyet_tong.Email AS NguoiDuyetTong_Email,
        yc.NgayDuyetTongCSVC
    FROM YeuCauMuonPhong yc
    JOIN SuKien sk ON yc.SuKienID = sk.SuKienID
    JOIN NguoiDung nd_yc ON yc.NguoiYeuCauID = nd_yc.NguoiDungID
    JOIN TrangThaiYeuCauPhong tt_yc ON yc.TrangThaiChungID = tt_yc.TrangThaiYcpID AND tt_yc.LoaiApDung = 'CHUNG'
    LEFT JOIN NguoiDung nd_duyet_tong ON yc.NguoiDuyetTongCSVCID = nd_duyet_tong.NguoiDungID
    -- Logic lấy dv_nguoi_yc tương tự như hàm get list
    LEFT JOIN ThongTinGiangVien tgv_yc ON nd_yc.NguoiDungID = tgv_yc.NguoiDungID
    LEFT JOIN DonVi dv_tgv_yc ON tgv_yc.DonViCongTacID = dv_tgv_yc.DonViID
    LEFT JOIN NguoiDung_VaiTro ndvt_yc ON nd_yc.NguoiDungID = ndvt_yc.NguoiDungID AND (ndvt_yc.NgayKetThuc IS NULL OR ndvt_yc.NgayKetThuc >= GETDATE())
    LEFT JOIN VaiTroHeThong vt_yc ON ndvt_yc.VaiTroID = vt_yc.VaiTroID AND vt_yc.MaVaiTro = '${MaVaiTro.CB_TO_CHUC_SU_KIEN}'
    LEFT JOIN DonVi dv_ndvt_yc ON ndvt_yc.DonViID = dv_ndvt_yc.DonViID
    OUTER APPLY (
        SELECT TOP 1 DonViID, TenDonVi, MaDonVi, LoaiDonVi
        FROM (
            SELECT dv_ndvt_yc.DonViID, dv_ndvt_yc.TenDonVi, dv_ndvt_yc.MaDonVi, dv_ndvt_yc.LoaiDonVi, 1 as priority FROM DonVi dv_ndvt_yc WHERE dv_ndvt_yc.DonViID = ndvt_yc.DonViID
            UNION ALL
            SELECT dv_tgv_yc.DonViID, dv_tgv_yc.TenDonVi, dv_tgv_yc.MaDonVi, dv_tgv_yc.LoaiDonVi, 2 as priority FROM DonVi dv_tgv_yc WHERE dv_tgv_yc.DonViID = tgv_yc.DonViCongTacID
        ) AS dv_src
        ORDER BY priority ASC
    ) AS dv_nguoi_yc
    WHERE yc.YcMuonPhongID = @YcMuonPhongID;
  `;
  const headerParams = [
    { name: 'YcMuonPhongID', type: sql.Int, value: ycMuonPhongID },
  ];
  const headerResult = await executeQuery(headerQuery, headerParams);
  if (headerResult.recordset.length === 0) return null;
  const headerData = headerResult.recordset[0];

  // 2. Lấy danh sách chi tiết yêu cầu (YcMuonPhongChiTiet) và phòng được cấp
  const detailQuery = `
    WITH ActiveBookings AS (
        SELECT
            yct.YcMuonPhongCtID,
            -- Lấy DatPhongID đang hoạt động, ưu tiên phòng từ YC đổi đã duyệt
            COALESCE(ycdp_approved.DatPhongID_Moi, cdp.DatPhongID) AS ActiveDatPhongID
        FROM YcMuonPhongChiTiet yct
        LEFT JOIN ChiTietDatPhong cdp ON yct.YcMuonPhongCtID = cdp.YcMuonPhongCtID
        LEFT JOIN (
            -- Tìm yêu cầu đổi phòng đã được duyệt gần nhất cho mỗi chi tiết
            SELECT 
                ycdp_inner.YcMuonPhongCtID,
                ycdp_inner.DatPhongID_Moi,
                ROW_NUMBER() OVER(PARTITION BY ycdp_inner.YcMuonPhongCtID ORDER BY ycdp_inner.NgayDuyetDoiCSVC DESC) as rn
            FROM YeuCauDoiPhong ycdp_inner
            JOIN TrangThaiYeuCauDoiPhong tt ON ycdp_inner.TrangThaiYcDoiPID = tt.TrangThaiYcDoiPID
            WHERE tt.MaTrangThai = 'DA_DUYET_DOI_PHONG'
        ) ycdp_approved ON yct.YcMuonPhongCtID = ycdp_approved.YcMuonPhongCtID AND ycdp_approved.rn = 1
        WHERE yct.YcMuonPhongID = @YcMuonPhongID
    )
    SELECT
        yct.YcMuonPhongCtID, yct.YcMuonPhongID, yct.MoTaNhomPhong, yct.SlPhongNhomNay,
        yct.LoaiPhongYcID, lp.TenLoaiPhong,
        yct.SucChuaYc, yct.ThietBiThemYc, yct.TgMuonDk, yct.TgTraDk,
        tt_ct.TrangThaiYcpID AS TrangThaiChiTiet_ID, tt_ct.MaTrangThai AS TrangThaiChiTiet_Ma, tt_ct.TenTrangThai AS TrangThaiChiTiet_Ten,
        yct.GhiChuCtCSVC,
        -- Lấy thông tin phòng từ ActiveDatPhongID
        cdp_active.DatPhongID, p.PhongID AS PhongDuocCap_ID, p.TenPhong AS PhongDuocCap_Ten, p.MaPhong AS PhongDuocCap_Ma
    FROM YcMuonPhongChiTiet yct
    JOIN TrangThaiYeuCauPhong tt_ct ON yct.TrangThaiCtID = tt_ct.TrangThaiYcpID AND tt_ct.LoaiApDung = 'CHI_TIET'
    LEFT JOIN LoaiPhong lp ON yct.LoaiPhongYcID = lp.LoaiPhongID
    LEFT JOIN ActiveBookings ab ON yct.YcMuonPhongCtID = ab.YcMuonPhongCtID
    LEFT JOIN ChiTietDatPhong cdp_active ON ab.ActiveDatPhongID = cdp_active.DatPhongID
    LEFT JOIN Phong p ON cdp_active.PhongID = p.PhongID
    WHERE yct.YcMuonPhongID = @YcMuonPhongID;
  `;
  const detailResult = await executeQuery(detailQuery, headerParams); // Dùng lại headerParams

  // Gom nhóm phòng được cấp cho từng chi tiết yêu cầu
  const chiTietYeuCauMap = new Map();
  detailResult.recordset.forEach((row) => {
    if (!chiTietYeuCauMap.has(row.YcMuonPhongCtID)) {
      chiTietYeuCauMap.set(row.YcMuonPhongCtID, {
        ycMuonPhongCtID: row.YcMuonPhongCtID,
        ycMuonPhongID: row.YcMuonPhongID,
        moTaNhomPhong: row.MoTaNhomPhong,
        slPhongNhomNay: row.SlPhongNhomNay,
        loaiPhongYeuCau: row.LoaiPhongYcID
          ? { loaiPhongID: row.LoaiPhongYcID, tenLoaiPhong: row.TenLoaiPhong }
          : null,
        sucChuaYc: row.SucChuaYc,
        thietBiThemYc: row.ThietBiThemYc,
        tgMuonDk: row.TgMuonDk.toISOString(),
        tgTraDk: row.TgTraDk.toISOString(),
        trangThaiChiTiet: {
          trangThaiYcpID: row.TrangThaiChiTiet_ID,
          maTrangThai: row.TrangThaiChiTiet_Ma,
          tenTrangThai: row.TrangThaiChiTiet_Ten,
          loaiApDung: 'CHI_TIET',
        },
        ghiChuCtCSVC: row.GhiChuCtCSVC,
        phongDuocCap: [],
      });
    }
    if (row.DatPhongID) {
      // Nếu có phòng được cấp
      chiTietYeuCauMap.get(row.YcMuonPhongCtID).phongDuocCap.push({
        datPhongID: Number(row.DatPhongID),
        phongID: row.PhongDuocCap_ID,
        tenPhong: row.PhongDuocCap_Ten,
        maPhong: row.PhongDuocCap_Ma,
      });
    }
  });

  return {
    ycMuonPhongID: headerData.YcMuonPhongID,
    suKien: {
      suKienID: headerData.SuKienID,
      tenSK: headerData.TenSK,
      tgBatDauDK: headerData.TgBatDauDK.toISOString(),
      tgKetThucDK: headerData.TgKetThucDK.toISOString(),
    },
    nguoiYeuCau: {
      nguoiDungID: headerData.NguoiYeuCau_ID,
      hoTen: headerData.NguoiYeuCau_HoTen,
      email: headerData.NguoiYeuCau_Email,
    },
    donViYeuCau: headerData.DonViYC_ID
      ? {
          donViID: headerData.DonViYC_ID,
          tenDonVi: headerData.DonViYC_TenDonVi,
          maDonVi: headerData.DonViYC_MaDonVi,
          loaiDonVi: headerData.DonViYC_LoaiDonVi,
        }
      : null,
    ngayYeuCau: headerData.NgayYeuCau.toISOString(),
    trangThaiChung: {
      trangThaiYcpID: headerData.TrangThaiChung_ID,
      maTrangThai: headerData.TrangThaiChung_Ma,
      tenTrangThai: headerData.TrangThaiChung_Ten,
      loaiApDung: 'CHUNG',
    },
    ghiChuChungYc: headerData.GhiChuChungYc,
    nguoiDuyetTongCSVC: headerData.NguoiDuyetTong_ID
      ? {
          nguoiDungID: headerData.NguoiDuyetTong_ID,
          hoTen: headerData.NguoiDuyetTong_HoTen,
          email: headerData.NguoiDuyetTong_Email,
        }
      : null,
    ngayDuyetTongCSVC: headerData.NgayDuyetTongCSVC
      ? headerData.NgayDuyetTongCSVC.toISOString()
      : null,
    chiTietYeuCau: Array.from(chiTietYeuCauMap.values()),
  };
};

/**
 * Kiểm tra trạng thái của Sự kiện
 * @param {number} suKienID
 * @param {sql.Transaction} [transaction=null]
 * @returns {Promise<string|null>} MaTrangThai của SuKien hoặc null
 */
const getSuKienTrangThai = async (suKienID, transaction = null) => {
  const query = `
    SELECT ttsk.MaTrangThai
    FROM SuKien sk
    JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
    WHERE sk.SuKienID = @SuKienID;
  `;
  const params = [{ name: 'SuKienID', type: sql.Int, value: suKienID }];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset.length > 0 ? result.recordset[0].MaTrangThai : null;
};

/**
 * Tạo mới YeuCauMuonPhong (Header)
 * @param {object} data - { SuKienID, NguoiYeuCauID, GhiChuChungYc, TrangThaiChungID }
 * @param {sql.Transaction} transaction
 * @returns {Promise<number>} YcMuonPhongID vừa tạo
 */
const createYeuCauMuonPhongHeader = async (data, transaction) => {
  const query = `
    INSERT INTO YeuCauMuonPhong (SuKienID, NguoiYeuCauID, GhiChuChungYc, TrangThaiChungID, NgayYeuCau)
    OUTPUT inserted.YcMuonPhongID
    VALUES (@SuKienID, @NguoiYeuCauID, @GhiChuChungYc, @TrangThaiChungID, GETDATE());
  `;
  const params = [
    { name: 'SuKienID', type: sql.Int, value: data.suKienID },
    { name: 'NguoiYeuCauID', type: sql.Int, value: data.nguoiYeuCauID },
    {
      name: 'GhiChuChungYc',
      type: sql.NVarChar(sql.MAX),
      value: data.ghiChuChungYc,
    },
    { name: 'TrangThaiChungID', type: sql.Int, value: data.trangThaiChungID },
  ];
  const request = transaction.request(); // Luôn cần transaction cho hàm này
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset[0].YcMuonPhongID;
};

/**
 * Tạo mới YcMuonPhongChiTiet (Detail)
 * @param {object} data - YcMuonPhongChiTietCreatePayload & { YcMuonPhongID, TrangThaiCtID }
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const createYcMuonPhongDetail = async (data, transaction) => {
  const query = `
    INSERT INTO YcMuonPhongChiTiet (
        YcMuonPhongID, MoTaNhomPhong, SlPhongNhomNay, LoaiPhongYcID,
        SucChuaYc, ThietBiThemYc, TgMuonDk, TgTraDk, TrangThaiCtID
    ) VALUES (
        @YcMuonPhongID, @MoTaNhomPhong, @SlPhongNhomNay, @LoaiPhongYcID,
        @SucChuaYc, @ThietBiThemYc, @TgMuonDk, @TgTraDk, @TrangThaiCtID
    );
  `;
  const params = [
    { name: 'YcMuonPhongID', type: sql.Int, value: data.ycMuonPhongID },
    {
      name: 'MoTaNhomPhong',
      type: sql.NVarChar(200),
      value: data.moTaNhomPhong,
    },
    { name: 'SlPhongNhomNay', type: sql.Int, value: data.slPhongNhomNay },
    { name: 'LoaiPhongYcID', type: sql.Int, value: data.loaiPhongYcID },
    { name: 'SucChuaYc', type: sql.Int, value: data.sucChuaYc },
    {
      name: 'ThietBiThemYc',
      type: sql.NVarChar(sql.MAX),
      value: data.thietBiThemYc,
    },
    { name: 'TgMuonDk', type: sql.DateTime, value: new Date(data.tgMuonDk) },
    { name: 'TgTraDk', type: sql.DateTime, value: new Date(data.tgTraDk) },
    { name: 'TrangThaiCtID', type: sql.Int, value: data.trangThaiCtID },
  ];
  const request = transaction.request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  await request.query(query);
};

/**
 * Lấy thông tin một YcMuonPhongChiTiet cụ thể để xử lý
 * @param {number} ycMuonPhongCtID
 * @param {sql.Transaction} [transaction=null]
 * @returns {Promise<object|null>}
 */
const getYcMuonPhongChiTietForProcessing = async (
  ycMuonPhongCtID,
  transaction = null
) => {
  const query = `
    SELECT
        yct.YcMuonPhongCtID, yct.YcMuonPhongID, yct.SlPhongNhomNay,
        yct.TgMuonDk, yct.TgTraDk, yct.LoaiPhongYcID, yct.SucChuaYc,
        tt_ct.MaTrangThai AS MaTrangThaiChiTietHienTai,
        yc.SuKienID
    FROM YcMuonPhongChiTiet yct
    JOIN TrangThaiYeuCauPhong tt_ct ON yct.TrangThaiCtID = tt_ct.TrangThaiYcpID
    JOIN YeuCauMuonPhong yc ON yct.YcMuonPhongID = yc.YcMuonPhongID
    WHERE yct.YcMuonPhongCtID = @YcMuonPhongCtID;
  `;
  const params = [
    { name: 'YcMuonPhongCtID', type: sql.Int, value: ycMuonPhongCtID },
  ];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Kiểm tra xem một phòng có sẵn sàng trong khoảng thời gian yêu cầu không
 * @param {number} phongID
 * @param {Date} tgMuonDk
 * @param {Date} tgTraDk
 * @param {sql.Transaction} transaction
 * @param {number} [excludeYcMuonPhongCtID=null] - ID của chi tiết yêu cầu hiện tại (để bỏ qua nếu đang cập nhật)
 * @returns {Promise<boolean>} True nếu phòng sẵn sàng
 */
const checkPhongAvailability = async (
  phongID,
  tgMuonDk,
  tgTraDk,
  transaction,
  excludeDatPhongID = null
) => {
  let query = `
    SELECT COUNT(cdp.DatPhongID) AS OverlapCount
    FROM ChiTietDatPhong cdp
    JOIN YcMuonPhongChiTiet yct ON cdp.YcMuonPhongCtID = yct.YcMuonPhongCtID
    JOIN TrangThaiYeuCauPhong tt_ct ON yct.TrangThaiCtID = tt_ct.TrangThaiYcpID
    WHERE cdp.PhongID = @PhongID
      AND tt_ct.MaTrangThai = @MaTrangThaiDaXepPhong -- Chỉ xét các phòng đã được xếp thành công
      AND (
        (cdp.TgNhanPhongTT < @TgTraDk AND cdp.TgTraPhongTT > @TgMuonDk)
      )
  `;
  const params = [
    { name: 'PhongID', type: sql.Int, value: phongID },
    { name: 'TgMuonDk', type: sql.DateTime, value: tgMuonDk },
    { name: 'TgTraDk', type: sql.DateTime, value: tgTraDk },
    {
      name: 'MaTrangThaiDaXepPhong',
      type: sql.VarChar,
      value: MaTrangThaiYeuCauPhong.YCCPCT_DA_XEP_PHONG,
    },
  ];

  if (excludeDatPhongID) {
    // Dùng khi cập nhật/đổi phòng, bỏ qua chính bản ghi đang xét
    query += ` AND cdp.DatPhongID <> @ExcludeDatPhongID`;
    params.push({
      name: 'ExcludeDatPhongID',
      type: sql.Int,
      value: excludeDatPhongID,
    });
  }

  const request = transaction.request(); // Luôn cần transaction khi kiểm tra tính sẵn sàng để đảm bảo isolation
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset[0].OverlapCount === 0;
};

/**
 * Tạo bản ghi ChiTietDatPhong
 * @param {number} ycMuonPhongCtID
 * @param {number} phongID
 * @param {Date} tgNhanPhongTT
 * @param {Date} tgTraPhongTT
 * @param {sql.Transaction} transaction
 * @returns {Promise<number>} DatPhongID vừa tạo
 */
const createChiTietDatPhong = async (
  ycMuonPhongCtID,
  phongID,
  tgNhanPhongTT,
  tgTraPhongTT,
  transaction
) => {
  const query = `
    INSERT INTO ChiTietDatPhong (YcMuonPhongCtID, PhongID, TgNhanPhongTT, TgTraPhongTT)
    OUTPUT inserted.DatPhongID
    VALUES (@YcMuonPhongCtID, @PhongID, @TgNhanPhongTT, @TgTraPhongTT);
  `;
  const params = [
    { name: 'YcMuonPhongCtID', type: sql.Int, value: ycMuonPhongCtID },
    { name: 'PhongID', type: sql.Int, value: phongID },
    { name: 'TgNhanPhongTT', type: sql.DateTime, value: tgNhanPhongTT },
    { name: 'TgTraPhongTT', type: sql.DateTime, value: tgTraPhongTT },
  ];
  const request = transaction.request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset[0].DatPhongID;
};

/**
 * Cập nhật trạng thái và ghi chú cho YcMuonPhongChiTiet
 * @param {number} ycMuonPhongCtID
 * @param {number} trangThaiCtIDMoi
 * @param {string|null} ghiChuCSVC
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const updateYcMuonPhongChiTietStatus = async (
  ycMuonPhongCtID,
  trangThaiCtIDMoi,
  ghiChuCSVC,
  transaction = null
) => {
  const query = `
    UPDATE YcMuonPhongChiTiet
    SET TrangThaiCtID = @TrangThaiCtIDMoi, GhiChuCtCSVC = @GhiChuCSVC
    WHERE YcMuonPhongCtID = @YcMuonPhongCtID;
  `;
  const params = [
    { name: 'TrangThaiCtIDMoi', type: sql.Int, value: trangThaiCtIDMoi },
    { name: 'GhiChuCSVC', type: sql.NVarChar(sql.MAX), value: ghiChuCSVC },
    { name: 'YcMuonPhongCtID', type: sql.Int, value: ycMuonPhongCtID },
  ];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  await request.query(query);
};

/**
 * Cập nhật thông tin chi tiết của YcMuonPhongChiTiet
 * @param {number} ycMuonPhongCtID
 * @param {object} updateData - Dữ liệu cập nhật
 * @param {sql.Transaction} transaction
 * @returns {Promise<{ YcMuonPhongCtID: number }>} - Trả về ID của chi tiết đã cập nhật
 * */
const updateYcMuonPhongChiTietRecord = async (
  ycMuonPhongCtID,
  updateData,
  transaction
) => {
  const setClauses = [];
  const params = [
    { name: 'YcMuonPhongCtID', type: sql.Int, value: ycMuonPhongCtID },
  ];
  const addUpdateField = (dbField, paramName, paramType, value) => {
    if (typeof value !== 'undefined') {
      setClauses.push(`${dbField} = @${paramName}`);
      params.push({ name: paramName, type: paramType, value });
    }
  };

  addUpdateField(
    'MoTaNhomPhong',
    'MoTaNhomPhong',
    sql.NVarChar(200),
    updateData.moTaNhomPhong
  );
  addUpdateField(
    'SlPhongNhomNay',
    'SlPhongNhomNay',
    sql.Int,
    updateData.slPhongNhomNay
  );
  addUpdateField(
    'LoaiPhongYcID',
    'LoaiPhongYcID',
    sql.Int,
    updateData.loaiPhongYcID
  );
  addUpdateField('SucChuaYc', 'SucChuaYc', sql.Int, updateData.sucChuaYc);
  addUpdateField(
    'ThietBiThemYc',
    'ThietBiThemYc',
    sql.NVarChar(sql.MAX),
    updateData.thietBiThemYc
  );
  if (updateData.tgMuonDk)
    addUpdateField(
      'TgMuonDk',
      'TgMuonDk',
      sql.DateTime,
      new Date(updateData.tgMuonDk)
    );
  if (updateData.tgTraDk)
    addUpdateField(
      'TgTraDk',
      'TgTraDk',
      sql.DateTime,
      new Date(updateData.tgTraDk)
    );

  if (updateData.trangThaiCtIDMoi) {
    // Nếu cần cập nhật trạng thái
    setClauses.push('TrangThaiCtID = @TrangThaiCtIDMoi');
    params.push({
      name: 'TrangThaiCtIDMoi',
      type: sql.Int,
      value: updateData.trangThaiCtIDMoi,
    });
  }

  if (setClauses.length === 0) return { YcMuonPhongCtID: ycMuonPhongCtID };

  const query = `UPDATE YcMuonPhongChiTiet SET ${setClauses.join(', ')} WHERE YcMuonPhongCtID = @YcMuonPhongCtID;`;
  const request = transaction.request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  await request.query(query);
  return { YcMuonPhongCtID: ycMuonPhongCtID };
};

/**
 * Đếm số lượng chi tiết yêu cầu theo trạng thái cho một YeuCauMuonPhong (Header)
 * @param {number} ycMuonPhongID
 * @param {sql.Transaction} transaction
 * @returns {Promise<{ TotalChiTiet: number, DaXepPhongCount: number, ChoDuyetCount: number, KhongPhuHopCount: number }>}
 */
const countYcMuonPhongChiTietStatuses = async (ycMuonPhongID, transaction) => {
  const query = `
    SELECT
        COUNT(*) AS TotalChiTiet,
        SUM(CASE WHEN tt_ct.MaTrangThai = @MaDaXepPhong THEN 1 ELSE 0 END) AS DaXepPhongCount,
        SUM(CASE WHEN tt_ct.MaTrangThai = @MaChoDuyet THEN 1 ELSE 0 END) AS ChoDuyetCount,
        SUM(CASE WHEN tt_ct.MaTrangThai = @MaKhongPhuHop THEN 1 ELSE 0 END) AS KhongPhuHopCount
        -- Thêm các trạng thái khác nếu cần
    FROM YcMuonPhongChiTiet yct
    JOIN TrangThaiYeuCauPhong tt_ct ON yct.TrangThaiCtID = tt_ct.TrangThaiYcpID
    WHERE yct.YcMuonPhongID = @YcMuonPhongID;
  `;
  const params = [
    { name: 'YcMuonPhongID', type: sql.Int, value: ycMuonPhongID },
    {
      name: 'MaDaXepPhong',
      type: sql.VarChar,
      value: MaTrangThaiYeuCauPhong.YCCPCT_DA_XEP_PHONG,
    },
    {
      name: 'MaChoDuyet',
      type: sql.VarChar,
      value: MaTrangThaiYeuCauPhong.YCCPCT_CHO_DUYET,
    },
    {
      name: 'MaKhongPhuHop',
      type: sql.VarChar,
      value: MaTrangThaiYeuCauPhong.YCCPCT_KHONG_PHU_HOP,
    },
  ];
  const request = transaction.request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset[0];
};

/**
 * Cập nhật TrangThaiChungID và thông tin duyệt tổng thể cho YeuCauMuonPhong (Header)
 * @param {number} ycMuonPhongID
 * @param {number} trangThaiChungIDMoi
 * @param {number} nguoiDuyetTongCSVCID
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const updateYeuCauMuonPhongHeaderStatus = async (
  ycMuonPhongID,
  trangThaiChungIDMoi,
  nguoiDuyetTongCSVCID,
  transaction
) => {
  const query = `
    UPDATE YeuCauMuonPhong
    SET TrangThaiChungID = @TrangThaiChungIDMoi,
        NguoiDuyetTongCSVCID = @NguoiDuyetTongCSVCID,
        NgayDuyetTongCSVC = GETDATE()
    WHERE YcMuonPhongID = @YcMuonPhongID;
  `;
  const params = [
    { name: 'TrangThaiChungIDMoi', type: sql.Int, value: trangThaiChungIDMoi },
    {
      name: 'NguoiDuyetTongCSVCID',
      type: sql.Int,
      value: nguoiDuyetTongCSVCID,
    },
    { name: 'YcMuonPhongID', type: sql.Int, value: ycMuonPhongID },
  ];
  const request = transaction.request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  await request.query(query);
};

/**
 * Kiểm tra xem một Phong có tồn tại trong hệ thống không
 * @param {number} phongID
 * @param {sql.Transaction} transaction
 * @returns {Promise<boolean>} True nếu Phong tồn tại, false nếu không
 * */
const checkPhongExists = async (phongID, transaction) => {
  const query = `SELECT COUNT(*) as count FROM Phong WHERE PhongID = @PhongID`;
  const params = [{ name: 'PhongID', type: sql.Int, value: phongID }];
  const request = transaction.request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset[0].count > 0;
};

/**
 * Lấy thông tin YeuCauMuonPhong (Header) để kiểm tra trước khi hủy
 * @param {number} ycMuonPhongID
 * @param {sql.Transaction} [transaction=null]
 * @returns {Promise<object|null>} { YcMuonPhongID, NguoiYeuCauID, SuKienID, MaTrangThaiChungHienTai }
 */
const getYeuCauMuonPhongHeaderForCancel = async (
  ycMuonPhongID,
  transaction = null
) => {
  const query = `
    SELECT yc.YcMuonPhongID, yc.NguoiYeuCauID, yc.SuKienID, tt_yc.MaTrangThai AS MaTrangThaiChungHienTai
    FROM YeuCauMuonPhong yc
    JOIN TrangThaiYeuCauPhong tt_yc ON yc.TrangThaiChungID = tt_yc.TrangThaiYcpID
    WHERE yc.YcMuonPhongID = @YcMuonPhongID;
  `;
  const params = [
    { name: 'YcMuonPhongID', type: sql.Int, value: ycMuonPhongID },
  ];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Cập nhật trạng thái cho tất cả YcMuonPhongChiTiet của một YeuCauMuonPhong (Header)
 * @param {number} ycMuonPhongID
 * @param {number} trangThaiCtIDMoi (ID của trạng thái YCCPCT_DA_HUY)
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const updateAllChiTietOfYeuCauToHuy = async (
  ycMuonPhongID,
  trangThaiCtIDMoi,
  transaction
) => {
  const query = `
    UPDATE YcMuonPhongChiTiet
    SET TrangThaiCtID = @TrangThaiCtIDMoi
    WHERE YcMuonPhongID = @YcMuonPhongID;
  `;
  const params = [
    { name: 'TrangThaiCtIDMoi', type: sql.Int, value: trangThaiCtIDMoi },
    { name: 'YcMuonPhongID', type: sql.Int, value: ycMuonPhongID },
  ];
  const request = transaction.request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  await request.query(query);
};

/**
 * Tìm các YeuCauMuonPhong (header) đang chờ CSVC xử lý quá X ngày
 * @param {number} soNgayQuaHan
 * @returns {Promise<Array<object>>} { YcMuonPhongID, SuKienID, TenSK, NguoiYeuCauID, EmailNguoiYeuCau }
 */
const findYeuCauPhongChoCSVCQuaHan = async (soNgayQuaHan) => {
  const query = `
    SELECT
        yc.YcMuonPhongID,
        sk.SuKienID,
        sk.TenSK,
        yc.NguoiYeuCauID,
        nd.Email AS EmailNguoiYeuCau
    FROM YeuCauMuonPhong yc
    JOIN TrangThaiYeuCauPhong tt_yc ON yc.TrangThaiChungID = tt_yc.TrangThaiYcpID
    JOIN SuKien sk ON yc.SuKienID = sk.SuKienID
    JOIN NguoiDung nd ON yc.NguoiYeuCauID = nd.NguoiDungID
    WHERE tt_yc.MaTrangThai = @MaYcpChoXuLy
      AND yc.NgayYeuCau < DATEADD(day, -@SoNgayQuaHan, GETDATE());
  `;
  const params = [
    {
      name: 'MaYcpChoXuLy',
      type: sql.VarChar,
      value: MaTrangThaiYeuCauPhong.YCCP_CHO_XU_LY,
    },
    { name: 'SoNgayQuaHan', type: sql.Int, value: soNgayQuaHan },
  ];
  const result = await executeQuery(query, params);
  return result.recordset;
};

/**
 * Tìm các SuKien đã duyệt BGH, có YeuCauMuonPhong đang chờ xử lý hoặc chưa có YC phòng,
 * và sự kiện sắp diễn ra/đã qua để tự động hủy.
 * @returns {Promise<Array<object>>} { SuKienID, TenSK, NguoiTaoID_SK, EmailNguoiTao_SK, YcMuonPhongID (có thể null) }
 */
const findSuKienQuaHanXepPhongDeHuy = async () => {
  const query = `
        SELECT DISTINCT
            sk.SuKienID,
            sk.TenSK,
            sk.NguoiTaoID AS NguoiTaoID_SK,
            nd_sk_tao.Email AS EmailNguoiTao_SK,
            yc.YcMuonPhongID
        FROM SuKien sk
        JOIN TrangThaiSK ttsk_sk ON sk.TrangThaiSkID = ttsk_sk.TrangThaiSkID
        JOIN NguoiDung nd_sk_tao ON sk.NguoiTaoID = nd_sk_tao.NguoiDungID
        LEFT JOIN YeuCauMuonPhong yc ON sk.SuKienID = yc.SuKienID
        LEFT JOIN TrangThaiYeuCauPhong tt_yc ON yc.TrangThaiChungID = tt_yc.TrangThaiYcpID
            AND tt_yc.LoaiApDung = 'CHUNG'
        WHERE sk.TgBatDauDK <= GETDATE() -- Thời gian bắt đầu sự kiện đã đến hoặc qua
          AND (
                ttsk_sk.MaTrangThai = @MaSK_DaDuyetBGH OR
                ttsk_sk.MaTrangThai = @MaSK_ChoDuyetPhong OR
                ttsk_sk.MaTrangThai = @MaSK_PhongBiTuChoi
              )
          AND (
                yc.YcMuonPhongID IS NULL OR -- Chưa hề tạo YC phòng
                tt_yc.MaTrangThai IN (
                    @MaYCP_ChoXuLy,
                    @MaYCP_DangXuLy,
                    @MaYCP_TuChoiToanBo -- Nếu bị từ chối toàn bộ và đến ngày SK thì cũng nên hủy SK
                )
                -- Loại trừ các YC phòng đã được hủy bởi người tạo
                AND (tt_yc.MaTrangThai IS NULL OR tt_yc.MaTrangThai <> @MaYCP_DaHuyBoiNguoiTao)
              )
    `;
  const params = [
    {
      name: 'MaSK_DaDuyetBGH',
      type: sql.VarChar,
      value: MaTrangThaiSK.DA_DUYET_BGH,
    },
    {
      name: 'MaSK_ChoDuyetPhong',
      type: sql.VarChar,
      value: MaTrangThaiSK.CHO_DUYET_PHONG,
    },
    {
      name: 'MaSK_PhongBiTuChoi',
      type: sql.VarChar,
      value: MaTrangThaiSK.PHONG_BI_TU_CHOI,
    },
    {
      name: 'MaYCP_ChoXuLy',
      type: sql.VarChar,
      value: MaTrangThaiYeuCauPhong.YCCP_CHO_XU_LY,
    },
    {
      name: 'MaYCP_DangXuLy',
      type: sql.VarChar,
      value: MaTrangThaiYeuCauPhong.YCCP_DANG_XU_LY,
    },
    {
      name: 'MaYCP_TuChoiToanBo',
      type: sql.VarChar,
      value: MaTrangThaiYeuCauPhong.YCCP_TU_CHOI_TOAN_BO,
    },
    {
      name: 'MaYCP_DaHuyBoiNguoiTao',
      type: sql.VarChar,
      value: MaTrangThaiYeuCauPhong.YCCP_DA_HUY_BOI_NGUOI_TAO,
    },
  ];
  const result = await executeQuery(query, params);
  return result.recordset;
};

/**
 * Cập nhật trạng thái cho YeuCauMuonPhong (dùng khi tự động hủy)
 * @param {number} ycMuonPhongID
 * @param {number} trangThaiChungIDMoi
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const updateYeuCauMuonPhongHeaderStatusForAutoCancel = async (
  ycMuonPhongID,
  trangThaiChungIDMoi,
  transaction
) => {
  const query = `
        UPDATE YeuCauMuonPhong
        SET TrangThaiChungID = @TrangThaiChungIDMoi
        -- Không cần NguoiDuyetTongCSVCID cho tự động hủy
        WHERE YcMuonPhongID = @YcMuonPhongID;
    `;
  const params = [
    { name: 'TrangThaiChungIDMoi', type: sql.Int, value: trangThaiChungIDMoi },
    { name: 'YcMuonPhongID', type: sql.Int, value: ycMuonPhongID },
  ];
  const request = transaction.request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  await request.query(query);
};

/**
 * Lấy danh sách các bản ghi ChiTietDatPhong dựa trên SuKienID.
 * Hữu ích để kiểm tra các phòng đã được đặt cho một sự kiện.
 * @param {number} suKienID ID của sự kiện
 * @param {sql.Transaction} [transaction=null] Giao dịch tùy chọn
 * @returns {Promise<Array<object>>} Mảng các bản ghi từ ChiTietDatPhong
 */
const getChiTietDatPhongBySuKienID = async (suKienID, transaction = null) => {
  const query = `
    SELECT cdp.*
    FROM ChiTietDatPhong cdp
    JOIN YcMuonPhongChiTiet yct ON cdp.YcMuonPhongCtID = yct.YcMuonPhongCtID
    JOIN YeuCauMuonPhong yc ON yct.YcMuonPhongID = yc.YcMuonPhongID
    WHERE yc.SuKienID = @SuKienID;
  `;
  const params = [{ name: 'SuKienID', type: sql.Int, value: suKienID }];

  const request = transaction
    ? transaction.request()
    : (await getPool()).request();

  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset;
};

/**
 * Xóa các YcMuonPhongChiTiet bằng một mảng ID
 * @param {number[]} chiTietIDsToDelete Mảng các ID cần xóa
 * @param {sql.Transaction} transaction
 */
const deleteYcMuonPhongChiTietByIds = async (
  // ko thik dùng TVP
  chiTietIDsToDelete,
  transaction
) => {
  if (!chiTietIDsToDelete || chiTietIDsToDelete.length === 0) {
    return;
  }
  // Dùng Table-Valued Parameter để truyền mảng ID hiệu quả
  const idTable = new sql.Table();
  idTable.columns.add('ID', sql.Int);
  chiTietIDsToDelete.forEach((id) => idTable.rows.add(id));

  const query = `DELETE FROM YcMuonPhongChiTiet WHERE YcMuonPhongCtID IN (SELECT ID FROM @IdTable);`;
  const request = transaction.request();
  request.input('IdTable', idTable);
  await request.query(query);
};

/**
 * Cập nhật các trường thông tin chung của YeuCauMuonPhong (header).
 * @param {number} ycMuonPhongID
 * @param {object} data - { ghiChuChungYc }
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const updateYeuCauMuonPhongHeaderInfo = async (
  ycMuonPhongID,
  data,
  transaction
) => {
  const setClauses = [];
  const params = [
    { name: 'YcMuonPhongID', type: sql.Int, value: ycMuonPhongID },
  ];

  if (data.ghiChuChungYc !== undefined) {
    setClauses.push('GhiChuChungYc = @GhiChuChungYc');
    params.push({
      name: 'GhiChuChungYc',
      type: sql.NVarChar(sql.MAX),
      value: data.ghiChuChungYc,
    });
  }

  if (setClauses.length === 0) {
    return; // Không có gì để cập nhật
  }

  const query = `
    UPDATE YeuCauMuonPhong
    SET ${setClauses.join(', ')}
    WHERE YcMuonPhongID = @YcMuonPhongID;
  `;

  const request = transaction.request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  await request.query(query);
};

/**
 * Lấy tất cả các bản ghi YcMuonPhongChiTiet thuộc một YeuCauMuonPhong (header).
 * @param {number} ycMuonPhongID
 * @param {sql.Transaction} transaction
 * @returns {Promise<Array<object>>} Mảng các chi tiết yêu cầu
 */
const getAllChiTietByHeaderID = async (ycMuonPhongID, transaction) => {
  // Lấy thêm TrangThaiCtID để kiểm tra xem có được phép sửa/xóa không
  const query = `
        SELECT YcMuonPhongCtID, TrangThaiCtID, tt.MaTrangThai
        FROM YcMuonPhongChiTiet
        JOIN TrangThaiYeuCauPhong tt ON YcMuonPhongChiTiet.TrangThaiCtID = tt.TrangThaiYcpID
        WHERE YcMuonPhongID = @YcMuonPhongID;
    `;
  const params = [
    { name: 'YcMuonPhongID', type: sql.Int, value: ycMuonPhongID },
  ];
  const request = transaction.request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset;
};

export const yeuCauMuonPhongRepository = {
  getYeuCauMuonPhongListWithPagination,
  getYeuCauMuonPhongDetailById,
  getSuKienTrangThai,
  createYeuCauMuonPhongHeader,
  createYcMuonPhongDetail,
  getYcMuonPhongChiTietForProcessing,
  checkPhongAvailability,
  createChiTietDatPhong,
  updateYcMuonPhongChiTietStatus,
  updateYcMuonPhongChiTietRecord,
  countYcMuonPhongChiTietStatuses,
  updateYeuCauMuonPhongHeaderStatus,
  checkPhongExists,
  getYeuCauMuonPhongHeaderForCancel,
  updateAllChiTietOfYeuCauToHuy,
  findYeuCauPhongChoCSVCQuaHan,
  findSuKienQuaHanXepPhongDeHuy,
  updateYeuCauMuonPhongHeaderStatusForAutoCancel,
  getChiTietDatPhongBySuKienID,
  deleteYcMuonPhongChiTietByIds,
  updateYeuCauMuonPhongHeaderInfo,
  getAllChiTietByHeaderID,
};

// Lưu ý quan trọng:
// Phân quyền xem (getYeuCauMuonPhongsService): Logic phân quyền hiện tại khá đơn giản (Admin/CSVC thấy hết, người khác chỉ thấy của mình). Bạn cần mở rộng logic này để Trưởng Khoa/CLB/Bí thư Đoàn có thể xem các yêu cầu liên quan đến đơn vị của họ. Điều này đòi hỏi phải lấy được các DonViID mà người dùng đó quản lý và thêm vào điều kiện WHERE của query.
// Logic lấy donViYeuCau: Trong getYeuCauMuonPhongListWithPagination và getYeuCauMuonPhongDetailById, cách lấy thông tin đơn vị của người yêu cầu (dv_nguoi_yc) đang dựa trên giả định họ là Giảng viên hoặc Cán bộ có vai trò CB_TO_CHUC_SU_KIEN được gán cho một đơn vị. Bạn cần xem xét kỹ và điều chỉnh cho phù hợp với cách bạn quản lý "đơn vị chính" của người dùng.
// Hiệu năng Query: Câu query lấy danh sách yêu cầu mượn phòng có nhiều JOIN và subquery. Với lượng dữ liệu lớn, bạn cần kiểm tra và tối ưu hóa (ví dụ: đảm bảo có index trên các cột khóa ngoại và các cột dùng trong WHERE, ORDER BY).

// Lưu ý quan trọng trong Repository:
// Logic lấy dv_nguoi_yc (Đơn vị của người yêu cầu): Phần này khá phức tạp vì người yêu cầu có thể là Giảng viên (lấy DonViCongTacID) hoặc Cán bộ được gán vai trò CB_TO_CHUC_SU_KIEN cho một DonViThucThiID. Tôi đã dùng CROSS APPLY với UNION ALL và priority để ưu tiên lấy đơn vị từ vai trò chức năng trước. Bạn cần kiểm tra kỹ logic này với cấu trúc dữ liệu và quy tắc nghiệp vụ của mình.
// SoLuongChiTietDaXepPhong: Subquery này đếm số phòng khác nhau đã được xếp cho các chi tiết của yêu cầu header.
// getYeuCauMuonPhongDetailById:
// Thực hiện 2 query: 1 cho header, 1 cho tất cả các detail và phòng được cấp.
// Sau đó gom nhóm các phongDuocCap cho mỗi YcMuonPhongChiTiet ở tầng ứng dụng (JavaScript).

// FROM YeuCauMuonPhong yc
// JOIN SuKien sk ON yc.SuKienID = sk.SuKienID
// JOIN NguoiDung nd_yc ON yc.NguoiYeuCauID = nd_yc.NguoiDungID
// JOIN TrangThaiYeuCauPhong tt_yc ON yc.TrangThaiChungID = tt_yc.TrangThaiYcpID AND tt_yc.LoaiApDung = 'CHUNG'
// LEFT JOIN ThongTinGiangVien tgv_yc ON nd_yc.NguoiDungID = tgv_yc.NguoiDungID
// LEFT JOIN DonVi dv_tgv_yc ON tgv_yc.DonViCongTacID = dv_tgv_yc.DonViID

// -- ✅ Đổi sang OUTER APPLY để được phép dùng alias nd_yc.NguoiDungID
// OUTER APPLY (
//     SELECT TOP 1
//         ndvt_inner.NguoiDungID,
//         ndvt_inner.DonViID,
//         ndvt_inner.VaiTroID AS VaiTroID_ndvt,
//         ndvt_inner.NgayBatDau,
//         ndvt_inner.NgayKetThuc,
//         vt_inner.VaiTroID AS VaiTroID_vt,
//         vt_inner.MaVaiTro,
//         vt_inner.TenVaiTro
//     FROM NguoiDung_VaiTro ndvt_inner
//     JOIN VaiTroHeThong vt_inner ON ndvt_inner.VaiTroID = vt_inner.VaiTroID
//     WHERE ndvt_inner.NguoiDungID = nd_yc.NguoiDungID
//       AND vt_inner.MaVaiTro = 'CB_TO_CHUC_SU_KIEN'
//       AND (ndvt_inner.NgayKetThuc IS NULL OR ndvt_inner.NgayKetThuc >= GETDATE())
//     ORDER BY ndvt_inner.NgayBatDau DESC
// ) AS ndvt_yc

// LEFT JOIN DonVi dv_ndvt_yc ON ndvt_yc.DonViID = dv_ndvt_yc.DonViID

// OUTER APPLY (
//     SELECT TOP 1 DonViID_src AS DonViID, TenDonVi_src AS TenDonVi, MaDonVi_src AS MaDonVi, LoaiDonVi_src AS LoaiDonVi
//     FROM (
//         -- Ưu tiên đơn vị từ vai trò được gán
//         SELECT
//             ndvt_yc.DonViID AS DonViID_src,
//             dv_ndvt_yc.TenDonVi AS TenDonVi_src,
//             dv_ndvt_yc.MaDonVi AS MaDonVi_src,
//             dv_ndvt_yc.LoaiDonVi AS LoaiDonVi_src,
//             1 AS priority
//         WHERE ndvt_yc.DonViID IS NOT NULL

//         UNION ALL

//         -- Sau đó đến đơn vị công tác của giảng viên
//         SELECT
//             tgv_yc.DonViCongTacID AS DonViID_src,
//             dv_tgv_yc.TenDonVi AS TenDonVi_src,
//             dv_tgv_yc.MaDonVi AS MaDonVi_src,
//             dv_tgv_yc.LoaiDonVi AS LoaiDonVi_src,
//             2 AS priority
//         WHERE tgv_yc.DonViCongTacID IS NOT NULL
//     ) AS dv_src_ordered
//     ORDER BY priority ASC
// ) AS dv_nguoi_yc
