// src/modules/donVi/donVi.repository.js
import sql from 'mssql';
import LoaiDonVi from '../../enums/loaiDonVi.enum.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import { executeQuery, getPool } from '../../utils/database.js';

const SELECT_DONVI_FIELDS = `
    dv.DonViID, dv.TenDonVi, dv.MaDonVi, dv.LoaiDonVi, dv.MoTaDv,
    dv_cha.DonViID AS DonViCha_ID, dv_cha.TenDonVi AS DonViCha_Ten, dv_cha.MaDonVi AS DonViCha_Ma
`;

const FROM_JOIN_DONVI = `
    FROM DonVi dv
    LEFT JOIN DonVi dv_cha ON dv.DonViChaID = dv_cha.DonViID
`;

/**
 * [SỬA LỖI] Đếm số lượng thành viên của một đơn vị.
 * Logic được cập nhật để đếm dựa trên vai trò THANH_VIEN_DON_VI, thay vì cột DonViCongTacID.
 * @param {number} donViId - ID của đơn vị
 * @returns {Promise<number>} Tổng số thành viên
 */
const countThanhVienInDonVi = async (donViId) => {
  const query = `
        SELECT COUNT(DISTINCT ndvt.NguoiDungID) as thanhVienCount
        FROM NguoiDung_VaiTro ndvt
        JOIN VaiTroHeThong vt ON ndvt.VaiTroID = vt.VaiTroID
        WHERE ndvt.DonViID = @DonViID 
          AND vt.MaVaiTro = @MaVaiTroThanhVien
          AND (ndvt.NgayKetThuc IS NULL OR ndvt.NgayKetThuc >= GETDATE());
    `;
  const params = [
    { name: 'DonViID', type: sql.Int, value: donViId },
    {
      name: 'MaVaiTroThanhVien',
      type: sql.VarChar,
      value: MaVaiTro.THANH_VIEN_DON_VI,
    },
  ];
  const result = await executeQuery(query, params);
  return result.recordset[0].thanhVienCount;
};

const mapRowToDonViListItem = async (row) => {
  const tenLoaiDonVi = LoaiDonVi[row.LoaiDonVi] || row.LoaiDonVi;
  const soLuongThanhVien = await countThanhVienInDonVi(row.DonViID);
  return {
    donViID: row.DonViID,
    tenDonVi: row.TenDonVi,
    maDonVi: row.MaDonVi,
    loaiDonVi: row.LoaiDonVi,
    tenLoaiDonVi,
    donViCha: row.DonViCha_ID
      ? {
          donViID: row.DonViCha_ID,
          tenDonVi: row.DonViCha_Ten,
          maDonVi: row.DonViCha_Ma,
        }
      : null,
    soLuongDonViCon: row.SoLuongDonViCon,
    soLuongThanhVien,
    moTaDv: row.MoTaDv,
  };
};

/**
 * Lấy danh sách Đơn vị với phân trang và bộ lọc.
 * @param {object} params - Tham số lọc, phân trang, tìm kiếm.
 * @returns {Promise<{items: Array<object>, totalItems: number}>}
 */
const getDonViListWithPagination = async (params) => {
  const {
    searchTerm,
    loaiDonVi,
    donViChaID,
    page = 1,
    limit = 10,
    sortBy = 'dv.TenDonVi',
    sortOrder = 'ASC',
  } = params;

  let whereClause = ` WHERE 1=1 `;
  const queryParams = [];

  if (searchTerm) {
    whereClause += ` AND (dv.TenDonVi LIKE @SearchTerm OR dv.MaDonVi LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }
  if (loaiDonVi && loaiDonVi.length > 0) {
    const loaiDonViParams = loaiDonVi.map((loai, index) => {
      const paramName = `LoaiDV${index}`;
      queryParams.push({
        name: paramName,
        type: sql.NVarChar(100),
        value: loai,
      });
      return `@${paramName}`;
    });
    whereClause += ` AND dv.LoaiDonVi IN (${loaiDonViParams.join(',')}) `;
  }
  if (donViChaID) {
    whereClause += ` AND dv.DonViChaID = @DonViChaID `;
    queryParams.push({ name: 'DonViChaID', type: sql.Int, value: donViChaID });
  }

  // Subquery để đếm đơn vị con
  const soLuongDonViConSubQuery = `(SELECT COUNT(*) FROM DonVi dv_sub WHERE dv_sub.DonViChaID = dv.DonViID)`;

  const countQuery = `SELECT COUNT(DISTINCT dv.DonViID) AS TotalItems ${FROM_JOIN_DONVI} ${whereClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = ['dv.TenDonVi', 'dv.MaDonVi', 'dv.LoaiDonVi'];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'dv.TenDonVi';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        SELECT ${SELECT_DONVI_FIELDS},
               ${soLuongDonViConSubQuery} AS SoLuongDonViCon
               -- Bỏ subquery đếm thành viên ở đây
        ${FROM_JOIN_DONVI}
        ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}, dv.DonViID ${safeSortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
    `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);

  // [SỬA LỖI] Dùng Promise.all để gọi hàm map bất đồng bộ
  const items = await Promise.all(
    itemsResult.recordset.map((row) => mapRowToDonViListItem(row))
  );
  return { items, totalItems };
};

/**
 * Lấy thông tin chi tiết một Đơn Vị theo DonViID.
 * @param {number} donViId - ID đơn vị.
 * @param {sql.Transaction} [transaction=null] - Transaction tùy chọn.
 * @returns {Promise<object|null>} Thông tin đơn vị hoặc null nếu không tìm thấy.
 */
const getDonViById = async (donViId, transaction = null) => {
  const soLuongDonViConSubQuery = `(SELECT COUNT(*) FROM DonVi dv_sub WHERE dv_sub.DonViChaID = dv.DonViID)`;

  const query = `
        SELECT ${SELECT_DONVI_FIELDS},
               (SELECT COUNT(*) FROM DonVi dv_sub WHERE dv_sub.DonViChaID = dv.DonViID) AS SoLuongDonViCon
        ${FROM_JOIN_DONVI}
        WHERE dv.DonViID = @DonViId;
    `;
  const params = [{ name: 'DonViId', type: sql.Int, value: donViId }];
  let result;
  if (transaction) {
    const request = transaction.request();
    params.forEach((param) =>
      request.input(param.name, param.type, param.value)
    );
    result = await request.query(query);
  } else {
    result = await executeQuery(query, params);
  }
  if (result.recordset.length === 0) return null;

  const donViData = await mapRowToDonViListItem(result.recordset[0]);
  return donViData;
};

/**
 * Kiểm tra MaDonVi đã tồn tại chưa (dùng khi tạo/sửa).
 * @param {string} maDonVi - Mã đơn vị.
 * @param {number|null} excludeDonViID - Loại trừ ID này nếu truyền vào.
 * @returns {Promise<object|null>} Thông tin đơn vị hoặc null nếu không tìm thấy.
 */
const getDonViByMa = async (maDonVi, excludeDonViID = null) => {
  if (!maDonVi) return null;
  let query = `SELECT DonViID, MaDonVi FROM DonVi WHERE MaDonVi = @MaDonVi`;
  const params = [{ name: 'MaDonVi', type: sql.VarChar(50), value: maDonVi }];
  if (excludeDonViID) {
    query += ` AND DonViID <> @ExcludeDonViID`;
    params.push({
      name: 'ExcludeDonViID',
      type: sql.Int,
      value: excludeDonViID,
    });
  }
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Kiểm tra TenDonVi đã tồn tại chưa (dùng khi tạo/sửa).
 * @param {string} tenDonVi - Tên đơn vị.
 * @param {number|null} excludeDonViID - Loại trừ ID này nếu truyền vào.
 * @returns {Promise<object|null>} Thông tin đơn vị hoặc null nếu không tìm thấy.
 */
const getDonViByTen = async (tenDonVi, excludeDonViID = null) => {
  let query = `SELECT DonViID, TenDonVi FROM DonVi WHERE TenDonVi = @TenDonVi`;
  const params = [
    { name: 'TenDonVi', type: sql.NVarChar(200), value: tenDonVi },
  ];
  if (excludeDonViID) {
    query += ` AND DonViID <> @ExcludeDonViID`;
    params.push({
      name: 'ExcludeDonViID',
      type: sql.Int,
      value: excludeDonViID,
    });
  }
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Tạo mới bản ghi đơn vị.
 * @param {object} donViData - Dữ liệu đơn vị.
 * @param {sql.Transaction|null} transaction - Transaction tùy chọn.
 * @returns {Promise<number>} ID đơn vị vừa tạo.
 */
const createDonViRecord = async (donViData, transaction = null) => {
  const { tenDonVi, maDonVi, loaiDonVi, donViChaID, moTaDv } = donViData;
  const query = `
    INSERT INTO DonVi (TenDonVi, MaDonVi, LoaiDonVi, DonViChaID, MoTaDv)
    OUTPUT inserted.DonViID
    VALUES (@TenDonVi, @MaDonVi, @LoaiDonVi, @DonViChaID, @MoTaDv);
  `;
  const params = [
    { name: 'TenDonVi', type: sql.NVarChar(200), value: tenDonVi },
    { name: 'MaDonVi', type: sql.VarChar(50), value: maDonVi },
    { name: 'LoaiDonVi', type: sql.NVarChar(100), value: loaiDonVi },
    { name: 'DonViChaID', type: sql.Int, value: donViChaID },
    { name: 'MoTaDv', type: sql.NVarChar(500), value: moTaDv },
  ];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset[0].DonViID;
};

/**
 * Cập nhật bản ghi đơn vị theo ID.
 * @param {number} donViId - ID đơn vị.
 * @param {object} updateData - Dữ liệu cập nhật.
 * @param {sql.Transaction|null} transaction - Transaction tùy chọn.
 * @returns {Promise<object|null>} Thông tin đơn vị sau cập nhật hoặc null nếu không có gì thay đổi.
 */
const updateDonViRecordById = async (
  donViId,
  updateData,
  transaction = null
) => {
  const setClauses = [];
  const params = [{ name: 'DonViID', type: sql.Int, value: donViId }];

  const addUpdateField = (dbField, paramName, paramType, value) => {
    if (value !== undefined) {
      setClauses.push(`${dbField} = @${paramName}`);
      params.push({ name: paramName, type: paramType, value });
    }
  };

  addUpdateField(
    'TenDonVi',
    'TenDonVi',
    sql.NVarChar(200),
    updateData.tenDonVi
  );
  addUpdateField('MaDonVi', 'MaDonVi', sql.VarChar(50), updateData.maDonVi);
  addUpdateField(
    'LoaiDonVi',
    'LoaiDonVi',
    sql.NVarChar(100),
    updateData.loaiDonVi
  );
  addUpdateField('DonViChaID', 'DonViChaID', sql.Int, updateData.donViChaID); // Cho phép set NULL
  addUpdateField('MoTaDv', 'MoTaDv', sql.NVarChar(500), updateData.moTaDv);

  if (setClauses.length === 0) {
    return { DonViID: donViId }; // Không có gì để cập nhật
  }

  const query = `
        UPDATE DonVi
        SET ${setClauses.join(', ')}
        OUTPUT inserted.DonViID
        WHERE DonViID = @DonViID;
    `;
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Kiểm tra các ràng buộc trước khi xóa Đơn vị.
 * @param {number} donViId - ID đơn vị.
 * @param {sql.Transaction|null} transaction - Transaction tùy chọn.
 * @returns {Promise<object>} Thông tin các ràng buộc liên quan.
 */
const checkDonViUsage = async (donViId, transaction = null) => {
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  request.input('DonViID', sql.Int, donViId);

  const results = await Promise.all([
    request.query(
      'SELECT COUNT(*) as count FROM DonVi WHERE DonViChaID = @DonViID'
    ), // Đơn vị con
    request.query(
      'SELECT COUNT(*) as count FROM NganhHoc WHERE KhoaQuanLyID = @DonViID'
    ), // Ngành học quản lý
    request.query(
      'SELECT COUNT(*) as count FROM LopHoc lh JOIN NganhHoc nh ON lh.NganhHocID = nh.NganhHocID WHERE nh.KhoaQuanLyID = @DonViID'
    ), // Lớp học (qua ngành)
    request.query(
      'SELECT COUNT(*) as count FROM NguoiDung_VaiTro WHERE DonViID = @DonViID AND (NgayKetThuc IS NULL OR NgayKetThuc >= GETDATE())'
    ), // Người dùng có vai trò tại ĐV
    request.query(
      'SELECT COUNT(*) as count FROM SuKien WHERE DonViChuTriID = @DonViID'
    ), // Sự kiện chủ trì
    request.query(
      'SELECT COUNT(*) as count FROM SK_DonViThamGia WHERE DonViID = @DonViID'
    ), // Sự kiện tham gia
    request.query(
      'SELECT COUNT(*) as count FROM ToaNha WHERE CoSoID = @DonViID'
    ), // Tòa nhà (nếu đơn vị là Cơ Sở)
    // Thêm các kiểm tra khác nếu cần (ThanhVienCLB nếu đơn vị là CLB, ...)
  ]);

  return {
    hasChildren: results[0].recordset[0].count > 0,
    hasNganhHoc: results[1].recordset[0].count > 0,
    hasLopHoc: results[2].recordset[0].count > 0,
    hasNguoiDungVaiTro: results[3].recordset[0].count > 0,

    hasSuKienChuTri: results[5].recordset[0].count > 0,
    hasSuKienThamGia: results[6].recordset[0].count > 0,
    hasPhongQuanLy: results[7].recordset[0].count > 0,
    hasToaNha: results[8].recordset[0].count > 0,
  };
};

/**
 * Xóa bản ghi đơn vị theo ID.
 * @param {number} donViId - ID đơn vị.
 * @param {sql.Transaction|null} transaction - Transaction tùy chọn.
 * @returns {Promise<number>} Số bản ghi bị xóa (0 hoặc 1).
 */
const deleteDonViRecordById = async (donViId, transaction = null) => {
  const query = `DELETE FROM DonVi WHERE DonViID = @DonViID;`;
  const params = [{ name: 'DonViID', type: sql.Int, value: donViId }];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.rowsAffected[0];
};

/**
 * Lấy danh sách đơn vị cha tiềm năng cho select.
 * @param {number|null} excludeDonViId - Loại trừ đơn vị này (và con cháu nếu cần).
 * @param {string|null} searchTerm - Từ khóa tìm kiếm.
 * @param {number} limit - Giới hạn số lượng kết quả.
 * @returns {Promise<Array<object>>} Danh sách đơn vị cha phù hợp.
 */
const getDonViChaOptionsFromDB = async (
  excludeDonViId = null,
  searchTerm = null,
  limit = 50
) => {
  let query = `
        SELECT TOP (@Limit) DonViID, TenDonVi, MaDonVi, LoaiDonVi
        FROM DonVi
        WHERE 1=1
    `;
  const queryParams = [{ name: 'Limit', type: sql.Int, value: limit }];

  if (excludeDonViId) {
    // Loại trừ chính nó và các con cháu của nó (cần hàm đệ quy để lấy allChildren)
    // Để đơn giản, hiện tại chỉ loại trừ chính nó.
    // tạo hàm getAllChildDonViIds từ service, có thể truyền danh sách ID đó vào đây.
    query += ` AND DonViID <> @ExcludeDonViId `;
    queryParams.push({
      name: 'ExcludeDonViId',
      type: sql.Int,
      value: excludeDonViId,
    });
    // Nếu muốn loại trừ cả con cháu:
    // query += ` AND DonViID NOT IN (SELECT ID FROM dbo.fnGetAllChildrenOfDonVi(@ExcludeDonViId)) `
    // (Yêu cầu có user-defined function fnGetAllChildrenOfDonVi)
  }
  if (searchTerm) {
    query += ` AND (TenDonVi LIKE @SearchTerm OR MaDonVi LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }
  // Thêm điều kiện loại trừ các loại đơn vị không thể làm cha (ví dụ: CLB không thể là cha của Khoa)
  query += ` AND LoaiDonVi IN ('KHOA', 'PHONG', 'BAN', 'TRUNG_TAM', 'DOAN_THE', 'CO_SO') `;

  query += ` ORDER BY TenDonVi ASC;`;
  const result = await executeQuery(query, queryParams);
  return result.recordset;
};

export const donViRepository = {
  getDonViListWithPagination,
  getDonViById,
  getDonViByMa,
  getDonViByTen,
  createDonViRecord,
  updateDonViRecordById,
  checkDonViUsage,
  deleteDonViRecordById,
  getDonViChaOptionsFromDB,
};
