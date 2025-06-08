// src/modules/chuyenNganh/chuyenNganh.validation.js
import Joi from 'joi';
import validate from '../../utils/validation.utils.js';

const nganhHocIdParamSchema = Joi.object({
  nganhHocId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Ngành học là bắt buộc' }),
});

const getChuyenNganhForSelectParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(200).default(100),
});

const idParamSchemaCN = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Chuyên ngành là bắt buộc' }),
});

const createChuyenNganhPayloadSchema = Joi.object({
  tenChuyenNganh: Joi.string().max(200).required(),
  maChuyenNganh: Joi.string().max(50).allow('', null).optional(),
  moTaCN: Joi.string().allow('', null).optional(),
});

const updateChuyenNganhPayloadSchema = Joi.object({
  tenChuyenNganh: Joi.string().max(200).optional(),
  maChuyenNganh: Joi.string().max(50).allow('', null).optional(),
  moTaCN: Joi.string().allow('', null).optional(),
}).min(1);

/**
 * Middleware validate param :nganhHocId cho các API chuyên ngành.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {void} Trả về lỗi 400 nếu không hợp lệ, gọi next() nếu hợp lệ
 */
// validateNganhHocIdParam

/**
 * Middleware validate query params cho API lấy danh sách chuyên ngành để chọn.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {void} Trả về lỗi 400 nếu không hợp lệ, gọi next() nếu hợp lệ
 */
// validateGetChuyenNganhForSelectParams

/**
 * Middleware validate param :id cho các API chuyên ngành.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {void} Trả về lỗi 400 nếu không hợp lệ, gọi next() nếu hợp lệ
 */
// validateIdParam

/**
 * Middleware validate payload tạo mới chuyên ngành.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {void} Trả về lỗi 400 nếu không hợp lệ, gọi next() nếu hợp lệ
 */
// validateCreateChuyenNganhPayload

/**
 * Middleware validate payload cập nhật chuyên ngành.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {void} Trả về lỗi 400 nếu không hợp lệ, gọi next() nếu hợp lệ
 */
// validateUpdateChuyenNganhPayload

export const chuyenNganhValidation = {
  validateNganhHocIdParam: validate(nganhHocIdParamSchema, 'params'),
  validateGetChuyenNganhForSelectParams: validate(
    getChuyenNganhForSelectParamsSchema,
    'query'
  ),
  validateIdParam: validate(idParamSchemaCN, 'params'),
  validateCreateChuyenNganhPayload: validate(createChuyenNganhPayloadSchema),
  validateUpdateChuyenNganhPayload: validate(updateChuyenNganhPayloadSchema),
};
