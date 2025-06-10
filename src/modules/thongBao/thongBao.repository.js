// src/modules/thongBao/thongBao.repository.js
import { executeQuery } from '../../utils/database.js';
import sql from 'mssql';

/**
 * Lấy danh sách các DonViID liên quan đến người dùng
 * Đầu vào: nguoiDungID (number) - ID người dùng
 * Đầu ra: Promise<number[]> - Mảng các DonViID unique
 */
const getRelevantDonViIDsForUser = async (nguoiDungID) => {
  const donViIDs = new Set();

  let query = `SELECT DonViCongTacID FROM ThongTinGiangVien WHERE NguoiDungID = @NguoiDungID AND DonViCongTacID IS NOT NULL;`;
  let params = [{ name: 'NguoiDungID', type: sql.Int, value: nguoiDungID }];
  let result = await executeQuery(query, params);
  if (result.recordset.length > 0 && result.recordset[0].DonViCongTacID) {
    donViIDs.add(result.recordset[0].DonViCongTacID);
  }

  // Lấy Khoa quản lý từ ThongTinSinhVien -> LopHoc -> NganhHoc
  query = `
    SELECT nh.KhoaQuanLyID
    FROM ThongTinSinhVien tsv
    JOIN LopHoc lh ON tsv.LopID = lh.LopID
    JOIN NganhHoc nh ON lh.NganhHocID = nh.NganhHocID
    WHERE tsv.NguoiDungID = @NguoiDungID AND nh.KhoaQuanLyID IS NOT NULL;
  `;
  result = await executeQuery(query, params); // params vẫn là nguoiDungID
  if (result.recordset.length > 0 && result.recordset[0].KhoaQuanLyID) {
    donViIDs.add(result.recordset[0].KhoaQuanLyID);
  }

  // Lấy các DonViThucThiID từ NguoiDung_VaiTroChucNang
  query = `
    SELECT DISTINCT DonViID AS DonViThucThiID
    FROM NguoiDung_VaiTro 
    WHERE NguoiDungID = @NguoiDungID AND DonViID IS NOT NULL
      AND (NgayKetThuc IS NULL OR NgayKetThuc >= GETDATE());
  `;
  result = await executeQuery(query, params);
  result.recordset.forEach((row) => {
    if (row.DonViThucThiID) donViIDs.add(row.DonViThucThiID);
  });

  // Lấy các DonViID_CLB từ ThanhVienCLB
  query = `
    SELECT DISTINCT DonViID_CLB
    FROM ThanhVienCLB
    WHERE NguoiDungID = @NguoiDungID AND IsActiveInCLB = 1
      AND (NgayRoiCLB IS NULL OR NgayRoiCLB >= GETDATE());
  `;
  const checkTableQuery =
    "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ThanhVienCLB'";
  const tableExistsResult = await executeQuery(checkTableQuery);
  if (tableExistsResult.recordset[0].count > 0) {
    result = await executeQuery(query, params);
    result.recordset.forEach((row) => {
      if (row.DonViID_CLB) donViIDs.add(row.DonViID_CLB);
    });
  }

  return Array.from(donViIDs);
};

/**
 * Lấy thông báo cho người dùng hiện tại (có phân trang, lọc, ưu tiên chưa đọc)
 * Đầu vào: nguoiDungID (number), relevantDonViIDs (number[]), params (object: { limit, page, chiChuaDoc })
 * Đầu ra: Promise<{ items: Array<object>, totalItems: number, totalUnread: number }>
 */
const getThongBaoForUser = async (nguoiDungID, relevantDonViIDs, params) => {
  const { limit = 10, page = 1, chiChuaDoc } = params;

  let whereClauses = [`(tb.NguoiNhanID = @NguoiDungID)`];
  const queryParams = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
  ];

  if (relevantDonViIDs && relevantDonViIDs.length > 0) {
    // Tạo các tham số động cho danh sách DonViID
    const donViParams = relevantDonViIDs.map((id, index) => {
      const paramName = `DonViID${index}`;
      queryParams.push({ name: paramName, type: sql.Int, value: id });
      return `@${paramName}`;
    });
    whereClauses.push(`(tb.DonViNhanID IN (${donViParams.join(',')}))`);
  }

  let baseWhere = `(${whereClauses.join(' OR ')})`;

  if (typeof chiChuaDoc === 'boolean') {
    baseWhere += ` AND tb.DaDocTB = @DaDocTB`;
    queryParams.push({
      name: 'DaDocTB',
      type: sql.Bit,
      value: chiChuaDoc ? 0 : 1,
    });
  }

  const fromClause = `
    FROM ThongBao tb
    LEFT JOIN SuKien sk ON tb.SkLienQuanID = sk.SuKienID
    WHERE ${baseWhere}
  `;

  const unreadCountQuery = `SELECT COUNT(*) AS TotalUnread FROM ThongBao tb WHERE (${whereClauses.join(' OR ')}) AND tb.DaDocTB = 0;`;
  const unreadParams = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
  ];
  if (relevantDonViIDs && relevantDonViIDs.length > 0) {
    relevantDonViIDs.forEach((id, index) => {
      unreadParams.push({ name: `DonViID${index}`, type: sql.Int, value: id });
    });
  }
  const unreadResult = await executeQuery(unreadCountQuery, unreadParams);
  const totalUnread = unreadResult.recordset[0].TotalUnread;

  // Đếm tổng số items thỏa mãn điều kiện (có thể bao gồm cả đã đọc và chưa đọc nếu chiChuaDoc không được set)
  const countQuery = `SELECT COUNT(*) AS TotalItems ${fromClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  // Lấy items với phân trang, ưu tiên chưa đọc
  const offset = (page - 1) * limit;
  const itemsQuery = `
    SELECT
        tb.ThongBaoID,
        tb.NoiDungTB,
        tb.DuongDanTB,
        tb.NgayTaoTB,
        tb.DaDocTB,
        tb.LoaiThongBao,
        sk.TenSK AS TenSuKienLienQuan
    ${fromClause}
    ORDER BY tb.DaDocTB ASC, tb.NgayTaoTB DESC -- Ưu tiên chưa đọc, rồi mới nhất
    OFFSET ${offset} ROWS
    FETCH NEXT ${limit} ROWS ONLY;
  `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);
  const items = itemsResult.recordset.map((row) => ({
    thongBaoID: Number(row.ThongBaoID), // Chuyển BigInt sang Number
    noiDungTB: row.NoiDungTB,
    DuongDanTB: row.DuongDanTB,
    ngayTaoTB: row.NgayTaoTB.toISOString(),
    daDocTB: row.DaDocTB,
    loaiThongBao: row.LoaiThongBao,
    tenSuKienLienQuan: row.TenSuKienLienQuan,
  }));

  return { items, totalItems, totalUnread };
};

/**
 * Đánh dấu một thông báo là đã đọc cho người dùng
 * Đầu vào: thongBaoID (number), nguoiDungID (number)
 * Đầu ra: Promise<number> - Số dòng được cập nhật (0 nếu không có quyền)
 */
const markThongBaoAsRead = async (thongBaoID, nguoiDungID) => {
  // Cần kiểm tra xem thông báo này có thuộc về người dùng không trước khi đánh dấu
  const queryCheck = `
        SELECT tb.ThongBaoID
        FROM ThongBao tb
        LEFT JOIN ThanhVienCLB tvc ON tb.DonViNhanID = tvc.DonViID_CLB AND tvc.NguoiDungID = @NguoiDungID AND tvc.IsActiveInCLB = 1
        LEFT JOIN ThongTinGiangVien tgv ON tb.DonViNhanID = tgv.DonViCongTacID AND tgv.NguoiDungID = @NguoiDungID
        LEFT JOIN (
            SELECT tsv_lh.NguoiDungID, nh_lh.KhoaQuanLyID
            FROM ThongTinSinhVien tsv_lh
            JOIN LopHoc lh_lh ON tsv_lh.LopID = lh_lh.LopID
            JOIN NganhHoc nh_lh ON lh_lh.NganhHocID = nh_lh.NganhHocID
        ) sv_khoa ON tb.DonViNhanID = sv_khoa.KhoaQuanLyID AND sv_khoa.NguoiDungID = @NguoiDungID
        LEFT JOIN NguoiDung_VaiTro ndvt ON tb.DonViNhanID = ndvt.DonViID AND ndvt.NguoiDungID = @NguoiDungID AND (ndvt.NgayKetThuc IS NULL OR ndvt.NgayKetThuc >= GETDATE())
        WHERE tb.ThongBaoID = @ThongBaoID
          AND (tb.NguoiNhanID = @NguoiDungID
               OR tvc.ThanhVienClbID IS NOT NULL
               OR tgv.NguoiDungID IS NOT NULL
               OR sv_khoa.NguoiDungID IS NOT NULL
               OR ndvt.GanVaiTroID IS NOT NULL
              );
    `;
  const paramsCheck = [
    { name: 'ThongBaoID', type: sql.BigInt, value: thongBaoID },
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
  ];
  const checkResult = await executeQuery(queryCheck, paramsCheck);
  if (checkResult.recordset.length === 0) {
    return 0;
  }

  const queryUpdate = `
        UPDATE ThongBao
        SET DaDocTB = 1, NgayDocTB = GETDATE()
        WHERE ThongBaoID = @ThongBaoID AND DaDocTB = 0;
    `; // Chỉ cập nhật nếu chưa đọc
  const paramsUpdate = [
    { name: 'ThongBaoID', type: sql.BigInt, value: thongBaoID },
  ];
  const result = await executeQuery(queryUpdate, paramsUpdate);
  return result.rowsAffected[0]; // Số dòng được cập nhật
};

/**
 * Đánh dấu tất cả thông báo là đã đọc cho người dùng
 * Đầu vào: nguoiDungID (number), relevantDonViIDs (number[])
 * Đầu ra: Promise<number> - Số dòng được cập nhật
 */
const markAllThongBaoAsReadForUser = async (nguoiDungID, relevantDonViIDs) => {
  let whereClauses = [`(NguoiNhanID = @NguoiDungID)`];
  const queryParams = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
  ];

  if (relevantDonViIDs && relevantDonViIDs.length > 0) {
    const donViParams = relevantDonViIDs.map((id, index) => {
      const paramName = `DonViID${index}`;
      queryParams.push({ name: paramName, type: sql.Int, value: id });
      return `@${paramName}`;
    });
    whereClauses.push(`(DonViNhanID IN (${donViParams.join(',')}))`);
  }

  const query = `
        UPDATE ThongBao
        SET DaDocTB = 1, NgayDocTB = GETDATE()
        WHERE (${whereClauses.join(' OR ')}) AND DaDocTB = 0;
    `;
  const result = await executeQuery(query, queryParams);
  return result.rowsAffected[0];
};

/**
 * Tạo một bản ghi thông báo mới trong CSDL
 * Đầu vào: thongBaoData (object), transaction (object|null)
 * Đầu ra: Promise<object> - Bản ghi thông báo vừa được tạo
 */
const createThongBaoRecord = async (thongBaoData, transaction = null) => {
  const {
    NguoiNhanID = null,
    DonViNhanID = null,
    SkLienQuanID = null,
    YcLienQuanID = null,
    LoaiYcLienQuan = null,
    NoiDungTB,
    DuongDanTB = null,
    LoaiThongBao = null,
  } = thongBaoData;

  const query = `
    INSERT INTO ThongBao (
        NguoiNhanID, DonViNhanID, SkLienQuanID, YcLienQuanID, LoaiYcLienQuan,
        NoiDungTB, DuongDanTB, LoaiThongBao, NgayTaoTB, DaDocTB
    )
    OUTPUT inserted.ThongBaoID, inserted.NoiDungTB, inserted.NgayTaoTB, inserted.LoaiThongBao
    VALUES (
        @NguoiNhanID, @DonViNhanID, @SkLienQuanID, @YcLienQuanID, @LoaiYcLienQuan,
        @NoiDungTB, @DuongDanTB, @LoaiThongBao, GETDATE(), 0
    );
  `;
  const params = [
    { name: 'NguoiNhanID', type: sql.Int, value: NguoiNhanID },
    { name: 'DonViNhanID', type: sql.Int, value: DonViNhanID },
    { name: 'SkLienQuanID', type: sql.Int, value: SkLienQuanID },
    { name: 'YcLienQuanID', type: sql.Int, value: YcLienQuanID },
    { name: 'LoaiYcLienQuan', type: sql.VarChar(50), value: LoaiYcLienQuan },
    { name: 'NoiDungTB', type: sql.NVarChar(sql.MAX), value: NoiDungTB },
    {
      name: 'DuongDanTB',
      type: sql.VarChar(500),
      value: DuongDanTB,
    },
    { name: 'LoaiThongBao', type: sql.VarChar(50), value: LoaiThongBao },
  ];

  const result = await executeQuery(query, params, transaction);
  return result.recordset[0];
};

/**
 * Lấy tất cả thông báo cho người dùng hiện tại với phân trang và lọc
 * Đầu vào: nguoiDungID (number), relevantDonViIDs (number[]), params (object)
 * Đầu ra: Promise<{ items: Array<object>, totalItems: number, totalUnreadThisQuery?: number }>
 */
const getAllThongBaoForUserWithPagination = async (
  nguoiDungID,
  relevantDonViIDs,
  params
) => {
  const {
    daDoc,
    loaiThongBao,
    searchTerm,
    page = 1,
    limit = 15,
    sortBy = 'tb.NgayTaoTB',
    sortOrder = 'DESC',
  } = params;

  let whereClauses = [`(tb.NguoiNhanID = @NguoiDungID)`];
  const queryParams = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
  ];

  if (relevantDonViIDs && relevantDonViIDs.length > 0) {
    const donViParams = relevantDonViIDs.map((id, index) => {
      const paramName = `DonViIDFilter${index}`; // Đặt tên param khác để tránh trùng với các API khác
      queryParams.push({ name: paramName, type: sql.Int, value: id });
      return `@${paramName}`;
    });
    whereClauses.push(`(tb.DonViNhanID IN (${donViParams.join(',')}))`);
  }

  let baseWhere = `(${whereClauses.join(' OR ')})`;

  if (typeof daDoc === 'boolean') {
    baseWhere += ` AND tb.DaDocTB = @DaDocTB_Filter`;
    queryParams.push({ name: 'DaDocTB_Filter', type: sql.Bit, value: daDoc });
  }
  if (loaiThongBao) {
    baseWhere += ` AND tb.LoaiThongBao = @LoaiThongBao_Filter`;
    queryParams.push({
      name: 'LoaiThongBao_Filter',
      type: sql.VarChar(50),
      value: loaiThongBao,
    });
  }
  if (searchTerm) {
    baseWhere += ` AND (tb.NoiDungTB LIKE @SearchTerm OR sk.TenSK LIKE @SearchTerm)`;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }

  const fromClause = `
    FROM ThongBao tb
    LEFT JOIN SuKien sk ON tb.SkLienQuanID = sk.SuKienID
    WHERE ${baseWhere}
  `;

  const countQuery = `SELECT COUNT(*) AS TotalItems ${fromClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  let totalUnreadThisQuery = 0;

  totalUnreadThisQuery = await getTotalUnreadThongBaoForUser(
    nguoiDungID,
    relevantDonViIDs
  );

  const allowedSortBy = ['tb.NgayTaoTB', 'tb.LoaiThongBao', 'sk.TenSK'];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'tb.NgayTaoTB';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
    SELECT
        tb.ThongBaoID,
        tb.NoiDungTB,
        tb.DuongDanTB,
        tb.NgayTaoTB,
        tb.DaDocTB,
        tb.NgayDocTB,
        tb.LoaiThongBao,
        sk.TenSK AS TenSuKienLienQuan
    ${fromClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    OFFSET ${offset} ROWS
    FETCH NEXT ${limit} ROWS ONLY;
  `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);
  const items = itemsResult.recordset.map((row) => ({
    thongBaoID: Number(row.ThongBaoID),
    noiDungTB: row.NoiDungTB,
    duongDanLienQuan: row.DuongDanTB,
    ngayTaoTB: row.NgayTaoTB.toISOString(),
    daDocTB: row.DaDocTB,
    ngayDocTB: row.NgayDocTB ? row.NgayDocTB.toISOString() : null,
    loaiThongBao: row.LoaiThongBao,
    tenSuKienLienQuan: row.TenSuKienLienQuan,
  }));

  return { items, totalItems, totalUnread: totalUnreadThisQuery };
};

/**
 * Lấy tổng số thông báo chưa đọc cho người dùng
 * Đầu vào: nguoiDungID (number), relevantDonViIDs (number[])
 * Đầu ra: Promise<number> - Tổng số thông báo chưa đọc
 */
const getTotalUnreadThongBaoForUser = async (nguoiDungID, relevantDonViIDs) => {
  let whereClauses = [`(tb.NguoiNhanID = @NguoiDungID)`];
  const queryParams = [
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
  ];

  if (relevantDonViIDs && relevantDonViIDs.length > 0) {
    const donViParams = relevantDonViIDs.map((id, index) => {
      const paramName = `DonViID${index}`;
      queryParams.push({ name: paramName, type: sql.Int, value: id });
      return `@${paramName}`;
    });
    whereClauses.push(`(tb.DonViNhanID IN (${donViParams.join(',')}))`);
  }

  const query = `
    SELECT COUNT(*) AS TotalUnread
    FROM ThongBao tb
    WHERE (${whereClauses.join(' OR ')}) AND tb.DaDocTB = 0;
  `;
  const result = await executeQuery(query, queryParams);
  return result.recordset[0].TotalUnread;
};

export const thongBaoRepository = {
  getRelevantDonViIDsForUser,
  getThongBaoForUser,
  markThongBaoAsRead,
  markAllThongBaoAsReadForUser,
  createThongBaoRecord,
  getAllThongBaoForUserWithPagination,
  getTotalUnreadThongBaoForUser,
};
