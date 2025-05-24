// src/modules/donVi/donVi.validation.js
import Joi from 'joi';
import validate from '../../utils/validation.utils.js';

// ... (import validate function, httpStatus, ApiError)

const getDonVisParamsSchema = Joi.object({
  loaiDonVi: Joi.string().allow('').optional(),
  searchTerm: Joi.string().allow('').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(20), // Giới hạn lớn hơn cho danh sách chọn
  sortBy: Joi.string().optional().default('TenDonVi'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

export const donViValidation = {
  validateGetDonVisParams: validate(getDonVisParamsSchema, 'query'),
};
