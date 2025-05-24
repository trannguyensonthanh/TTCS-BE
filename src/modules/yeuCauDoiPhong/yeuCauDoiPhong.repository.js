// src/modules/yeuCauDoiPhong/yeuCauDoiPhong.repository.js
import { executeQuery, getPool } from '../../utils/database.js';
import sql from 'mssql';
import MaTrangThaiYeuCauDoiPhong from '../../enums/maTrangThaiYeuCauDoiPhong.enum.js'; // Tạo enum này

/**
 * Lấy danh sách YeuCauDoiPhong với phân trang và bộ lọc
 */
const getYeuCauDoiPhongListWithPagination = async (params, currentUser) => {
  const {
    searchTerm,
    trangThaiYcDoiPhongMa,
    suKienID,
    nguoiYeuCauID,
    donViNguoiYeuCauID,
    phongCuID,
    phongMoiID,
    tuNgayYeuCau,
    denNgayYeuCau,
    page = 1,
    limit = 10,
    sortBy = 'ycdp.NgayYeuCauDoi',
    sortOrder = 'DESC',
  } = params;

  let selectFields = `
        ycdp.YcDoiPhongID,
        sk.SuKienID, sk.TenSK AS TenSuKien,
        nd_yc.NguoiDungID AS NguoiYeuCau_ID, nd_yc.HoTen AS NguoiYeuCau_HoTen,
        ycdp.NgayYeuCauDoi,
        p_cu.PhongID AS PhongCu_ID, p_cu.TenPhong AS PhongCu_TenPhong, p_cu.MaPhong AS PhongCu_MaPhong,
        p_cu.SucChua AS PhongCu_SucChua, p_cu.ViTri AS PhongCu_ViTri, -- Thêm SucChua, ViTri cho phòng cũ
        lp_cu.LoaiPhongID AS PhongCu_LoaiPhongID, lp_cu.TenLoaiPhong AS PhongCu_TenLoaiPhong, -- Thêm thông tin Loại Phòng cho phòng cũ
        cdp_cu.TgNhanPhongTT AS PhongCu_TgNhanPhongTT, -- <<<< THÊM CHO PHÒNG CŨ
        cdp_cu.TgTraPhongTT AS PhongCu_TgTraPhongTT,   -- <<<< THÊM CHO PHÒNG CŨ
        tt_ycdp.TrangThaiYcDoiPID AS TrangThaiYCDP_ID, tt_ycdp.MaTrangThai AS TrangThaiYCDP_Ma, tt_ycdp.TenTrangThai AS TrangThaiYCDP_Ten,
        SUBSTRING(ycdp.LyDoDoiPhong, 1, 100) AS LyDoDoiPhongNganGon
    `;
  let fromClause = `
        FROM YeuCauDoiPhong ycdp
        JOIN NguoiDung nd_yc ON ycdp.NguoiYeuCauID = nd_yc.NguoiDungID
        JOIN TrangThaiYeuCauDoiPhong tt_ycdp ON ycdp.TrangThaiYcDoiPID = tt_ycdp.TrangThaiYcDoiPID
        JOIN ChiTietDatPhong cdp_cu ON ycdp.DatPhongID_Cu = cdp_cu.DatPhongID
        JOIN Phong p_cu ON cdp_cu.PhongID = p_cu.PhongID
        JOIN LoaiPhong lp_cu ON p_cu.LoaiPhongID = lp_cu.LoaiPhongID 
        JOIN YcMuonPhongChiTiet yct_goc ON ycdp.YcMuonPhongCtID = yct_goc.YcMuonPhongCtID
        JOIN YeuCauMuonPhong yc_header_goc ON yct_goc.YcMuonPhongID = yc_header_goc.YcMuonPhongID
        JOIN SuKien sk ON yc_header_goc.SuKienID = sk.SuKienID
        LEFT JOIN DonVi dv_nguoi_yc ON 1=0 -- Sẽ join dựa trên logic đơn vị của người yêu cầu sau
    `;
  // Logic để join DonVi của người yêu cầu (phức tạp hơn, cần biết NguoiYeuCauID là GV hay NV)
  // Tạm thời để LEFT JOIN 1=0 và sẽ không filter theo donViNguoiYeuCauID trực tiếp trong query này
  // mà có thể cần xử lý ở service hoặc query phức tạp hơn

  let whereClause = ` WHERE 1=1 `;
  const queryParams = [];

  // Phân quyền xem: ADMIN và CSVC thấy hết. CBTC chỉ thấy của mình.
  // if (!currentUser.roles.includes(MaVaiTro.ADMIN_HE_THONG) && !currentUser.roles.includes(MaVaiTro.QUAN_LY_CSVC)) {
  //     whereClause += ` AND ycdp.NguoiYeuCauID = @CurrentUserID `;
  //     queryParams.push({ name: 'CurrentUserID', type: sql.Int, value: currentUser.nguoiDungID });
  // }
  // Logic này sẽ được service quyết định và truyền nguoiYeuCauID vào params nếu cần.

  if (searchTerm) {
    whereClause += ` AND (sk.TenSK LIKE @SearchTerm OR nd_yc.HoTen LIKE @SearchTerm OR p_cu.TenPhong LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }
  if (trangThaiYcDoiPhongMa) {
    whereClause += ` AND tt_ycdp.MaTrangThai = @TrangThaiYcDoiPhongMa `;
    queryParams.push({
      name: 'TrangThaiYcDoiPhongMa',
      type: sql.VarChar,
      value: trangThaiYcDoiPhongMa,
    });
  }
  if (suKienID) {
    whereClause += ` AND sk.SuKienID = @SuKienID `;
    queryParams.push({ name: 'SuKienID', type: sql.Int, value: suKienID });
  }
  if (nguoiYeuCauID) {
    // Thường dùng cho CBTC xem YC của mình, hoặc Admin/CSVC lọc
    whereClause += ` AND ycdp.NguoiYeuCauID = @NguoiYeuCauID `;
    queryParams.push({
      name: 'NguoiYeuCauID',
      type: sql.Int,
      value: nguoiYeuCauID,
    });
  }
  if (phongCuID) {
    whereClause += ` AND p_cu.PhongID = @PhongCuID `;
    queryParams.push({ name: 'PhongCuID', type: sql.Int, value: phongCuID });
  }
  if (phongMoiID) {
    fromClause += ` JOIN ChiTietDatPhong cdp_moi ON ycdp.DatPhongID_Moi = cdp_moi.DatPhongID
                        JOIN Phong p_moi ON cdp_moi.PhongID = p_moi.PhongID `;
    whereClause += ` AND p_moi.PhongID = @PhongMoiID `;
    queryParams.push({ name: 'PhongMoiID', type: sql.Int, value: phongMoiID });
  }
  if (tuNgayYeuCau) {
    whereClause += ` AND ycdp.NgayYeuCauDoi >= @TuNgayYeuCau `;
    queryParams.push({
      name: 'TuNgayYeuCau',
      type: sql.Date,
      value: tuNgayYeuCau,
    });
  }
  if (denNgayYeuCau) {
    const denNgayEnd = new Date(denNgayYeuCau);
    denNgayEnd.setDate(denNgayEnd.getDate() + 1);
    whereClause += ` AND ycdp.NgayYeuCauDoi < @DenNgayYeuCau `;
    queryParams.push({
      name: 'DenNgayYeuCau',
      type: sql.Date,
      value: denNgayEnd.toISOString().split('T')[0],
    });
  }
  if (donViNguoiYeuCauID) {
    // Logic lọc theo donViNguoiYeuCauID cần join phức tạp hơn để xác định đơn vị của NguoiYeuCauID
    // Ví dụ: JOIN ThongTinGiangVien hoặc NguoiDung_VaiTro
    // Tạm thời bỏ qua để đơn giản hóa, bạn có thể thêm logic này nếu cần thiết.
    console.warn(
      'Lọc theo donViNguoiYeuCauID chưa được triển khai chi tiết trong query này.'
    );
  }

  const countQuery = `SELECT COUNT(DISTINCT ycdp.YcDoiPhongID) AS TotalItems ${fromClause} ${whereClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = [
    'ycdp.NgayYeuCauDoi',
    'sk.TenSK',
    'nd_yc.HoTen',
    'p_cu.TenPhong',
  ];
  const safeSortBy = allowedSortBy.includes(sortBy)
    ? sortBy
    : 'ycdp.NgayYeuCauDoi';
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
  const items = itemsResult.recordset.map((row) => ({
    ycDoiPhongID: row.YcDoiPhongID,
    suKien: {
      suKienID: row.SuKienID,
      tenSK: row.TenSuKien,
    },
    nguoiYeuCau: {
      nguoiDungID: row.NguoiYeuCau_ID,
      hoTen: row.NguoiYeuCau_HoTen,
    },
    ngayYeuCauDoi: row.NgayYeuCauDoi.toISOString(),
    phongHienTai: {
      // <<<< CẬP NHẬT ĐỂ KHỚP PhongResponseMin
      phongID: row.PhongCu_ID,
      tenPhong: row.PhongCu_TenPhong,
      maPhong: row.PhongCu_MaPhong,
      sucChua: row.PhongCu_SucChua,
      viTri: row.PhongCu_ViTri,
      loaiPhong: row.PhongCu_LoaiPhongID
        ? {
            loaiPhongID: row.PhongCu_LoaiPhongID,
            tenLoaiPhong: row.PhongCu_TenLoaiPhong,
          }
        : null,
      tgNhanPhongTT: row.PhongCu_TgNhanPhongTT
        ? row.PhongCu_TgNhanPhongTT.toISOString()
        : null, // <<<< MAP CHO PHÒNG CŨ
      tgTraPhongTT: row.PhongCu_TgTraPhongTT
        ? row.PhongCu_TgTraPhongTT.toISOString()
        : null, // <<<< MAP CHO PHÒNG CŨ
    },
    trangThaiYeuCauDoiPhong: {
      trangThaiYcDoiPID: row.TrangThaiYCDP_ID,
      maTrangThai: row.TrangThaiYCDP_Ma,
      tenTrangThai: row.TrangThaiYCDP_Ten,
    },
    lyDoDoiPhongNganGon: row.LyDoDoiPhongNganGon,
  }));
  return { items, totalItems };
};

const getYeuCauDoiPhongDetailById = async (ycDoiPhongID) => {
  const query = `
    SELECT
        ycdp.*, 
        sk.SuKienID, sk.TenSK AS TenSuKien,
        nd_yc.NguoiDungID AS NguoiYeuCau_ID, nd_yc.HoTen AS NguoiYeuCau_HoTen, nd_yc.Email AS NguoiYeuCau_Email,
        
        p_cu.PhongID AS PhongCu_ID, p_cu.TenPhong AS PhongCu_TenPhong, p_cu.MaPhong AS PhongCu_MaPhong, 
        p_cu.SucChua AS PhongCu_SucChua, p_cu.ViTri AS PhongCu_ViTri, -- Thêm cho phòng cũ
        lp_cu.LoaiPhongID AS PhongCu_LoaiPhongID, lp_cu.TenLoaiPhong AS PhongCu_TenLoaiPhong, -- Loại phòng cho phòng cũ
        cdp_cu.TgNhanPhongTT AS PhongCu_TgNhanPhongTT, -- <<<< Lấy từ cdp_cu
        cdp_cu.TgTraPhongTT AS PhongCu_TgTraPhongTT,   -- <<<< Lấy từ cdp_cu
        tt_ycdp.MaTrangThai AS TrangThaiYCDP_Ma, tt_ycdp.TenTrangThai AS TrangThaiYCDP_Ten,
        
        lp_moi_yc.LoaiPhongID AS YcPhongMoi_LoaiPhongID_val, lp_moi_yc.TenLoaiPhong AS YcPhongMoi_TenLoaiPhong_val, -- Đổi tên alias để tránh trùng
        
        p_moi.PhongID AS PhongMoi_ID, p_moi.TenPhong AS PhongMoi_TenPhong, p_moi.MaPhong AS PhongMoi_MaPhong,
        p_moi.SucChua AS PhongMoi_SucChua, p_moi.ViTri AS PhongMoi_ViTri, -- Thêm cho phòng mới
        lp_moi.LoaiPhongID AS PhongMoi_LoaiPhongID, lp_moi.TenLoaiPhong AS PhongMoi_TenLoaiPhong, -- Loại phòng cho phòng mới
        cdp_moi.TgNhanPhongTT AS PhongMoi_TgNhanPhongTT, 
        cdp_moi.TgTraPhongTT AS PhongMoi_TgTraPhongTT,   
        nd_duyet.NguoiDungID AS NguoiDuyetCSVC_ID, nd_duyet.HoTen AS NguoiDuyetCSVC_HoTen, nd_duyet.Email AS NguoiDuyetCSVC_Email
    FROM YeuCauDoiPhong ycdp
    JOIN NguoiDung nd_yc ON ycdp.NguoiYeuCauID = nd_yc.NguoiDungID
    JOIN TrangThaiYeuCauDoiPhong tt_ycdp ON ycdp.TrangThaiYcDoiPID = tt_ycdp.TrangThaiYcDoiPID
    JOIN ChiTietDatPhong cdp_cu ON ycdp.DatPhongID_Cu = cdp_cu.DatPhongID
    JOIN Phong p_cu ON cdp_cu.PhongID = p_cu.PhongID
    JOIN LoaiPhong lp_cu ON p_cu.LoaiPhongID = lp_cu.LoaiPhongID -- Join loại phòng cho phòng cũ
    JOIN YcMuonPhongChiTiet yct_goc ON ycdp.YcMuonPhongCtID = yct_goc.YcMuonPhongCtID
    JOIN YeuCauMuonPhong yc_header_goc ON yct_goc.YcMuonPhongID = yc_header_goc.YcMuonPhongID
    JOIN SuKien sk ON yc_header_goc.SuKienID = sk.SuKienID
    LEFT JOIN LoaiPhong lp_moi_yc ON ycdp.YcPhongMoi_LoaiID = lp_moi_yc.LoaiPhongID
    LEFT JOIN ChiTietDatPhong cdp_moi ON ycdp.DatPhongID_Moi = cdp_moi.DatPhongID
    LEFT JOIN Phong p_moi ON cdp_moi.PhongID = p_moi.PhongID
    LEFT JOIN LoaiPhong lp_moi ON p_moi.LoaiPhongID = lp_moi.LoaiPhongID -- Join loại phòng cho phòng mới
    LEFT JOIN NguoiDung nd_duyet ON ycdp.NguoiDuyetCSVCID = nd_duyet.NguoiDungID
    WHERE ycdp.YcDoiPhongID = @YcDoiPhongID;
  `;
  const params = [{ name: 'YcDoiPhongID', type: sql.Int, value: ycDoiPhongID }];
  const result = await executeQuery(query, params);
  if (result.recordset.length === 0) return null;

  const row = result.recordset[0];
  return {
    ycDoiPhongID: row.YcDoiPhongID,
    suKien: { suKienID: row.SuKienID, tenSK: row.TenSuKien },
    nguoiYeuCau: {
      nguoiDungID: row.NguoiYeuCau_ID,
      hoTen: row.NguoiYeuCau_HoTen,
      email: row.NguoiYeuCau_Email,
    },
    ngayYeuCauDoi: row.NgayYeuCauDoi.toISOString(),
    phongHienTai: {
      phongID: row.PhongCu_ID,
      tenPhong: row.PhongCu_TenPhong,
      maPhong: row.PhongCu_MaPhong,
      sucChua: row.PhongCu_SucChua,
      viTri: row.PhongCu_ViTri,
      loaiPhong: row.PhongCu_LoaiPhongID
        ? {
            loaiPhongID: row.PhongCu_LoaiPhongID,
            tenLoaiPhong: row.PhongCu_TenLoaiPhong,
          }
        : null,
    },
    tgNhanPhongTT: row.PhongCu_TgNhanPhongTT
      ? row.PhongCu_TgNhanPhongTT.toISOString()
      : null, // <<<< MAP
    tgTraPhongTT: row.PhongCu_TgTraPhongTT
      ? row.PhongCu_TgTraPhongTT.toISOString()
      : null, // <<<< MAP
    trangThaiYeuCauDoiPhong: {
      trangThaiYcDoiPID: row.TrangThaiYcDoiPID,
      maTrangThai: row.TrangThaiYCDP_Ma,
      tenTrangThai: row.TrangThaiYCDP_Ten,
    },
    lyDoDoiPhongNganGon: row.LyDoDoiPhong
      ? row.LyDoDoiPhong.substring(0, 100)
      : null,
    // Chi tiết thêm
    ycMuonPhongCtID: row.YcMuonPhongCtID,
    lyDoDoiPhong: row.LyDoDoiPhong,
    ycPhongMoi_LoaiPhong: row.YcPhongMoi_LoaiPhongID_val
      ? {
          // Sử dụng alias mới
          loaiPhongID: row.YcPhongMoi_LoaiPhongID_val,
          tenLoaiPhong: row.YcPhongMoi_TenLoaiPhong_val,
        }
      : null,
    ycPhongMoi_SucChua: row.YcPhongMoi_SucChua,
    ycPhongMoi_ThietBi: row.YcPhongMoi_ThietBi,
    phongMoiDuocCap: row.PhongMoi_ID
      ? {
          // <<<< CẬP NHẬT ĐỂ KHỚP PhongResponseMin
          phongID: row.PhongMoi_ID,
          tenPhong: row.PhongMoi_TenPhong,
          maPhong: row.PhongMoi_MaPhong,
          sucChua: row.PhongMoi_SucChua,
          viTri: row.PhongMoi_ViTri,
          loaiPhong: row.PhongMoi_LoaiPhongID
            ? {
                loaiPhongID: row.PhongMoi_LoaiPhongID,
                tenLoaiPhong: row.PhongMoi_TenLoaiPhong,
              }
            : null,
        }
      : null,
    tgNhanPhongTT: row.PhongMoi_TgNhanPhongTT
      ? row.PhongMoi_TgNhanPhongTT.toISOString()
      : null, // <<<< MAP
    tgTraPhongTT: row.PhongMoi_TgTraPhongTT
      ? row.PhongMoi_TgTraPhongTT.toISOString()
      : null, // <<<< MAP
    nguoiDuyetCSVC: row.NguoiDuyetCSVC_ID
      ? {
          nguoiDungID: row.NguoiDuyetCSVC_ID,
          hoTen: row.NguoiDuyetCSVC_HoTen,
          email: row.NguoiDuyetCSVC_Email,
        }
      : null,
    ngayDuyetCSVC: row.NgayDuyetCSVC ? row.NgayDuyetCSVC.toISOString() : null,
    lyDoTuChoiDoiCSVC: row.LyDoTuChoiDoiCSVC,
  };
};

/**
 * Kiểm tra ChiTietDatPhong có tồn tại và thuộc về YcMuonPhongChiTiet không,
 * và YcMuonPhongChiTiet có thuộc về người dùng không (thông qua SuKien.NguoiTaoID).
 * Đồng thời lấy SuKienID.
 * @param {number} ycMuonPhongCtID
 * @param {number} datPhongID_Cu
 * @param {number} nguoiYeuCauID
 * @returns {Promise<object|null>} { SuKienID, YcMuonPhongCtID, DatPhongID_Cu_Valid: boolean, SuKienNguoiTaoID: number, TgMuonDkCuaChiTiet: Date, TgTraDkCuaChiTiet: Date }
 */
const validateYcĐoiPhongPreRequisites = async (
  ycMuonPhongCtID,
  datPhongID_Cu,
  nguoiYeuCauID
) => {
  const query = `
    SELECT
        sk.SuKienID,
        yct.YcMuonPhongCtID,
        cdp.DatPhongID AS DatPhongID_Cu_Result,
        sk.NguoiTaoID AS SuKienNguoiTaoID, -- Người tạo sự kiện gốc
        yc.NguoiYeuCauID AS YeuCauPhongNguoiTaoID, -- Người tạo yêu cầu phòng
        yct.TgMuonDk AS TgMuonDkCuaChiTiet,
        yct.TgTraDk AS TgTraDkCuaChiTiet
    FROM YcMuonPhongChiTiet yct
    JOIN ChiTietDatPhong cdp ON yct.YcMuonPhongCtID = cdp.YcMuonPhongCtID AND cdp.DatPhongID = @DatPhongID_Cu
    JOIN YeuCauMuonPhong yc ON yct.YcMuonPhongID = yc.YcMuonPhongID
    JOIN SuKien sk ON yc.SuKienID = sk.SuKienID
    WHERE yct.YcMuonPhongCtID = @YcMuonPhongCtID
    -- AND yc.NguoiYeuCauID = @NguoiYeuCauID; -- Kiểm tra người tạo yêu cầu phòng gốc có phải là người đang yêu cầu đổi không
    -- Hoặc kiểm tra người tạo SỰ KIỆN gốc
    -- AND sk.NguoiTaoID = @NguoiYeuCauID;
    -- Logic quyền sẽ được xử lý ở service dựa trên vai trò CB_TO_CHUC_SU_KIEN của đơn vị chủ trì sự kiện
  `;
  const params = [
    { name: 'YcMuonPhongCtID', type: sql.Int, value: ycMuonPhongCtID },
    { name: 'DatPhongID_Cu', type: sql.Int, value: datPhongID_Cu },
    // { name: 'NguoiYeuCauID', type: sql.Int, value: nguoiYeuCauID } // Có thể không cần check ở đây, service sẽ check
  ];
  const result = await executeQuery(query, params);
  if (result.recordset.length > 0) {
    const row = result.recordset[0];
    return {
      suKienID: row.SuKienID,
      ycMuonPhongCtID: row.YcMuonPhongCtID,
      datPhongID_Cu_Valid: row.DatPhongID_Cu_Result === datPhongID_Cu,
      suKienNguoiTaoID: row.SuKienNguoiTaoID,
      yeuCauPhongNguoiTaoID: row.YeuCauPhongNguoiTaoID,
      tgMuonDkCuaChiTiet: row.TgMuonDkCuaChiTiet,
      tgTraDkCuaChiTiet: row.TgTraDkCuaChiTiet,
    };
  }
  return null;
};

/**
 * Tạo mới một YeuCauDoiPhong
 * @param {object} data - CreateYeuCauDoiPhongPayload & { NguoiYeuCauID, TrangThaiYcDoiPID }
 * @returns {Promise<number>} YcDoiPhongID vừa tạo
 */
const createYeuCauDoiPhongRecord = async (data) => {
  const query = `
    INSERT INTO YeuCauDoiPhong (
        YcMuonPhongCtID, DatPhongID_Cu, NguoiYeuCauID, NgayYeuCauDoi,
        LyDoDoiPhong, YcPhongMoi_LoaiID, YcPhongMoi_SucChua, YcPhongMoi_ThietBi,
        TrangThaiYcDoiPID
    )
    OUTPUT inserted.YcDoiPhongID
    VALUES (
        @YcMuonPhongCtID, @DatPhongID_Cu, @NguoiYeuCauID, GETDATE(),
        @LyDoDoiPhong, @YcPhongMoi_LoaiID, @YcPhongMoi_SucChua, @YcPhongMoi_ThietBi,
        @TrangThaiYcDoiPID
    );
  `;
  const params = [
    { name: 'YcMuonPhongCtID', type: sql.Int, value: data.ycMuonPhongCtID },
    { name: 'DatPhongID_Cu', type: sql.Int, value: data.datPhongID_Cu },
    { name: 'NguoiYeuCauID', type: sql.Int, value: data.nguoiYeuCauID },
    {
      name: 'LyDoDoiPhong',
      type: sql.NVarChar(sql.MAX),
      value: data.lyDoDoiPhong,
    },
    { name: 'YcPhongMoi_LoaiID', type: sql.Int, value: data.ycPhongMoi_LoaiID },
    {
      name: 'YcPhongMoi_SucChua',
      type: sql.Int,
      value: data.ycPhongMoi_SucChua,
    },
    {
      name: 'YcPhongMoi_ThietBi',
      type: sql.NVarChar(sql.MAX),
      value: data.ycPhongMoi_ThietBi,
    },
    { name: 'TrangThaiYcDoiPID', type: sql.Int, value: data.trangThaiYcDoiPID },
  ];
  const result = await executeQuery(query, params);
  return result.recordset[0].YcDoiPhongID;
};

/**
 * Lấy thông tin chi tiết của YeuCauDoiPhong để CSVC xử lý
 * @param {number} ycDoiPhongID
 * @param {sql.Transaction} transaction
 * @returns {Promise<object|null>}
 */
const getYeuCauDoiPhongForProcessing = async (ycDoiPhongID, transaction) => {
  const query = `
    SELECT
        ycdp.*, -- Lấy tất cả từ YeuCauDoiPhong
        tt_ycdp.MaTrangThai AS MaTrangThaiHienTai,
        yct_goc.TgMuonDk AS TgMuonDkGoc,
        yct_goc.TgTraDk AS TgTraDkGoc,
        cdp_cu.PhongID AS PhongID_Cu,
        yc_header_goc.SuKienID,
        yc_header_goc.NguoiYeuCauID AS NguoiTaoYeuCauPhongGocID -- Người tạo YC phòng gốc
    FROM YeuCauDoiPhong ycdp
    JOIN TrangThaiYeuCauDoiPhong tt_ycdp ON ycdp.TrangThaiYcDoiPID = tt_ycdp.TrangThaiYcDoiPID
    JOIN YcMuonPhongChiTiet yct_goc ON ycdp.YcMuonPhongCtID = yct_goc.YcMuonPhongCtID
    JOIN ChiTietDatPhong cdp_cu ON ycdp.DatPhongID_Cu = cdp_cu.DatPhongID
    JOIN YeuCauMuonPhong yc_header_goc ON yct_goc.YcMuonPhongID = yc_header_goc.YcMuonPhongID
    WHERE ycdp.YcDoiPhongID = @YcDoiPhongID;
  `;
  const params = [{ name: 'YcDoiPhongID', type: sql.Int, value: ycDoiPhongID }];
  const request = transaction.request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Cập nhật YeuCauDoiPhong sau khi CSVC xử lý
 * @param {number} ycDoiPhongID
 * @param {number} trangThaiMoiID
 * @param {number|null} datPhongIDMoi (ID của ChiTietDatPhong mới nếu duyệt)
 * @param {number} nguoiDuyetCSVCID
 * @param {string|null} lyDoTuChoi
 * @param {string|null} ghiChuCSVC
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const updateYeuCauDoiPhongAfterProcessing = async (
  ycDoiPhongID,
  trangThaiMoiID,
  datPhongIDMoi,
  nguoiDuyetCSVCID,
  lyDoTuChoi,
  ghiChuCSVC,
  transaction
) => {
  const query = `
    UPDATE YeuCauDoiPhong
    SET TrangThaiYcDoiPID = @TrangThaiMoiID,
        DatPhongID_Moi = @DatPhongIDMoi,
        NguoiDuyetCSVCID = @NguoiDuyetCSVCID,
        NgayDuyetCSVC = GETDATE(),
        LyDoTuChoiDoiCSVC = @LyDoTuChoi,
        GhiChuCSVC = @GhiChuCSVC -- Giả sử có cột này trong YeuCauDoiPhong để CSVC ghi chú thêm khi duyệt
    WHERE YcDoiPhongID = @YcDoiPhongID;
  `;
  const params = [
    { name: 'TrangThaiMoiID', type: sql.Int, value: trangThaiMoiID },
    { name: 'DatPhongIDMoi', type: sql.Int, value: datPhongIDMoi },
    { name: 'NguoiDuyetCSVCID', type: sql.Int, value: nguoiDuyetCSVCID },
    { name: 'LyDoTuChoi', type: sql.NVarChar(sql.MAX), value: lyDoTuChoi },
    { name: 'GhiChuCSVC', type: sql.NVarChar(sql.MAX), value: ghiChuCSVC },
    { name: 'YcDoiPhongID', type: sql.Int, value: ycDoiPhongID },
  ];
  const request = transaction.request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  await request.query(query);
};

/**
 * "Giải phóng" phòng cũ trong ChiTietDatPhong bằng cách cập nhật nó
 * Ví dụ: có thể set PhongID = NULL hoặc tạo một trạng thái "Đã đổi" cho ChiTietDatPhong
 * Hoặc đơn giản là xóa bản ghi ChiTietDatPhong cũ nếu nó không còn ý nghĩa.
 * Tạm thời, chúng ta sẽ không xóa mà chỉ ghi nhận là YeuCauDoiPhong đã xử lý phòng này.
 * Nếu cần giải phóng thực sự, có thể cần logic phức tạp hơn (ví dụ, kiểm tra xem phòng đó có được dùng bởi YC chi tiết khác không).
 * Trong trường hợp này, khi duyệt đổi phòng, bản ghi ChiTietDatPhong cũ (DatPhongID_Cu) không còn hợp lệ cho YcMuonPhongCtID đó nữa.
 * Một cách là cập nhật YcMuonPhongCtID của bản ghi ChiTietDatPhong cũ thành NULL hoặc một giá trị đặc biệt
 * Hoặc đơn giản hơn, khi hiển thị phòng của YcMuonPhongCtID, chỉ lấy phòng từ DatPhongID_Moi của YeuCauDoiPhong đã duyệt.
 *
 * Cách tiếp cận đơn giản: không làm gì với ChiTietDatPhong cũ ở đây.
 * Khi lấy thông tin phòng cho YcMuonPhongCtID, sẽ ưu tiên lấy từ YeuCauDoiPhong.DatPhongID_Moi nếu có và đã duyệt.
 *
 * Nếu muốn đánh dấu ChiTietDatPhong cũ là không còn sử dụng cho YCCT này nữa:
 */
const markChiTietDatPhongCuAsChanged = async (datPhongIDCu, transaction) => {
  // Cách 1: Thêm một cột IsActive hoặc Status vào ChiTietDatPhong
  // UPDATE ChiTietDatPhong SET IsActive = 0 WHERE DatPhongID = @DatPhongIDCu
  // Cách 2: Xóa nếu chắc chắn không ảnh hưởng
  // DELETE FROM ChiTietDatPhong WHERE DatPhongID = @DatPhongIDCu
  // Hiện tại, chúng ta chưa có cơ chế này, để đơn giản, không thực hiện hành động trực tiếp lên ChiTietDatPhong cũ.
  // Logic hiển thị phòng sẽ phải dựa vào YeuCauDoiPhong được duyệt.
  console.log(
    `TODO: Logic to handle old room booking (DatPhongID: ${datPhongIDCu}) after change approved. For now, no direct action on ChiTietDatPhong.`
  );
};

/**
 * Lấy thông tin YeuCauDoiPhong để kiểm tra trước khi người dùng hủy
 * @param {number} ycDoiPhongID
 * @returns {Promise<object|null>} { YcDoiPhongID, NguoiYeuCauID, MaTrangThaiHienTai, SuKienID }
 */
const getYeuCauDoiPhongForUserCancel = async (ycDoiPhongID) => {
  const query = `
    SELECT
        ycdp.YcDoiPhongID,
        ycdp.NguoiYeuCauID,
        tt_ycdp.MaTrangThai AS MaTrangThaiHienTai,
        yc_header_goc.SuKienID -- Lấy SuKienID để có thể lấy chi tiết sự kiện cho thông báo
    FROM YeuCauDoiPhong ycdp
    JOIN TrangThaiYeuCauDoiPhong tt_ycdp ON ycdp.TrangThaiYcDoiPID = tt_ycdp.TrangThaiYcDoiPID
    JOIN YcMuonPhongChiTiet yct_goc ON ycdp.YcMuonPhongCtID = yct_goc.YcMuonPhongCtID
    JOIN YeuCauMuonPhong yc_header_goc ON yct_goc.YcMuonPhongID = yc_header_goc.YcMuonPhongID
    WHERE ycdp.YcDoiPhongID = @YcDoiPhongID;
  `;
  const params = [{ name: 'YcDoiPhongID', type: sql.Int, value: ycDoiPhongID }];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Cập nhật trạng thái của YeuCauDoiPhong thành đã hủy bởi người tạo
 * @param {number} ycDoiPhongID
 * @param {number} trangThaiDaHuyID
 * @param {sql.Transaction} [transaction=null] - Optional transaction
 * @returns {Promise<void>}
 */
const updateUserCancelYeuCauDoiPhong = async (
  ycDoiPhongID,
  trangThaiDaHuyID,
  transaction = null
) => {
  const query = `
    UPDATE YeuCauDoiPhong
    SET TrangThaiYcDoiPID = @TrangThaiDaHuyID
    -- Có thể thêm cột LyDoHuyNguoiTaoYCDP nếu muốn ghi lại lý do hủy từ người dùng
    WHERE YcDoiPhongID = @YcDoiPhongID;
  `;
  const params = [
    { name: 'TrangThaiDaHuyID', type: sql.Int, value: trangThaiDaHuyID },
    { name: 'YcDoiPhongID', type: sql.Int, value: ycDoiPhongID },
  ];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  await request.query(query);
};

export const yeuCauDoiPhongRepository = {
  getYeuCauDoiPhongListWithPagination,
  getYeuCauDoiPhongDetailById,
  validateYcĐoiPhongPreRequisites,
  createYeuCauDoiPhongRecord,
  getYeuCauDoiPhongForProcessing,
  updateYeuCauDoiPhongAfterProcessing,
  markChiTietDatPhongCuAsChanged,
  getYeuCauDoiPhongForUserCancel,
  updateUserCancelYeuCauDoiPhong,
};

// Lưu ý: Việc "giải phóng" phòng cũ (markChiTietDatPhongCuAsChanged) là một điểm cần cân nhắc kỹ. Cách đơn giản nhất là khi hiển thị phòng cho một YcMuonPhongCtID, hệ thống sẽ kiểm tra xem có YeuCauDoiPhong nào đã được duyệt cho chi tiết đó không, nếu có thì hiển thị phòng từ DatPhongID_Moi. Bản ghi ChiTietDatPhong cũ vẫn tồn tại nhưng không được coi là phòng hiện tại của chi tiết đó nữa.
