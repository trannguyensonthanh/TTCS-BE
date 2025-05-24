// src/modules/nguoiDung/nguoiDung.controller.js
import { nguoiDungService } from './nguoiDung.service.js';
import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Controller để lấy danh sách người dùng
 */
const getNguoiDungsController = async (req, res) => {
  // Các tham số query đã được validate và có giá trị default bởi middleware validation
  const params = pick(req.query, [
    'searchTerm',
    'maVaiTro',
    'donViID',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await nguoiDungService.getNguoiDungs(params);
  okResponse(res, result, 'Lấy danh sách người dùng thành công.');
};

// Các controller khác cho module NguoiDung
// Ví dụ:
// const getNguoiDungByIdController = async (req, res) => {
//   const nguoiDung = await nguoiDungService.getNguoiDungById(parseInt(req.params.nguoiDungId));
//   okResponse(res, nguoiDung, 'Lấy chi tiết người dùng thành công.');
// };

export const nguoiDungController = {
  getNguoiDungsController,
  // getNguoiDungByIdController,
};
