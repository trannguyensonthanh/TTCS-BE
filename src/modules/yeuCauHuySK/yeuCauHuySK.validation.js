// src/modules/yeuCauHuySK/yeuCauHuySK.validation.js
import Joi from 'joi';
import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';
import validate from '../../utils/validation.utils.js';

const createYeuCauHuySKSchema = Joi.object({
  suKienID: Joi.number().integer().positive().required().messages({
    'number.base': 'ID sự kiện phải là một số',
    'number.integer': 'ID sự kiện phải là số nguyên',
    'number.positive': 'ID sự kiện phải là số dương',
    'any.required': 'ID sự kiện là bắt buộc',
  }),
  lyDoHuy: Joi.string().min(10).required().messages({
    // Yêu cầu lý do có độ dài tối thiểu
    'string.base': 'Lý do hủy phải là một chuỗi',
    'string.empty': 'Lý do hủy không được để trống',
    'string.min': 'Lý do hủy phải có ít nhất {#limit} ký tự',
    'any.required': 'Lý do hủy là bắt buộc',
  }),
});

export const yeuCauHuySKValidation = {
  validateCreateYeuCauHuySK: validate(createYeuCauHuySKSchema),
};
