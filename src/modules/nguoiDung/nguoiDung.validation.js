// src/modules/nguoiDung/nguoiDung.validation.js
import Joi from 'joi';
import validate from '../../utils/validation.utils.js';
// ... (import validate function, httpStatus, ApiError)

const getNguoiDungsParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('').optional(),
  maVaiTro: Joi.string().allow('').optional(), // Mã vai trò từ VaiTroHeThong
  donViID: Joi.number().integer().positive().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(20),
  sortBy: Joi.string().optional().default('HoTen'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

export const nguoiDungValidation = {
  validateGetNguoiDungsParams: validate(getNguoiDungsParamsSchema, 'query'),
};
