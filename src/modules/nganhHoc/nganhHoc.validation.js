// src/modules/nganhHoc/nganhHoc.validation.js
import Joi from 'joi';
import validate from '../../utils/validation.utils.js';

/**
 * Schema validate param nganhHocId trong path.
 * @type {Joi.ObjectSchema}
 */
const nganhHocIdParamSchema = Joi.object({
  nganhHocId: Joi.number().integer().positive().required().messages({
    'any.required': 'ID Ngành học là bắt buộc trong path parameter',
  }),
});

/**
 * Schema validate query params lấy danh sách ngành học cho select option.
 * @type {Joi.ObjectSchema}
 */
const getNganhHocForSelectParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  khoaQuanLyID: Joi.number().integer().positive().allow(null).optional(),
  limit: Joi.number().integer().min(1).max(500).default(200),
});

/**
 * Schema validate query params lấy danh sách ngành học (phân trang, filter).
 * @type {Joi.ObjectSchema}
 */
const getNganhHocParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  khoaQuanLyID: Joi.number().integer().positive().allow(null).optional(),
  coChuyenNganh: Joi.boolean().allow(null).optional(),
  page: Joi.number().integer().min(1).default(1).allow(null).optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .allow(null)
    .optional(),
  sortBy: Joi.string().allow(null).optional(),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('asc')
    .allow(null)
    .optional(),
});

/**
 * Schema validate param id ngành học.
 * @type {Joi.ObjectSchema}
 */
const idParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Ngành học là bắt buộc' }),
});

/**
 * Schema validate payload tạo mới ngành học.
 * @type {Joi.ObjectSchema}
 */
const createNganhHocPayloadSchema = Joi.object({
  tenNganhHoc: Joi.string().max(200).required(),
  maNganhHoc: Joi.string().max(50).allow('', null).optional(),
  khoaQuanLyID: Joi.number().integer().positive().required(),
  moTaNH: Joi.string().allow('', null).optional(),
  coChuyenNganh: Joi.boolean().required(),
});

/**
 * Schema validate payload cập nhật ngành học.
 * @type {Joi.ObjectSchema}
 */
const updateNganhHocPayloadSchema = Joi.object({
  tenNganhHoc: Joi.string().max(200).optional(),
  maNganhHoc: Joi.string().max(50).allow('', null).optional(),
  khoaQuanLyID: Joi.number().integer().positive().optional(),
  moTaNH: Joi.string().allow('', null).optional(),
  coChuyenNganh: Joi.boolean().optional(),
}).min(1);

/**
 * Middleware validate query params lấy danh sách ngành học cho select option.
 * @function
 */
/**
 * Middleware validate param nganhHocId trong path.
 * @function
 */
/**
 * Middleware validate query params lấy danh sách ngành học (phân trang, filter).
 * @function
 */
/**
 * Middleware validate param id ngành học.
 * @function
 */
/**
 * Middleware validate payload tạo mới ngành học.
 * @function
 */
/**
 * Middleware validate payload cập nhật ngành học.
 * @function
 */
export const nganhHocValidation = {
  validateGetNganhHocForSelectParams: validate(
    getNganhHocForSelectParamsSchema,
    'query'
  ),
  validateNganhHocIdParam: validate(nganhHocIdParamSchema, 'params'),
  validateGetNganhHocParams: validate(getNganhHocParamsSchema, 'query'),
  validateIdParam: validate(idParamSchema, 'params'),
  validateCreateNganhHocPayload: validate(createNganhHocPayloadSchema),
  validateUpdateNganhHocPayload: validate(updateNganhHocPayloadSchema),
};
