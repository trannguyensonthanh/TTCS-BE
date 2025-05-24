// src/modules/chiTietSuDungPhong/chiTietSuDungPhong.repository.js
import { executeQuery } from '../../utils/database.js';
import sql from 'mssql';
import MaTrangThaiSK from '../../enums/maTrangThaiSK.enum.js';
import MaTrangThaiYeuCauPhong from '../../enums/maTrangThaiYeuCauPhong.enum.js';
import MaTrangThaiYeuCauDoiPhong from '../../enums/maTrangThaiYeuCauDoiPhong.enum.js';

/**
 * Lấy danh sách các phòng đã đặt đang hoạt động mà người dùng có thể yêu cầu đổi.
 * Điều kiện:
 * - Sự kiện phải ở trạng thái DA_XAC_NHAN_PHONG (hoặc các trạng thái tương đương mà việc đổi phòng còn hợp lý).
 * - YcMuonPhongChiTiet phải ở trạng thái DA_XEP_PHONG.
 * - ChiTietDatPhong đó chưa có YeuCauDoiPhong nào đang CHO_DUYET_DOI_PHONG.
 * - Thời gian sự kiện (TgBatDauDK) chưa qua (hoặc còn đủ thời gian để đổi theo quy định).
 * @param {object} params - { nguoiYeuCauID, limit }
 * @returns {Promise<Array<object>>}
 */
const getActiveBookedRoomsForChange = async (params) => {
  const { nguoiYeuCauID, limit = 20 } = params;

  // Các mã trạng thái sự kiện cho phép đổi phòng
  const skAllowChangeStatusCodes = [
    MaTrangThaiSK.DA_XAC_NHAN_PHONG,
    // MaTrangThaiSK.CHO_DUYET_PHONG, // Có thể xem xét nếu muốn đổi cả khi phòng chưa duyệt xong hết
  ]
    .map((code) => `'${code}'`)
    .join(',');

  const query = `
        SELECT TOP (@Limit)
            cdp.DatPhongID,
            cdp.YcMuonPhongCtID,
            p.PhongID,
            p.TenPhong,
            p.MaPhong,
            sk.TenSK,
            cdp.TgNhanPhongTT,
            cdp.TgTraPhongTT
        FROM ChiTietDatPhong cdp
        JOIN Phong p ON cdp.PhongID = p.PhongID
        JOIN YcMuonPhongChiTiet yct ON cdp.YcMuonPhongCtID = yct.YcMuonPhongCtID
        JOIN YeuCauMuonPhong yc ON yct.YcMuonPhongID = yc.YcMuonPhongID
        JOIN SuKien sk ON yc.SuKienID = sk.SuKienID
        JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
        JOIN TrangThaiYeuCauPhong tt_yct ON yct.TrangThaiCtID = tt_yct.TrangThaiYcpID
        WHERE yc.NguoiYeuCauID = @NguoiYeuCauID
          AND ttsk.MaTrangThai IN (${skAllowChangeStatusCodes}) -- Sự kiện phải ở trạng thái cho phép
          AND tt_yct.MaTrangThai = @MaYcChiTietDaXepPhong -- Chi tiết yêu cầu phải đã được xếp phòng
          AND sk.TgBatDauDK > DATEADD(day, 7, GETDATE()) -- Ví dụ: Sự kiện phải còn ít nhất 7 ngày nữa mới diễn ra
          AND NOT EXISTS ( -- Chưa có yêu cầu đổi phòng nào đang chờ duyệt cho bản ghi ChiTietDatPhong này
                SELECT 1
                FROM YeuCauDoiPhong ycdp_check
                JOIN TrangThaiYeuCauDoiPhong tt_ycdp_check ON ycdp_check.TrangThaiYcDoiPID = tt_ycdp_check.TrangThaiYcDoiPID
                WHERE ycdp_check.DatPhongID_Cu = cdp.DatPhongID
                  AND tt_ycdp_check.MaTrangThai = @MaYCDPDangChoDuyet
            )
        ORDER BY sk.TgBatDauDK ASC, sk.TenSK ASC, p.TenPhong ASC;
    `;

  const queryParams = [
    { name: 'NguoiYeuCauID', type: sql.Int, value: nguoiYeuCauID },
    { name: 'Limit', type: sql.Int, value: limit },
    {
      name: 'MaYcChiTietDaXepPhong',
      type: sql.VarChar,
      value: MaTrangThaiYeuCauPhong.YCCPCT_DA_XEP_PHONG,
    },
    {
      name: 'MaYCDPDangChoDuyet',
      type: sql.VarChar,
      value: MaTrangThaiYeuCauDoiPhong.CHO_DUYET_DOI_PHONG,
    },
  ];

  const result = await executeQuery(query, queryParams);
  return result.recordset.map((row) => ({
    datPhongID: Number(row.DatPhongID),
    ycMuonPhongCtID: row.YcMuonPhongCtID,
    phongID: row.PhongID,
    tenPhong: row.TenPhong,
    maPhong: row.MaPhong,
    tenSK: row.TenSK,
    tgNhanPhongTT: row.TgNhanPhongTT.toISOString(),
    tgTraPhongTT: row.TgTraPhongTT.toISOString(),
  }));
};

export const chiTietSuDungPhongRepository = {
  getActiveBookedRoomsForChange,
};
