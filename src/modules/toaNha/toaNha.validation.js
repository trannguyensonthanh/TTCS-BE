// src/modules/danhMuc/toaNha.validation.js
import Joi from 'joi';
import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';
import validate from '../../utils/validation.utils.js';

/**
 * Schema kiểm tra tham số truy vấn khi lấy danh sách tòa nhà.
 * @property {string} [searchTerm] - Từ khóa tìm kiếm (tùy chọn)
 * @property {number} [coSoID] - ID cơ sở (tùy chọn)
 * @property {number} [page] - Trang (tùy chọn, mặc định 1)
 * @property {number} [limit] - Số lượng/trang (tùy chọn, mặc định 10)
 * @property {string} [sortBy] - Trường sắp xếp (tùy chọn)
 * @property {string} [sortOrder] - Thứ tự sắp xếp (asc/desc, mặc định asc)
 */
const getToaNhaParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  coSoID: Joi.number().integer().positive().allow(null).optional(),
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
 * Schema kiểm tra tham số ID tòa nhà.
 * @property {number} id - ID tòa nhà (bắt buộc, số nguyên dương)
 */
const idParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Tòa nhà là bắt buộc' }),
});

/**
 * Schema kiểm tra dữ liệu khi tạo mới tòa nhà.
 * @property {string} maToaNha - Mã tòa nhà (bắt buộc, tối đa 20 ký tự)
 * @property {string} tenToaNha - Tên tòa nhà (bắt buộc, tối đa 100 ký tự)
 * @property {number} coSoID - ID cơ sở (bắt buộc)
 * @property {string} [moTaToaNha] - Mô tả (tùy chọn, tối đa 255 ký tự)
 */
const createToaNhaPayloadSchema = Joi.object({
  maToaNha: Joi.string().max(20).required().messages({
    'string.max': 'Mã tòa nhà không quá 20 ký tự',
    'any.required': 'Mã tòa nhà là bắt buộc',
  }),
  tenToaNha: Joi.string().max(100).required().messages({
    'string.max': 'Tên tòa nhà không quá 100 ký tự',
    'any.required': 'Tên tòa nhà là bắt buộc',
  }),
  coSoID: Joi.number().integer().positive().required().messages({
    'any.required': 'ID Cơ sở là bắt buộc',
  }),
  moTaToaNha: Joi.string().max(255).allow('', null).optional(),
});

/**
 * Schema kiểm tra dữ liệu khi cập nhật tòa nhà.
 * @property {string} [maToaNha] - Mã tòa nhà mới (tùy chọn, tối đa 20 ký tự)
 * @property {string} [tenToaNha] - Tên tòa nhà mới (tùy chọn, tối đa 100 ký tự)
 * @property {number} [coSoID] - ID cơ sở mới (tùy chọn)
 * @property {string} [moTaToaNha] - Mô tả mới (tùy chọn, tối đa 255 ký tự)
 */
const updateToaNhaPayloadSchema = Joi.object({
  maToaNha: Joi.string().max(20).optional(),
  tenToaNha: Joi.string().max(100).optional(),
  coSoID: Joi.number().integer().positive().optional(),
  moTaToaNha: Joi.string().max(255).allow('', null).optional(),
})
  .min(1)
  .messages({
    'object.min': 'Cần ít nhất một trường để cập nhật thông tin tòa nhà.',
  });

/**
 * Middleware kiểm tra tham số truy vấn khi lấy danh sách tòa nhà.
 * @returns {function} Middleware validate query params.
 */
const validateGetToaNhaParams = validate(getToaNhaParamsSchema, 'query');

/**
 * Middleware kiểm tra tham số ID tòa nhà.
 * @returns {function} Middleware validate params.
 */
const validateIdParam = validate(idParamSchema, 'params');

/**
 * Middleware kiểm tra dữ liệu khi tạo mới tòa nhà.
 * @returns {function} Middleware validate body.
 */
const validateCreateToaNhaPayload = validate(createToaNhaPayloadSchema);

/**
 * Middleware kiểm tra dữ liệu khi cập nhật tòa nhà.
 * @returns {function} Middleware validate body.
 */
const validateUpdateToaNhaPayload = validate(updateToaNhaPayloadSchema);

export const toaNhaValidation = {
  validateGetToaNhaParams,
  validateIdParam,
  validateCreateToaNhaPayload,
  validateUpdateToaNhaPayload,
};
