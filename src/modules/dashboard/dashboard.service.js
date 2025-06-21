import { dashboardRepository } from './dashboard.repository.js';

/**
 * [MỚI] Lấy dữ liệu cho các thẻ KPI Dashboard công khai.
 */
const getPublicDashboardKpi = async (params) => {
  const kpiData = await dashboardRepository.getPublicKpiData(params);

  const tinTucMoiNhat = null;

  return {
    suKienSapDienRa: kpiData.SuKienSapDienRa,
    suKienDangDienRa: kpiData.SuKienDangDienRa,
    tongSoPhongKhaDung: kpiData.TongSoPhongKhaDung,
    tinTucMoiNhat,
  };
};

export const dashboardService = {
  getPublicDashboardKpi,
};
