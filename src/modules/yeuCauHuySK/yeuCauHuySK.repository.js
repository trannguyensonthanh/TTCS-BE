// src/modules/yeuCauHuySK/yeuCauHuySK.repository.js
import { executeQuery } from '../../utils/database.js';
import sql from 'mssql';
// Import các enums cần thiết
import MaTrangThaiSK from '../../enums/maTrangThaiSK.enum.js';
import MaTrangThaiYeuCauHuySK from '../../enums/maTrangThaiYeuCauHuySK.enum.js';

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

export const yeuCauHuySKRepository = {
  findSuKienForCancellationRequest,
  checkExistingPendingCancellationRequest,
  createYeuCauHuySKRecord,
  updateSuKienTrangThai,
  getTrangThaiIDByMa, // Hàm tiện ích
};
