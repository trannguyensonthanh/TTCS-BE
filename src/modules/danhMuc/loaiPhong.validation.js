// src/modules/phong/loaiPhong.validation.js (Hoặc phong.validation.js)
import Joi from 'joi';
import validate from '../../utils/validation.utils.js';
// ... (validate function) ...

const getLoaiPhongsParamsSchema = Joi.object({
  isActive: Joi.boolean().default(true),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(100), // Lấy nhiều cho select
  searchTerm: Joi.string().allow('').optional(),
  sortBy: Joi.string().optional().default('TenLoaiPhong'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

export const loaiPhongValidation = {
  // Hoặc phongValidation
  validateGetLoaiPhongsParams: validate(getLoaiPhongsParamsSchema, 'query'),
};
