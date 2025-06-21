// File: danhGiaSuKien.repository.js
// Chứa các hàm thao tác với bảng DanhGiaSK (đánh giá sự kiện)

import sql from 'mssql';
import { executeQuery } from '../../utils/database.js';

/**
 * [MỚI] Kiểm tra xem người dùng có được phép đánh giá sự kiện hay không.
 * Điều kiện: Sự kiện đã kết thúc VÀ người dùng đã chấp nhận lời mời.
 * @param {number} suKienID
 * @param {number} nguoiDungID
 * @returns {Promise<object|null>} Trả về thông tin nếu hợp lệ, ngược lại null.
 */
const checkRatingEligibility = async (suKienID, nguoiDungID) => {
  const query = `
        SELECT 
            sk.SuKienID
        FROM SuKien sk
        JOIN SK_MoiThamGia skm ON sk.SuKienID = skm.SuKienID
        JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
        WHERE 
            sk.SuKienID = @SuKienID
            AND skm.NguoiDuocMoiID = @NguoiDungID
            AND skm.IsChapNhanMoi = 1
            AND (ttsk.MaTrangThai = 'HOAN_THANH' OR sk.TgKetThucDK < GETDATE());
    `;
  const params = [
    { name: 'SuKienID', type: sql.Int, value: suKienID },
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
  ];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * [MỚI] Kiểm tra xem người dùng đã đánh giá sự kiện này trước đó chưa.
 * @param {number} suKienID
 * @param {number} nguoiDungID
 * @returns {Promise<boolean>} True nếu đã tồn tại đánh giá.
 */
const checkIfRatingExists = async (suKienID, nguoiDungID) => {
  const query = `
        SELECT TOP 1 DanhGiaSkID 
        FROM DanhGiaSK 
        WHERE SuKienID = @SuKienID AND NguoiDanhGiaID = @NguoiDungID;
    `;
  const params = [
    { name: 'SuKienID', type: sql.Int, value: suKienID },
    { name: 'NguoiDungID', type: sql.Int, value: nguoiDungID },
  ];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0;
};

/**
 * [MỚI] Tạo một bản ghi đánh giá mới.
 * @param {object} ratingData - Dữ liệu đánh giá.
 * @returns {Promise<object>} Bản ghi đánh giá vừa được tạo.
 */
const createRating = async (ratingData) => {
  const {
    suKienID,
    nguoiDanhGiaID,
    diemNoiDung,
    diemToChuc,
    diemDiaDiem,
    yKienDongGop,
  } = ratingData;

  const query = `
        INSERT INTO DanhGiaSK (
            SuKienID, NguoiDanhGiaID, DiemNoiDung, DiemToChuc, DiemDiaDiem, YKienDongGop, TgDanhGia
        )
        OUTPUT inserted.*
        VALUES (
            @SuKienID, @NguoiDanhGiaID, @DiemNoiDung, @DiemToChuc, @DiemDiaDiem, @YKienDongGop, GETDATE()
        );
    `;
  const params = [
    { name: 'SuKienID', type: sql.Int, value: suKienID },
    { name: 'NguoiDanhGiaID', type: sql.Int, value: nguoiDanhGiaID },
    { name: 'DiemNoiDung', type: sql.TinyInt, value: diemNoiDung },
    { name: 'DiemToChuc', type: sql.TinyInt, value: diemToChuc },
    { name: 'DiemDiaDiem', type: sql.TinyInt, value: diemDiaDiem },
    { name: 'YKienDongGop', type: sql.NVarChar(sql.MAX), value: yKienDongGop },
  ];

  const result = await executeQuery(query, params);
  return result.recordset[0];
};

/**
 * [MỚI] Lấy một bản ghi đánh giá theo ID của nó.
 * @param {number} danhGiaSkID
 * @returns {Promise<object|null>} Bản ghi đánh giá hoặc null nếu không tìm thấy.
 */
const getRatingById = async (danhGiaSkID) => {
  const query = `SELECT * FROM DanhGiaSK WHERE DanhGiaSkID = @DanhGiaSkID;`;
  const params = [
    { name: 'DanhGiaSkID', type: sql.BigInt, value: danhGiaSkID },
  ];
  const result = await executeQuery(query, params);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * [MỚI] Cập nhật một bản ghi đánh giá.
 * @param {number} danhGiaSkID
 * @param {object} updateData - Dữ liệu cần cập nhật.
 * @returns {Promise<object>} Bản ghi đã được cập nhật.
 */
const updateRating = async (danhGiaSkID, updateData) => {
  const setClauses = [];
  const params = [
    { name: 'DanhGiaSkID', type: sql.BigInt, value: danhGiaSkID },
  ];

  if (updateData.diemNoiDung !== undefined) {
    setClauses.push('DiemNoiDung = @DiemNoiDung');
    params.push({
      name: 'DiemNoiDung',
      type: sql.TinyInt,
      value: updateData.diemNoiDung,
    });
  }
  if (updateData.diemToChuc !== undefined) {
    setClauses.push('DiemToChuc = @DiemToChuc');
    params.push({
      name: 'DiemToChuc',
      type: sql.TinyInt,
      value: updateData.diemToChuc,
    });
  }
  if (updateData.diemDiaDiem !== undefined) {
    setClauses.push('DiemDiaDiem = @DiemDiaDiem');
    params.push({
      name: 'DiemDiaDiem',
      type: sql.TinyInt,
      value: updateData.diemDiaDiem,
    });
  }
  if (updateData.yKienDongGop !== undefined) {
    setClauses.push('YKienDongGop = @YKienDongGop');
    params.push({
      name: 'YKienDongGop',
      type: sql.NVarChar(sql.MAX),
      value: updateData.yKienDongGop,
    });
  }

  if (setClauses.length === 0) {
    return getRatingById(danhGiaSkID);
  }

  setClauses.push('TgDanhGia = GETDATE()');

  const query = `
        UPDATE DanhGiaSK
        SET ${setClauses.join(', ')}
        OUTPUT inserted.*
        WHERE DanhGiaSkID = @DanhGiaSkID;
    `;

  const result = await executeQuery(query, params);
  return result.recordset[0];
};

/**
 * [MỚI] Xóa một bản ghi đánh giá theo ID.
 * @param {number} danhGiaSkID - ID của đánh giá cần xóa.
 * @returns {Promise<number>} Số dòng bị ảnh hưởng (0 hoặc 1).
 */
const deleteRatingById = async (danhGiaSkID) => {
  const query = `DELETE FROM DanhGiaSK WHERE DanhGiaSkID = @DanhGiaSkID;`;
  const params = [
    { name: 'DanhGiaSkID', type: sql.BigInt, value: danhGiaSkID },
  ];
  const result = await executeQuery(query, params);
  return result.rowsAffected[0];
};

export const danhGiaSuKienRepository = {
  checkRatingEligibility,
  checkIfRatingExists,
  createRating,
  getRatingById,
  updateRating,
  deleteRatingById,
};
