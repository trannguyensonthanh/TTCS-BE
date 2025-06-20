// src/modules/loaiSuKien/loaiSuKien.validation.js
import Joi from 'joi';
import validate from '../../utils/validation.utils.js';

const createLoaiSKSchema = Joi.object({
  maLoaiSK: Joi.string().max(50).required().messages({
    'string.base': 'Mã loại sự kiện phải là chuỗi',
    'string.max': 'Mã loại sự kiện không được vượt quá {#limit} ký tự',
    'any.required': 'Mã loại sự kiện là bắt buộc',
  }),
  tenLoaiSK: Joi.string().max(150).required().messages({
    'string.base': 'Tên loại sự kiện phải là chuỗi',
    'string.max': 'Tên loại sự kiện không được vượt quá {#limit} ký tự',
    'any.required': 'Tên loại sự kiện là bắt buộc',
  }),
  moTaLoaiSK: Joi.string().max(500).allow('', null).optional(),
  isActive: Joi.boolean().default(true),
});

const updateLoaiSKSchema = Joi.object({
  maLoaiSK: Joi.string().max(50).optional(),
  tenLoaiSK: Joi.string().max(150).optional(),
  moTaLoaiSK: Joi.string().max(500).allow('', null).optional(),
  isActive: Joi.boolean().optional(),
}).min(1); // Phải có ít nhất một trường để cập nhật

const loaiSuKienIDParamSchema = Joi.object({
  loaiSKId: Joi.number().integer().positive().required().messages({
    // Sửa thành loaiSKId
    'number.base': 'ID loại sự kiện phải là số',
    'any.required': 'ID loại sự kiện là bắt buộc',
  }),
});

const getLoaiSKParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('').optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional().default('TenLoaiSK'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

/**
 * Middleware validate payload tạo mới loại sự kiện.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {void} Trả về lỗi 400 nếu không hợp lệ, gọi next() nếu hợp lệ
 */
// validateCreateLoaiSK

/**
 * Middleware validate payload cập nhật loại sự kiện.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {void} Trả về lỗi 400 nếu không hợp lệ, gọi next() nếu hợp lệ
 */
// validateUpdateLoaiSK

/**
 * Middleware validate param :loaiSKId cho các API loại sự kiện.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {void} Trả về lỗi 400 nếu không hợp lệ, gọi next() nếu hợp lệ
 */
// validateLoaiSKIdParam

/**
 * Middleware validate query params cho API lấy danh sách loại sự kiện.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {void} Trả về lỗi 400 nếu không hợp lệ, gọi next() nếu hợp lệ
 */
// validateGetLoaiSKParams

export const loaiSuKienValidation = {
  validateCreateLoaiSK: validate(createLoaiSKSchema),
  validateUpdateLoaiSK: validate(updateLoaiSKSchema),
  validateLoaiSKIdParam: validate(loaiSuKienIDParamSchema, 'params'),
  validateGetLoaiSKParams: validate(getLoaiSKParamsSchema, 'query'),
};
