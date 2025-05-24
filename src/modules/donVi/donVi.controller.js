// src/modules/donVi/donVi.controller.js
import { donViService } from './donVi.service.js';
import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

const getDonVisController = async (req, res) => {
  const params = pick(req.query, [
    'loaiDonVi',
    'searchTerm',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await donViService.getDonVis(params);
  okResponse(res, result, 'Lấy danh sách đơn vị thành công.');
};

export const donViController = {
  getDonVisController,
};
