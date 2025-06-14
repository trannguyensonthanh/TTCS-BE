// src/modules/yeuCauHuySK/yeuCauHuySK.repository.js
import { executeQuery, getPool } from '../../utils/database.js';
import sql from 'mssql';
// Import các enums cần thiết
import MaTrangThaiSK from '../../enums/maTrangThaiSK.enum.js';
import MaTrangThaiYeuCauHuySK from '../../enums/maTrangThaiYeuCauHuySK.enum.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
/**
 * Tìm sự kiện theo ID để kiểm tra trạng thái và người tạo
 * @param {number} suKienID
 * @returns {Promise<object|null>}
 */
const findSuKienForCancellationRequest = async (suKienID) => {
  const query = `
    SELECT sk.SuKienID, sk.NguoiTaoID, ttsk.MaTrangThai AS MaTrangThaiHienTaiSK
    FROM SuKien sk
    JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
    WHERE sk.SuKienID = @SuKienID;
  `;
  const params = [{ name: 'SuKienID', type: sql.Int, value: suKienID }];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Kiểm tra xem có yêu cầu hủy nào đang chờ duyệt cho sự kiện này không
 * @param {number} suKienID
 * @returns {Promise<boolean>}
 */
const checkExistingPendingCancellationRequest = async (suKienID) => {
  const query = `
    SELECT TOP 1 YcHuySkID
    FROM YeuCauHuySK ych
    JOIN TrangThaiYeuCauHuySK ttyc ON ych.TrangThaiYcHuySkID = ttyc.TrangThaiYcHuySkID
    WHERE ych.SuKienID = @SuKienID AND ttyc.MaTrangThai = @MaTrangThaiChoDuyet;
  `;
  const params = [
    { name: 'SuKienID', type: sql.Int, value: suKienID },
    {
      name: 'MaTrangThaiChoDuyet',
      type: sql.VarChar,
      value: MaTrangThaiYeuCauHuySK.CHO_DUYET_HUY_BGH,
    },
  ];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0;
};

/**
 * Tạo mới một YeuCauHuySK
 * @param {number} suKienID
 * @param {number} nguoiYeuCauID
 * @param {string} lyDoHuy
 * @param {number} trangThaiYcHuySkID (ID của trạng thái 'CHO_DUYET_HUY_BGH')
 * @returns {Promise<object>} Thông tin YeuCauHuySK vừa tạo
 */
const createYeuCauHuySKRecord = async (
  suKienID,
  nguoiYeuCauID,
  lyDoHuy,
  trangThaiYcHuySkID
) => {
  const query = `
    INSERT INTO YeuCauHuySK (SuKienID, NguoiYeuCauID, LyDoHuy, TrangThaiYcHuySkID, NgayYeuCauHuy)
    OUTPUT inserted.YcHuySkID, inserted.SuKienID, inserted.NguoiYeuCauID, inserted.LyDoHuy, inserted.TrangThaiYcHuySkID, inserted.NgayYeuCauHuy
    VALUES (@SuKienID, @NguoiYeuCauID, @LyDoHuy, @TrangThaiYcHuySkID, GETDATE());
  `;
  const params = [
    { name: 'SuKienID', type: sql.Int, value: suKienID },
    { name: 'NguoiYeuCauID', type: sql.Int, value: nguoiYeuCauID },
    { name: 'LyDoHuy', type: sql.NVarChar, value: lyDoHuy },
    { name: 'TrangThaiYcHuySkID', type: sql.Int, value: trangThaiYcHuySkID },
  ];
  const result = await executeQuery(query, params);
  return result.recordset[0];
};

/**
 * Cập nhật TrangThaiSkID của SuKien
 * @param {number} suKienID
 * @param {number} trangThaiSkIDMoi
 * @returns {Promise<void>}
 */
const updateSuKienTrangThai = async (suKienID, trangThaiSkIDMoi) => {
  const query = `UPDATE SuKien SET TrangThaiSkID = @TrangThaiSkIDMoi WHERE SuKienID = @SuKienID;`;
  const params = [
    { name: 'TrangThaiSkIDMoi', type: sql.Int, value: trangThaiSkIDMoi },
    { name: 'SuKienID', type: sql.Int, value: suKienID },
  ];
  await executeQuery(query, params);
};

// Hàm lấy ID trạng thái từ mã (đã có trong suKien.repository.js, có thể dùng chung hoặc tạo lại ở đây)
const getTrangThaiIDByMa = async (
  maTrangThai,
  tenBangTrangThai,
  tenCotID,
  tenCotMa
) => {
  const query = `SELECT ${tenCotID} FROM ${tenBangTrangThai} WHERE ${tenCotMa} = @MaTrangThai;`;
  const params = [
    { name: 'MaTrangThai', type: sql.VarChar, value: maTrangThai },
  ];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0][tenCotID] : null;
};

/**
 * Lấy danh sách YeuCauHuySK với phân trang và bộ lọc
 */
const getYeuCauHuySKListWithPagination = async (params, currentUser) => {
  const {
    searchTerm,
    trangThaiYcHuySkMa,
    suKienID,
    nguoiYeuCauID,
    page = 1,
    limit = 10,
    sortBy = 'ych.NgayYeuCauHuy',
    sortOrder = 'DESC',
  } = params;

  let selectFields = `
        ych.YcHuySkID,
        sk.SuKienID, sk.TenSK AS TenSuKien, sk.TgBatDauDK,
        nd_yc.NguoiDungID AS NguoiYeuCau_ID, nd_yc.HoTen AS NguoiYeuCau_HoTen,
        -- Logic lấy đơn vị của người yêu cầu hủy (tương tự như trong yeuCauMuonPhong.repository.js)
        
        -- dv_nguoi_yc.DonViID AS DonViYeuCau_ID, dv_nguoi_yc.TenDonVi AS DonViYeuCau_TenDonVi, dv_nguoi_yc.MaDonVi AS DonViYeuCau_MaDonVi, dv_nguoi_yc.LoaiDonVi AS DonViYeuCau_LoaiDonVi,
        (SELECT TOP 1 d.DonViID FROM DonVi d JOIN ThongTinGiangVien tgv ON d.DonViID = tgv.DonViCongTacID WHERE tgv.NguoiDungID = nd_yc.NguoiDungID) AS DonViYeuCau_ID_GV,
        (SELECT TOP 1 d.TenDonVi FROM DonVi d JOIN ThongTinGiangVien tgv ON d.DonViID = tgv.DonViCongTacID WHERE tgv.NguoiDungID = nd_yc.NguoiDungID) AS DonViYeuCau_TenDonVi_GV,
        (SELECT TOP 1 d.MaDonVi FROM DonVi d JOIN ThongTinGiangVien tgv ON d.DonViID = tgv.DonViCongTacID WHERE tgv.NguoiDungID = nd_yc.NguoiDungID) AS DonViYeuCau_MaDonVi_GV,
        (SELECT TOP 1 d.LoaiDonVi FROM DonVi d JOIN ThongTinGiangVien tgv ON d.DonViID = tgv.DonViCongTacID WHERE tgv.NguoiDungID = nd_yc.NguoiDungID) AS DonViYeuCau_LoaiDonVi_GV,
        -- Tương tự cho nhân viên nếu có bảng ThongTinNhanVien hoặc lấy từ NguoiDung_VaiTro
        ych.NgayYeuCauHuy,
        SUBSTRING(ych.LyDoHuy, 1, 150) AS LyDoHuyNganGon,
        tt_ych.TrangThaiYcHuySkID AS TrangThaiYCHSK_ID, tt_ych.MaTrangThai AS TrangThaiYCHSK_Ma, tt_ych.TenTrangThai AS TrangThaiYCHSK_Ten,
        nd_duyet.NguoiDungID AS NguoiDuyetBGH_ID, nd_duyet.HoTen AS NguoiDuyetBGH_HoTen,
        ych.NgayDuyetHuyBGH
    `;
  let fromClause = `
        FROM YeuCauHuySK ych
        JOIN SuKien sk ON ych.SuKienID = sk.SuKienID
        JOIN NguoiDung nd_yc ON ych.NguoiYeuCauID = nd_yc.NguoiDungID
        JOIN TrangThaiYeuCauHuySK tt_ych ON ych.TrangThaiYcHuySkID = tt_ych.TrangThaiYcHuySkID
        LEFT JOIN NguoiDung nd_duyet ON ych.NguoiDuyetHuyBGHID = nd_duyet.NguoiDungID
    `;
  let whereClause = ` WHERE 1=1 `;
  const queryParams = [];

  // Phân quyền xem (logic sẽ ở service)
  if (nguoiYeuCauID) {
    // Thường dùng cho CBTC xem YC của mình
    whereClause += ` AND ych.NguoiYeuCauID = @NguoiYeuCauID `;
    queryParams.push({
      name: 'NguoiYeuCauID',
      type: sql.Int,
      value: nguoiYeuCauID,
    });
  }

  if (searchTerm) {
    whereClause += ` AND (sk.TenSK LIKE @SearchTerm OR nd_yc.HoTen LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }
  if (trangThaiYcHuySkMa) {
    whereClause += ` AND tt_ych.MaTrangThai = @TrangThaiYcHuySkMa `;
    queryParams.push({
      name: 'TrangThaiYcHuySkMa',
      type: sql.VarChar,
      value: trangThaiYcHuySkMa,
    });
  }
  if (suKienID) {
    whereClause += ` AND ych.SuKienID = @SuKienID `;
    queryParams.push({ name: 'SuKienID', type: sql.Int, value: suKienID });
  }

  const countQuery = `SELECT COUNT(DISTINCT ych.YcHuySkID) AS TotalItems ${fromClause} ${whereClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = ['ych.NgayYeuCauHuy', 'sk.TenSK', 'nd_yc.HoTen'];
  const safeSortBy = allowedSortBy.includes(sortBy)
    ? sortBy
    : 'ych.NgayYeuCauHuy';
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
    ycHuySkID: row.YcHuySkID,
    suKien: {
      suKienID: row.SuKienID,
      tenSK: row.TenSuKien,
      tgBatDauDK: row.TgBatDauDK.toISOString(),
    },
    nguoiYeuCau: {
      nguoiDungID: row.NguoiYeuCau_ID,
      hoTen: row.NguoiYeuCau_HoTen,
    },
    donViYeuCau: row.DonViYeuCau_ID_GV
      ? {
          // Ưu tiên lấy đơn vị từ GV trước
          donViID: row.DonViYeuCau_ID_GV,
          tenDonVi: row.DonViYeuCau_TenDonVi_GV,
          maDonVi: row.DonViYeuCau_MaDonVi_GV,
          loaiDonVi: row.DonViYeuCau_LoaiDonVi_GV,
        }
      : null, // Thêm logic lấy đơn vị từ vai trò chức năng nếu người yêu cầu là Nhân viên
    ngayYeuCauHuy: row.NgayYeuCauHuy.toISOString(),
    lyDoHuyNganGon: row.LyDoHuyNganGon,
    trangThaiYeuCauHuySK: {
      trangThaiYcHuySkID: row.TrangThaiYCHSK_ID,
      maTrangThai: row.TrangThaiYCHSK_Ma,
      tenTrangThai: row.TrangThaiYCHSK_Ten,
    },
    nguoiDuyetBGH: row.NguoiDuyetBGH_ID
      ? {
          nguoiDungID: row.NguoiDuyetBGH_ID,
          hoTen: row.NguoiDuyetBGH_HoTen,
        }
      : null,
    ngayDuyetBGH: row.NgayDuyetHuyBGH
      ? row.NgayDuyetHuyBGH.toISOString()
      : null,
  }));
  return { items, totalItems };
};

/**
 * Lấy chi tiết YeuCauHuySK theo ID
 * @param {number} ycHuySkID
 * @returns {Promise<object|null>} Chi tiết YeuCauHuySK
 * */
const getYeuCauHuySKDetailById = async (ycHuySkID) => {
  const query = `
    SELECT
        ych.*, -- Lấy tất cả cột từ YeuCauHuySK
        sk.SuKienID AS SK_ID, sk.TenSK AS SK_TenSK, sk.TgBatDauDK AS SK_TgBatDauDK,
        nd_yc.NguoiDungID AS NguoiYeuCau_ID, nd_yc.HoTen AS NguoiYeuCau_HoTen, nd_yc.Email AS NguoiYeuCau_Email,
        dv_nguoi_yc.DonViID AS DonViYeuCau_ID, dv_nguoi_yc.TenDonVi AS DonViYeuCau_TenDonVi, dv_nguoi_yc.MaDonVi AS DonViYeuCau_MaDonVi, dv_nguoi_yc.LoaiDonVi AS DonViYeuCau_LoaiDonVi,
        tt_ych.MaTrangThai AS TrangThaiYCHSK_Ma, tt_ych.TenTrangThai AS TrangThaiYCHSK_Ten,
        nd_duyet.NguoiDungID AS NguoiDuyetBGH_ID, nd_duyet.HoTen AS NguoiDuyetBGH_HoTen, nd_duyet.Email AS NguoiDuyetBGH_Email
        -- Nếu cần suKienFullDetail, cần join thêm các bảng của SuKien (đã có hàm getSuKienDetailById)
    FROM YeuCauHuySK ych
    JOIN SuKien sk ON ych.SuKienID = sk.SuKienID
    JOIN NguoiDung nd_yc ON ych.NguoiYeuCauID = nd_yc.NguoiDungID
    JOIN TrangThaiYeuCauHuySK tt_ych ON ych.TrangThaiYcHuySkID = tt_ych.TrangThaiYcHuySkID
    LEFT JOIN NguoiDung nd_duyet ON ych.NguoiDuyetHuyBGHID = nd_duyet.NguoiDungID
    -- Logic lấy dv_nguoi_yc tương tự như hàm get list (phức tạp, cần join ThongTinGiangVien/NguoiDung_VaiTro)
  
    LEFT JOIN ThongTinGiangVien tgv_yc ON nd_yc.NguoiDungID = tgv_yc.NguoiDungID
    LEFT JOIN DonVi dv_nguoi_yc ON tgv_yc.DonViCongTacID = dv_nguoi_yc.DonViID
    WHERE ych.YcHuySkID = @YcHuySkID;
  `;
  const params = [{ name: 'YcHuySkID', type: sql.Int, value: ycHuySkID }];
  const result = await executeQuery(query, params);
  if (result.recordset.length === 0) return null;

  const row = result.recordset[0];
  return {
    ycHuySkID: row.YcHuySkID,
    suKien: {
      suKienID: row.SK_ID,
      tenSK: row.SK_TenSK,
      tgBatDauDK: row.SK_TgBatDauDK.toISOString(),
    },
    nguoiYeuCau: {
      nguoiDungID: row.NguoiYeuCau_ID,
      hoTen: row.NguoiYeuCau_HoTen,
      email: row.NguoiYeuCau_Email,
    },
    donViYeuCau: row.DonViYeuCau_ID
      ? {
          donViID: row.DonViYeuCau_ID,
          tenDonVi: row.DonViYeuCau_TenDonVi,
          maDonVi: row.DonViYeuCau_MaDonVi,
          loaiDonVi: row.DonViYeuCau_LoaiDonVi,
        }
      : null,
    ngayYeuCauHuy: row.NgayYeuCauHuy.toISOString(),
    lyDoHuyNganGon: row.LyDoHuy ? row.LyDoHuy.substring(0, 150) : null, // Cần cho ListItem
    trangThaiYeuCauHuySK: {
      trangThaiYcHuySkID: row.TrangThaiYcHuySkID,
      maTrangThai: row.TrangThaiYCHSK_Ma,
      tenTrangThai: row.TrangThaiYCHSK_Ten,
    },
    nguoiDuyetBGH: row.NguoiDuyetBGH_ID
      ? {
          nguoiDungID: row.NguoiDuyetBGH_ID,
          hoTen: row.NguoiDuyetBGH_HoTen,
          email: row.NguoiDuyetBGH_Email,
        }
      : null,
    ngayDuyetBGH: row.NgayDuyetHuyBGH
      ? row.NgayDuyetHuyBGH.toISOString()
      : null,
    // Chi tiết thêm cho YeuCauHuySKDetailResponse
    lyDoHuy: row.LyDoHuy,
    lyDoTuChoiHuyBGH: row.LyDoTuChoiHuyBGH,
    // suKienFullDetail: suKienFullDetail, // Sẽ được lấy ở service nếu cần
  };
};

/**
 * Lấy YeuCauHuySK và trạng thái hiện tại của nó để xử lý
 * @param {number} ycHuySkID
 * @param {sql.Transaction} transaction
 * @returns {Promise<object|null>} { YcHuySkID, SuKienID, NguoiYeuCauID, MaTrangThaiHienTai }
 */
const getYeuCauHuySKForProcessing = async (ycHuySkID, transaction) => {
  const query = `
    SELECT
        ych.YcHuySkID,
        ych.SuKienID,
        ych.NguoiYeuCauID,
        tt_ych.MaTrangThai AS MaTrangThaiHienTai
    FROM YeuCauHuySK ych
    JOIN TrangThaiYeuCauHuySK tt_ych ON ych.TrangThaiYcHuySkID = tt_ych.TrangThaiYcHuySkID
    WHERE ych.YcHuySkID = @YcHuySkID;
  `;
  const params = [{ name: 'YcHuySkID', type: sql.Int, value: ycHuySkID }];
  const request = transaction.request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Cập nhật YeuCauHuySK sau khi BGH xử lý
 * @param {number} ycHuySkID
 * @param {number} trangThaiMoiID
 * @param {number} nguoiDuyetBGHID
 * @param {string|null} lyDoTuChoi (nếu từ chối)
 * @param {string|null} ghiChuBGH (nếu duyệt và có ghi chú - cần cột này trong YeuCauHuySK nếu muốn lưu)
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const updateYeuCauHuySKAfterBGHAction = async (
  ycHuySkID,
  trangThaiMoiID,
  nguoiDuyetHuyBGHID,
  lyDoTuChoi = null,
  ghiChuHuyBGH = null, // Thêm cột ghiChuHuyBGH vào YeuCauHuySK nếu cần
  transaction
) => {
  let setClauses = `
    TrangThaiYcHuySkID = @TrangThaiMoiID,
    NguoiDuyetHuyBGHID = @NguoiDuyetHuyBGHID,
    NgayDuyetHuyBGH = GETDATE()
  `;
  const params = [
    { name: 'YcHuySkID', type: sql.Int, value: ycHuySkID },
    { name: 'TrangThaiMoiID', type: sql.Int, value: trangThaiMoiID },
    { name: 'NguoiDuyetHuyBGHID', type: sql.Int, value: nguoiDuyetHuyBGHID },
  ];

  if (lyDoTuChoi !== null) {
    setClauses += `, LyDoTuChoiHuyBGH = @LyDoTuChoi`;
    params.push({
      name: 'LyDoTuChoi',
      type: sql.NVarChar(sql.MAX),
      value: lyDoTuChoi,
    });
  } else {
    // Nếu duyệt, có thể muốn xóa lý do từ chối cũ (nếu YC này từng bị từ chối rồi được yêu cầu lại)
    setClauses += `, LyDoTuChoiHuyBGH = NULL`;
  }

  if (ghiChuHuyBGH !== null) {
    // setClauses += `, ghiChuHuyBGH = @ghiChuHuyBGH`;
    // params.push({ name: 'ghiChuHuyBGH', type: sql.NVarChar(sql.MAX), value: ghiChuHuyBGH });
    console.warn(
      'Cột ghiChuHuyBGH chưa được thêm vào bảng YeuCauHuySK, ghi chú này sẽ không được lưu.'
    );
  }

  const query = `
    UPDATE YeuCauHuySK
    SET ${setClauses}
    WHERE YcHuySkID = @YcHuySkID;
  `;
  const request = transaction.request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  await request.query(query);
};

/**
 * Xóa tất cả các bản ghi đặt phòng chi tiết liên quan đến một SuKienID.
 * @param {number} suKienID
 * @param {sql.Transaction} transaction
 * @returns {Promise<void>}
 */
const deleteChiTietDatPhongBySuKienID = async (suKienID, transaction) => {
  const query = `
    DELETE cdp
    FROM ChiTietDatPhong cdp
    JOIN YcMuonPhongChiTiet yct ON cdp.YcMuonPhongCtID = yct.YcMuonPhongCtID
    JOIN YeuCauMuonPhong yc ON yct.YcMuonPhongID = yc.YcMuonPhongID
    WHERE yc.SuKienID = @SuKienID;
  `;
  const request = transaction.request();
  request.input('SuKienID', sql.Int, suKienID);
  await request.query(query);
};

export const yeuCauHuySKRepository = {
  findSuKienForCancellationRequest,
  checkExistingPendingCancellationRequest,
  createYeuCauHuySKRecord,
  updateSuKienTrangThai,
  getTrangThaiIDByMa, // Hàm tiện ích
  getYeuCauHuySKListWithPagination,
  getYeuCauHuySKDetailById,
  getYeuCauHuySKForProcessing,
  updateYeuCauHuySKAfterBGHAction,
  deleteChiTietDatPhongBySuKienID,
};
