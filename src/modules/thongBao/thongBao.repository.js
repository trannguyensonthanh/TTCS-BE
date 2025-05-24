// src/modules/thongBao/thongBao.repository.js
import { executeQuery } from '../../utils/database.js';
import sql from 'mssql';

/**
 * Lấy danh sách các DonViID liên quan đến người dùng:
 * - Đơn vị công tác chính của Giảng viên
 * - Khoa quản lý của Sinh viên
 * - Các đơn vị mà người dùng có vai trò chức năng (NguoiDung_VaiTroChucNang.DonViThucThiID)
 * - Các CLB mà người dùng là thành viên (ThanhVienCLB.DonViID_CLB)
 * @param {number} nguoiDungID
 * @returns {Promise<number[]>} Mảng các DonViID unique
 */
const getRelevantDonViIDsForUser = async (nguoiDungID) => {
  const donViIDs = new Set(); // Dùng Set để đảm bảo unique

  // Lấy đơn vị từ ThongTinGiangVien
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
    FROM NguoiDung_VaiTro -- Giả sử tên bảng này là NguoiDung_VaiTro như CSDL bạn cung cấp
    WHERE NguoiDungID = @NguoiDungID AND DonViID IS NOT NULL
      AND (NgayKetThuc IS NULL OR NgayKetThuc >= GETDATE());
  `;
  result = await executeQuery(query, params);
  result.recordset.forEach((row) => {
    if (row.DonViThucThiID) donViIDs.add(row.DonViThucThiID);
  });

  // Lấy các DonViID_CLB từ ThanhVienCLB (nếu có bảng này)
  // Giả sử bạn đã tạo bảng ThanhVienCLB
  query = `
    SELECT DISTINCT DonViID_CLB
    FROM ThanhVienCLB
    WHERE NguoiDungID = @NguoiDungID AND IsActiveInCLB = 1
      AND (NgayRoiCLB IS NULL OR NgayRoiCLB >= GETDATE());
  `;
  // Kiểm tra xem bảng ThanhVienCLB có tồn tại không trước khi query
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
 * Lấy thông báo cho người dùng hiện tại
 * @param {number} nguoiDungID
 * @param {number[]} relevantDonViIDs Mảng các DonViID liên quan đến người dùng
 * @param {object} params - { limit, page, chiChuaDoc }
 * @returns {Promise<{ items: Array<object>, totalItems: number, totalUnread: number }>}
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
  // Có thể thêm logic cho VaiTroNhanID nếu cần

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

  // Đếm tổng số thông báo chưa đọc (không phân trang)
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
    return 0; // Không tìm thấy thông báo hoặc không có quyền
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
 * @param {object} thongBaoData - { NguoiNhanID?, DonViNhanID?, VaiTroNhanID?, SkLienQuanID?, YcLienQuanID?, LoaiYcLienQuan?, NoiDungTB, DuongDanTB?, LoaiThongBao }
 * @returns {Promise<object>} Bản ghi thông báo vừa được tạo
 */
const createThongBaoRecord = async (thongBaoData) => {
  const {
    NguoiNhanID = null,
    DonViNhanID = null,
    // VaiTroNhanID = null, // Hiện tại ít dùng, có thể thêm sau nếu cần
    SkLienQuanID = null,
    YcLienQuanID = null,
    LoaiYcLienQuan = null,
    NoiDungTB,
    DuongDanTB = null,
    LoaiThongBao = null, // Mã loại thông báo từ enum
  } = thongBaoData;

  // Đảm bảo ít nhất một trong NguoiNhanID hoặc DonViNhanID có giá trị (tùy nghiệp vụ)
  // if (!NguoiNhanID && !DonViNhanID && !VaiTroNhanID) {
  //   throw new Error('Thông báo phải có ít nhất một người nhận, đơn vị nhận hoặc vai trò nhận.');
  // }
  // Trong thực tế, thường sẽ là NguoiNhanID hoặc DonViNhanID

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

  const result = await executeQuery(query, params);
  return result.recordset[0];
};

export const thongBaoRepository = {
  getRelevantDonViIDsForUser,
  getThongBaoForUser,
  markThongBaoAsRead,
  markAllThongBaoAsReadForUser,
  createThongBaoRecord,
};
