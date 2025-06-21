import { dashboardService } from './dashboard.service.js';
import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

const getPublicDashboardKpiController = async (req, res) => {
  const params = pick(req.query, ['thoiGian']);
  const result = await dashboardService.getPublicDashboardKpi(params);
  okResponse(res, result, 'Lấy dữ liệu KPI dashboard công khai thành công.');
};

export const dashboardController = {
  getPublicDashboardKpiController,
};
