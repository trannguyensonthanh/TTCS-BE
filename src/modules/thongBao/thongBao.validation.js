// src/modules/thongBao/thongBao.validation.js
import Joi from 'joi';
import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';
import validate from '../../utils/validation.utils.js';

const getThongBaoCuaToiParamsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10),
  page: Joi.number().integer().min(1).default(1), // Thêm page nếu muốn phân trang đầy đủ
  chiChuaDoc: Joi.boolean().optional(),
});

const thongBaoIDParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID thông báo phải là một số',
    'any.required': 'ID thông báo là bắt buộc',
  }),
});

export const thongBaoValidation = {
  validateGetThongBaoCuaToiParams: validate(
    getThongBaoCuaToiParamsSchema,
    'query'
  ),
  validateThongBaoIDParam: validate(thongBaoIDParamSchema, 'params'),
};
