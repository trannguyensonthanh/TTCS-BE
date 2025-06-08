// src/modules/toaNhaTang/toaNhaTang.validation.js
import Joi from 'joi';
import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';
import validate from '../../utils/validation.utils.js';

/**
 * Schema kiểm tra tham số params: toaNhaId.
 * @property {number} toaNhaId - ID tòa nhà (bắt buộc, số nguyên dương)
 */
const toaNhaIdParamSchema = Joi.object({
  toaNhaId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Tòa nhà là bắt buộc' }),
});

/**
 * Schema kiểm tra tham số params: toaNhaTangId.
 * @property {number} toaNhaTangId - ID tầng vật lý (bắt buộc, số nguyên dương)
 */
const toaNhaTangIdParamSchema = Joi.object({
  toaNhaTangId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Tầng vật lý là bắt buộc' }),
});

/**
 * Schema kiểm tra tham số truy vấn khi lấy danh sách tầng vật lý.
 * @property {string} [searchTerm] - Từ khóa tìm kiếm (tùy chọn)
 * @property {number} [page] - Trang (tùy chọn, mặc định 1)
 * @property {number} [limit] - Số lượng/trang (tùy chọn, mặc định 10)
 * @property {string} [sortBy] - Trường sắp xếp (tùy chọn)
 * @property {string} [sortOrder] - Thứ tự sắp xếp (asc/desc, mặc định asc)
 */
const getToaNhaTangParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
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
 * Schema kiểm tra dữ liệu khi tạo mới tầng vật lý.
 * @property {number} loaiTangID - ID loại tầng (bắt buộc)
 * @property {number} [soPhong] - Số phòng (tùy chọn)
 * @property {string} [moTa] - Mô tả (tùy chọn, tối đa 500 ký tự)
 */
const createToaNhaTangPayloadSchema = Joi.object({
  loaiTangID: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Loại tầng là bắt buộc' }),
  soPhong: Joi.number().integer().min(0).allow(null).optional(),
  moTa: Joi.string().max(500).allow('', null).optional(),
});

/**
 * Schema kiểm tra dữ liệu khi cập nhật tầng vật lý.
 * @property {number} [soPhong] - Số phòng mới (tùy chọn)
 * @property {string} [moTa] - Mô tả mới (tùy chọn, tối đa 500 ký tự)
 */
const updateToaNhaTangPayloadSchema = Joi.object({
  soPhong: Joi.number().integer().min(0).allow(null).optional(),
  moTa: Joi.string().max(500).allow('', null).optional(),
})
  .min(1)
  .messages({
    'object.min': 'Cần ít nhất một trường để cập nhật thông tin tầng vật lý.',
  });

/**
 * Schema kiểm tra tham số truy vấn khi lấy danh sách tầng vật lý để chọn.
 * @property {number} [toaNhaID] - ID tòa nhà (tùy chọn)
 * @property {string} [searchTerm] - Từ khóa tìm kiếm (tùy chọn)
 * @property {number} [limit] - Số lượng tối đa (tùy chọn, mặc định 100)
 */
const getToaNhaTangForSelectParamsSchema = Joi.object({
  toaNhaID: Joi.number().integer().positive().optional(),
  searchTerm: Joi.string().allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(500).default(100),
});

/**
 * Middleware kiểm tra params: toaNhaId.
 * @returns {function} Middleware validate params.
 */
const validateToaNhaIdParam = validate(toaNhaIdParamSchema, 'params');

/**
 * Middleware kiểm tra params: toaNhaTangId.
 * @returns {function} Middleware validate params.
 */
const validateToaNhaTangIdParam = validate(toaNhaTangIdParamSchema, 'params');

/**
 * Middleware kiểm tra query khi lấy danh sách tầng vật lý.
 * @returns {function} Middleware validate query params.
 */
const validateGetToaNhaTangParams = validate(
  getToaNhaTangParamsSchema,
  'query'
);

/**
 * Middleware kiểm tra body khi tạo mới tầng vật lý.
 * @returns {function} Middleware validate body.
 */
const validateCreateToaNhaTangPayload = validate(createToaNhaTangPayloadSchema);

/**
 * Middleware kiểm tra body khi cập nhật tầng vật lý.
 * @returns {function} Middleware validate body.
 */
const validateUpdateToaNhaTangPayload = validate(updateToaNhaTangPayloadSchema);

/**
 * Middleware kiểm tra query khi lấy danh sách tầng vật lý để chọn.
 * @returns {function} Middleware validate query params.
 */
const validateGetToaNhaTangForSelectParams = validate(
  getToaNhaTangForSelectParamsSchema,
  'query'
);

export const toaNhaTangValidation = {
  validateToaNhaIdParam,
  validateToaNhaTangIdParam,
  validateGetToaNhaTangParams,
  validateCreateToaNhaTangPayload,
  validateUpdateToaNhaTangPayload,
  validateGetToaNhaTangForSelectParams,
};
