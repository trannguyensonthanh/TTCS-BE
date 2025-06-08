// src/modules/vaiTroHeThong/vaiTroHeThong.validation.js
import Joi from 'joi';
import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';
import validate from '../../utils/validation.utils.js';

/**
 * Schema kiểm tra tham số truy vấn khi lấy danh sách vai trò hệ thống (phân trang, tìm kiếm).
 * @property {string} [searchTerm] - Từ khóa tìm kiếm (tùy chọn)
 * @property {number} [page] - Trang (tùy chọn, mặc định 1)
 * @property {number} [limit] - Số lượng/trang (tùy chọn, mặc định 10)
 * @property {string} [sortBy] - Trường sắp xếp (tùy chọn, mặc định 'TenVaiTro')
 * @property {string} [sortOrder] - Thứ tự sắp xếp (asc/desc, mặc định asc)
 */
const getVaiTroHeThongParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  page: Joi.number().integer().min(1).default(1).allow(null).optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .allow(null)
    .optional(),
  sortBy: Joi.string().allow(null).optional().default('TenVaiTro'),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('asc')
    .allow(null)
    .optional(),
});

/**
 * Schema kiểm tra params: vaiTroId.
 * @property {number} vaiTroId - ID vai trò hệ thống (bắt buộc, số nguyên dương)
 */
const idParamSchema = Joi.object({
  vaiTroId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Vai trò hệ thống là bắt buộc' }),
});

/**
 * Schema kiểm tra dữ liệu khi tạo mới vai trò hệ thống.
 * @property {string} maVaiTro - Mã vai trò (bắt buộc, tối đa 50 ký tự)
 * @property {string} tenVaiTro - Tên vai trò (bắt buộc, tối đa 150 ký tự)
 * @property {string} [moTaVT] - Mô tả (tùy chọn, tối đa 500 ký tự)
 */
const createVaiTroHeThongPayloadSchema = Joi.object({
  maVaiTro: Joi.string().max(50).required().messages({
    'string.max': 'Mã vai trò không quá 50 ký tự',
    'any.required': 'Mã vai trò là bắt buộc',
  }),
  tenVaiTro: Joi.string().max(150).required().messages({
    'string.max': 'Tên vai trò không quá 150 ký tự',
    'any.required': 'Tên vai trò là bắt buộc',
  }),
  moTaVT: Joi.string().max(500).allow('', null).optional(),
});

/**
 * Schema kiểm tra dữ liệu khi cập nhật vai trò hệ thống.
 * @property {string} [tenVaiTro] - Tên vai trò mới (tùy chọn, tối đa 150 ký tự)
 * @property {string} [moTaVT] - Mô tả mới (tùy chọn, tối đa 500 ký tự)
 */
const updateVaiTroHeThongPayloadSchema = Joi.object({
  tenVaiTro: Joi.string().max(150).optional(),
  moTaVT: Joi.string().max(500).allow('', null).optional(),
})
  .min(1)
  .messages({
    'object.min': 'Cần ít nhất một trường để cập nhật thông tin vai trò.',
  });

/**
 * Middleware kiểm tra query khi lấy danh sách vai trò hệ thống.
 * @returns {function} Middleware validate query params.
 */
const validateGetVaiTroHeThongParams = validate(
  getVaiTroHeThongParamsSchema,
  'query'
);

/**
 * Middleware kiểm tra params: vaiTroId.
 * @returns {function} Middleware validate params.
 */
const validateIdParam = validate(idParamSchema, 'params');

/**
 * Middleware kiểm tra body khi tạo mới vai trò hệ thống.
 * @returns {function} Middleware validate body.
 */
const validateCreateVaiTroHeThongPayload = validate(
  createVaiTroHeThongPayloadSchema
);

/**
 * Middleware kiểm tra body khi cập nhật vai trò hệ thống.
 * @returns {function} Middleware validate body.
 */
const validateUpdateVaiTroHeThongPayload = validate(
  updateVaiTroHeThongPayloadSchema
);

export const vaiTroHeThongValidation = {
  validateGetVaiTroHeThongParams,
  validateIdParam,
  validateCreateVaiTroHeThongPayload,
  validateUpdateVaiTroHeThongPayload,
};
