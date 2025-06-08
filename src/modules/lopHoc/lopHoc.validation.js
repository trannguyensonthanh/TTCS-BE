// src/modules/lopHoc/lopHoc.validation.js
import Joi from 'joi';
import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';
import validate from '../../utils/validation.utils.js';

/**
 * Schema validate query params lấy danh sách lớp học.
 * @type {Joi.ObjectSchema}
 */
const getLopHocParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  nganhHocID: Joi.number().integer().positive().allow(null).optional(),
  chuyenNganhID: Joi.number().integer().positive().allow(null).optional(),
  khoaQuanLyID: Joi.number().integer().positive().allow(null).optional(),
  nienKhoa: Joi.string().max(50).allow('', null).optional(),
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
 * Schema validate param id của lớp học.
 * @type {Joi.ObjectSchema}
 */
const idParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Lớp học là bắt buộc' }),
});

/**
 * Schema validate payload tạo mới lớp học.
 * @type {Joi.ObjectSchema}
 */
const createLopHocPayloadSchema = Joi.object({
  tenLop: Joi.string()
    .max(100)
    .required()
    .messages({ 'any.required': 'Tên lớp là bắt buộc' }),
  maLop: Joi.string().max(50).allow('', null).optional(),
  nganhHocID: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Ngành học là bắt buộc' }),
  chuyenNganhID: Joi.number().integer().positive().allow(null).optional(),
  nienKhoa: Joi.string().max(50).allow('', null).optional(),
});

/**
 * Schema validate payload cập nhật lớp học.
 * @type {Joi.ObjectSchema}
 */
const updateLopHocPayloadSchema = Joi.object({
  tenLop: Joi.string().max(100).optional(),
  maLop: Joi.string().max(50).allow('', null).optional(),
  nganhHocID: Joi.number().integer().positive().optional(),
  chuyenNganhID: Joi.number().integer().positive().allow(null).optional(),
  nienKhoa: Joi.string().max(50).allow('', null).optional(),
})
  .min(1)
  .messages({
    'object.min': 'Cần ít nhất một trường để cập nhật thông tin lớp học.',
  });

/**
 * Middleware validate query params lấy danh sách lớp học.
 * @function
 */
/**
 * Middleware validate param id lớp học.
 * @function
 */
/**
 * Middleware validate payload tạo mới lớp học.
 * @function
 */
/**
 * Middleware validate payload cập nhật lớp học.
 * @function
 */
export const lopHocValidation = {
  validateGetLopHocParams: validate(getLopHocParamsSchema, 'query'),
  validateIdParam: validate(idParamSchema, 'params'),
  validateCreateLopHocPayload: validate(createLopHocPayloadSchema),
  validateUpdateLopHocPayload: validate(updateLopHocPayloadSchema),
};
