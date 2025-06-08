// src/modules/loaiTang/loaiTang.validation.js
import Joi from 'joi';
import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';
import validate from '../../utils/validation.utils.js';

const getLoaiTangParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  page: Joi.number().integer().min(1).default(1).allow(null).optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .allow(null)
    .optional(),
  sortBy: Joi.string().allow(null).optional(), // VD: 'SoThuTu', 'TenLoaiTang'
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('asc')
    .allow(null)
    .optional(),
});

const idParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Loại tầng là bắt buộc' }),
});

const createLoaiTangPayloadSchema = Joi.object({
  maLoaiTang: Joi.string().max(20).required().messages({
    'string.max': 'Mã loại tầng không quá 20 ký tự',
    'any.required': 'Mã loại tầng là bắt buộc',
  }),
  tenLoaiTang: Joi.string().max(100).required().messages({
    'string.max': 'Tên loại tầng không quá 100 ký tự',
    'any.required': 'Tên loại tầng là bắt buộc',
  }),
  soThuTu: Joi.number().integer().allow(null).optional(),
  moTa: Joi.string().max(255).allow('', null).optional(),
});

const updateLoaiTangPayloadSchema = Joi.object({
  maLoaiTang: Joi.string().max(20).optional(),
  tenLoaiTang: Joi.string().max(100).optional(),
  soThuTu: Joi.number().integer().allow(null).optional(),
  moTa: Joi.string().max(255).allow('', null).optional(),
})
  .min(1)
  .messages({
    'object.min': 'Cần ít nhất một trường để cập nhật thông tin loại tầng.',
  });

/**
 * Middleware validate query params cho API lấy danh sách loại tầng.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {void} Trả về lỗi 400 nếu không hợp lệ, gọi next() nếu hợp lệ
 */
// validateGetLoaiTangParams

/**
 * Middleware validate param :id cho các API loại tầng.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {void} Trả về lỗi 400 nếu không hợp lệ, gọi next() nếu hợp lệ
 */
// validateIdParam

/**
 * Middleware validate payload tạo mới loại tầng.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {void} Trả về lỗi 400 nếu không hợp lệ, gọi next() nếu hợp lệ
 */
// validateCreateLoaiTangPayload

/**
 * Middleware validate payload cập nhật loại tầng.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {void} Trả về lỗi 400 nếu không hợp lệ, gọi next() nếu hợp lệ
 */
// validateUpdateLoaiTangPayload

export const loaiTangValidation = {
  validateGetLoaiTangParams: validate(getLoaiTangParamsSchema, 'query'),
  validateIdParam: validate(idParamSchema, 'params'),
  validateCreateLoaiTangPayload: validate(createLoaiTangPayloadSchema),
  validateUpdateLoaiTangPayload: validate(updateLoaiTangPayloadSchema),
};
