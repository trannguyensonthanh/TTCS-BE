// src/modules/yeuCauHuySK/yeuCauHuySK.validation.js
import Joi from 'joi';

import validate from '../../utils/validation.utils.js';

/**
 * Schema kiểm tra payload khi tạo mới yêu cầu hủy sự kiện.
 * Đầu vào: body (suKienID, lyDoHuy)
 * Đầu ra: Joi schema validate body
 */
const createYeuCauHuySKSchema = Joi.object({
  suKienID: Joi.number().integer().positive().required().messages({
    'number.base': 'ID sự kiện phải là một số',
    'number.integer': 'ID sự kiện phải là số nguyên',
    'number.positive': 'ID sự kiện phải là số dương',
    'any.required': 'ID sự kiện là bắt buộc',
  }),
  lyDoHuy: Joi.string().min(10).required().messages({
    'string.base': 'Lý do hủy phải là một chuỗi',
    'string.empty': 'Lý do hủy không được để trống',
    'string.min': 'Lý do hủy phải có ít nhất {#limit} ký tự',
    'any.required': 'Lý do hủy là bắt buộc',
  }),
});

/**
 * Schema kiểm tra query params khi lấy danh sách yêu cầu hủy sự kiện.
 * Đầu vào: query params (searchTerm, trangThaiYcHuySkMa, suKienID, nguoiYeuCauID, page, limit, sortBy, sortOrder)
 * Đầu ra: Joi schema validate query
 */
const getYeuCauHuySKParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  trangThaiYcHuySkMa: Joi.string().allow('', null).optional(),
  suKienID: Joi.number().integer().positive().allow(null).optional(),
  nguoiYeuCauID: Joi.number().integer().positive().allow(null).optional(),
  page: Joi.number().integer().min(1).default(1).allow(null).optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .allow(null)
    .optional(),
  sortBy: Joi.string().allow(null).optional(),
  sortOrder: Joi.string().valid('asc', 'desc').allow(null).optional(),
});

/**
 * Schema kiểm tra params id khi lấy chi tiết hoặc thao tác yêu cầu hủy sự kiện.
 * Đầu vào: params (id)
 * Đầu ra: Joi schema validate params
 */
const idParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Yêu cầu hủy sự kiện là bắt buộc' }),
});

/**
 * Schema kiểm tra payload khi duyệt yêu cầu hủy sự kiện.
 * Đầu vào: body (ghiChuBGH - optional)
 * Đầu ra: Joi schema validate body
 */
const duyetYcHuyPayloadSchema = Joi.object({
  ghiChuBGH: Joi.string().max(1000).allow('', null).optional(),
});

/**
 * Schema kiểm tra payload khi từ chối yêu cầu hủy sự kiện.
 * Đầu vào: body (lyDoTuChoiHuyBGH)
 * Đầu ra: Joi schema validate body
 */
const tuChoiYcHuyPayloadSchema = Joi.object({
  lyDoTuChoiHuyBGH: Joi.string().min(10).max(1000).required().messages({
    'string.base': 'Lý do từ chối phải là chuỗi',
    'string.empty': 'Lý do từ chối không được để trống',
    'string.min': 'Lý do từ chối phải có ít nhất {#limit} ký tự',
    'any.required': 'Lý do từ chối là bắt buộc',
  }),
});

/**
 * Export các middleware validate cho yêu cầu hủy sự kiện.
 * Đầu vào: request (body, query, params)
 * Đầu ra: middleware validate tương ứng
 */
export const yeuCauHuySKValidation = {
  validateCreateYeuCauHuySK: validate(createYeuCauHuySKSchema),
  validateGetYeuCauHuySKParams: validate(getYeuCauHuySKParamsSchema, 'query'),
  validateIdParam: validate(idParamSchema, 'params'),
  validateDuyetYcHuyPayload: validate(duyetYcHuyPayloadSchema),
  validateTuChoiYcHuyPayload: validate(tuChoiYcHuyPayloadSchema),
};
