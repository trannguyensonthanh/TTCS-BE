// src/modules/thongBao/thongBao.controller.js
import { thongBaoService } from './thongBao.service.js';
import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

const getThongBaoCuaToiController = async (req, res) => {
  const nguoiDungID = req.user.nguoiDungID; // Từ authMiddleware
  const queryParams = pick(req.query, ['limit', 'page', 'chiChuaDoc']);
  const result = await thongBaoService.getThongBaoCuaToi(
    nguoiDungID,
    queryParams
  );
  okResponse(res, result, 'Lấy danh sách thông báo thành công.');
};

const danhDauDaDocController = async (req, res) => {
  const thongBaoID = parseInt(req.params.id);
  const nguoiDungID = req.user.nguoiDungID;
  const result = await thongBaoService.danhDauDaDoc(thongBaoID, nguoiDungID);
  okResponse(res, result, result.message);
};

const danhDauTatCaDaDocController = async (req, res) => {
  const nguoiDungID = req.user.nguoiDungID;
  const result = await thongBaoService.danhDauTatCaDaDoc(nguoiDungID);
  okResponse(res, { countUpdated: result.countUpdated }, result.message);
};

export const thongBaoController = {
  getThongBaoCuaToiController,
  danhDauDaDocController,
  danhDauTatCaDaDocController,
};
