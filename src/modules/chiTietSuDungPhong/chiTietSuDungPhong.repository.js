// src/modules/chiTietSuDungPhong/chiTietSuDungPhong.repository.js
import sql from 'mssql';
import { executeQuery } from '../../utils/database.js';
import MaTrangThaiSK from '../../enums/maTrangThaiSK.enum.js';
import MaTrangThaiYeuCauPhong from '../../enums/maTrangThaiYeuCauPhong.enum.js';
import MaTrangThaiYeuCauDoiPhong from '../../enums/maTrangThaiYeuCauDoiPhong.enum.js';

/**
 * Lấy danh sách các phòng đã đặt đang hoạt động mà người dùng có thể yêu cầu đổi.
 * @param {object} params - Tham số truy vấn ({ nguoiYeuCauID: number, limit?: number })
 * @returns {Promise<Array<object>>} Danh sách phòng đã đặt còn hiệu lực
 */
const getActiveBookedRoomsForChange = async (params) => {
  const { nguoiYeuCauID, limit = 20 } = params;

  const skAllowChangeStatusCodes = [MaTrangThaiSK.DA_XAC_NHAN_PHONG]
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
          AND ttsk.MaTrangThai IN (${skAllowChangeStatusCodes})
          AND tt_yct.MaTrangThai = @MaYcChiTietDaXepPhong
          -- AND sk.TgBatDauDK > DATEADD(day, 7, SYSUTCDATETIME()) -- Sự kiện phải còn ít nhất 7 ngày nữa mới diễn ra (điều chỉnh sau)
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
