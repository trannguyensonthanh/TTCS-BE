// src/modules/danhMuc/trangThietBi.validation.js
import Joi from 'joi';
import validate from '../../utils/validation.utils.js';

/**
 * Schema kiểm tra tham số truy vấn khi lấy danh sách thiết bị để chọn.
 * @property {string} [searchTerm] - Từ khóa tìm kiếm (tùy chọn)
 * @property {number} [limit] - Số lượng tối đa (tùy chọn, mặc định 100)
 */
const getTrangThietBiForSelectParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(200).default(100),
});

/**
 * Schema kiểm tra tham số truy vấn khi lấy danh sách thiết bị (phân trang, tìm kiếm).
 * @property {string} [searchTerm] - Từ khóa tìm kiếm (tùy chọn)
 * @property {number} [page] - Trang (tùy chọn, mặc định 1)
 * @property {number} [limit] - Số lượng/trang (tùy chọn, mặc định 10)
 * @property {string} [sortBy] - Trường sắp xếp (tùy chọn, mặc định 'TenThietBi')
 * @property {string} [sortOrder] - Thứ tự sắp xếp (asc/desc, mặc định asc)
 */
const getTrangThietBiParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  page: Joi.number().integer().min(1).default(1).allow(null).optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .allow(null)
    .optional(),
  sortBy: Joi.string().allow(null).optional().default('TenThietBi'),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('asc')
    .allow(null)
    .optional(),
});

/**
 * Schema kiểm tra params: id thiết bị.
 * @property {number} id - ID thiết bị (bắt buộc, số nguyên dương)
 */
const idParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Trang thiết bị là bắt buộc' }),
});

/**
 * Schema kiểm tra dữ liệu khi tạo mới thiết bị.
 * @property {string} tenThietBi - Tên thiết bị (bắt buộc, tối đa 150 ký tự)
 * @property {string} [moTa] - Mô tả (tùy chọn, tối đa 500 ký tự)
 */
const createTrangThietBiPayloadSchema = Joi.object({
  tenThietBi: Joi.string().max(150).required().messages({
    'string.max': 'Tên thiết bị không quá 150 ký tự',
    'any.required': 'Tên thiết bị là bắt buộc',
  }),
  moTa: Joi.string().max(500).allow('', null).optional(),
});

/**
 * Schema kiểm tra dữ liệu khi cập nhật thiết bị.
 * @property {string} [tenThietBi] - Tên thiết bị mới (tùy chọn, tối đa 150 ký tự)
 * @property {string} [moTa] - Mô tả mới (tùy chọn, tối đa 500 ký tự)
 */
const updateTrangThietBiPayloadSchema = Joi.object({
  tenThietBi: Joi.string().max(150).optional(),
  moTa: Joi.string().max(500).allow('', null).optional(),
})
  .min(1)
  .messages({
    'object.min':
      'Cần ít nhất một trường để cập nhật thông tin trang thiết bị.',
  });

/**
 * Middleware kiểm tra query khi lấy danh sách thiết bị để chọn.
 * @returns {function} Middleware validate query params.
 */
const validateGetTrangThietBiForSelectParams = validate(
  getTrangThietBiForSelectParamsSchema,
  'query'
);

/**
 * Middleware kiểm tra query khi lấy danh sách thiết bị (phân trang, tìm kiếm).
 * @returns {function} Middleware validate query params.
 */
const validateGetTrangThietBiParams = validate(
  getTrangThietBiParamsSchema,
  'query'
);

/**
 * Middleware kiểm tra params: id thiết bị.
 * @returns {function} Middleware validate params.
 */
const validateIdParam = validate(idParamSchema, 'params');

/**
 * Middleware kiểm tra body khi tạo mới thiết bị.
 * @returns {function} Middleware validate body.
 */
const validateCreateTrangThietBiPayload = validate(
  createTrangThietBiPayloadSchema,
  'body'
);

/**
 * Middleware kiểm tra body khi cập nhật thiết bị.
 * @returns {function} Middleware validate body.
 */
const validateUpdateTrangThietBiPayload = validate(
  updateTrangThietBiPayloadSchema,
  'body'
);

export const trangThietBiValidation = {
  validateGetTrangThietBiForSelectParams,
  validateGetTrangThietBiParams,
  validateIdParam,
  validateCreateTrangThietBiPayload,
  validateUpdateTrangThietBiPayload,
};
