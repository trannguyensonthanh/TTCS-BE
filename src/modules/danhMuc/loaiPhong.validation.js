// src/modules/phong/loaiPhong.validation.js
import Joi from 'joi';
import validate from '../../utils/validation.utils.js';

const getLoaiPhongsParamsSchema = Joi.object({
  isActive: Joi.boolean().default(true),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(100),
  searchTerm: Joi.string().allow('').optional(),
  sortBy: Joi.string().optional().default('TenLoaiPhong'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

/**
 * Middleware validate query params cho API lấy danh sách loại phòng.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {void} Trả về lỗi 400 nếu không hợp lệ, gọi next() nếu hợp lệ
 */
export const loaiPhongValidation = {
  validateGetLoaiPhongsParams: validate(getLoaiPhongsParamsSchema, 'query'),
};
