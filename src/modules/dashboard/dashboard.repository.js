import sql from 'mssql';
import { executeQuery } from '../../utils/database.js';
import MaTrangThaiSK from '../../enums/maTrangThaiSK.enum.js';

/**
 * [MỚI] Lấy dữ liệu KPI cho Dashboard Công khai.
 * @param {object} params - { thoiGian }
 * @returns {Promise<object>} Dữ liệu KPI thô.
 */
const getPublicKpiData = async (params) => {
  const { thoiGian } = params;

  let dateFilterClause = '';
  const queryParams = [];

  const now = 'GETDATE()';
  switch (thoiGian) {
    case 'HOM_NAY':
      dateFilterClause = `AND CAST(sk.TgBatDauDK AS DATE) = CAST(${now} AS DATE)`;
      break;
    case 'TUAN_NAY':
      dateFilterClause = `AND DATEPART(iso_week, sk.TgBatDauDK) = DATEPART(iso_week, ${now}) AND YEAR(sk.TgBatDauDK) = YEAR(${now})`;
      break;
    case 'THANG_NAY':
      dateFilterClause = `AND MONTH(sk.TgBatDauDK) = MONTH(${now}) AND YEAR(sk.TgBatDauDK) = YEAR(${now})`;
      break;
    case 'SAP_TOI_7_NGAY':
    default:
      dateFilterClause = `AND sk.TgBatDauDK BETWEEN ${now} AND DATEADD(day, 7, ${now})`;
      break;
  }

  const kpiQuery = `
        -- Đếm sự kiện sắp diễn ra trong khoảng thời gian đã chọn
        DECLARE @SuKienSapDienRa INT;
        SELECT @SuKienSapDienRa = COUNT(DISTINCT sk.SuKienID)
        FROM SuKien sk
        JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
        WHERE sk.IsCongKhaiNoiBo = 1
          AND ttsk.MaTrangThai NOT IN ('${MaTrangThaiSK.DA_HUY}', '${MaTrangThaiSK.HOAN_THANH}')
          ${dateFilterClause};

        -- Đếm sự kiện đang diễn ra ngay bây giờ
        DECLARE @SuKienDangDienRa INT;
        SELECT @SuKienDangDienRa = COUNT(DISTINCT sk.SuKienID)
        FROM SuKien sk
        JOIN TrangThaiSK ttsk ON sk.TrangThaiSkID = ttsk.TrangThaiSkID
        WHERE sk.IsCongKhaiNoiBo = 1
          AND ttsk.MaTrangThai NOT IN ('${MaTrangThaiSK.DA_HUY}', '${MaTrangThaiSK.HOAN_THANH}')
          AND ${now} BETWEEN sk.TgBatDauDK AND sk.TgKetThucDK;

        -- Đếm phòng sẵn sàng
        DECLARE @PhongKhaDung INT;
        SELECT @PhongKhaDung = COUNT(*)
        FROM Phong p
        JOIN TrangThaiPhong ttp ON p.TrangThaiPhongID = ttp.TrangThaiPhongID
        WHERE ttp.MaTrangThai = 'SAN_SANG';

        -- Trả về kết quả
        SELECT 
            @SuKienSapDienRa AS SuKienSapDienRa,
            @SuKienDangDienRa AS SuKienDangDienRa,
            @PhongKhaDung AS TongSoPhongKhaDung;
    `;

  const result = await executeQuery(kpiQuery, queryParams);
  return result.recordset[0];
};

export const dashboardRepository = {
  getPublicKpiData,
};
