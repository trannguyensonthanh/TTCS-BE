// File: src/modules/danhGiaSuKien/danhGiaSuKien.validation.js
// Cấu trúc: Định nghĩa các schema validation cho đánh giá sự kiện

import Joi from 'joi';
import validate from '../../utils/validation.utils.js';

/**
 * Schema kiểm tra payload gửi đánh giá sự kiện
 */
const submitRatingPayloadSchema = Joi.object({
  suKienID: Joi.number().integer().positive().required(),
  diemNoiDung: Joi.number().integer().min(1).max(5).required(),
  diemToChuc: Joi.number().integer().min(1).max(5).required(),
  diemDiaDiem: Joi.number().integer().min(1).max(5).required(),
  yKienDongGop: Joi.string().max(2000).allow('', null).optional(),
});

/**
 * Schema kiểm tra param id đánh giá sự kiện
 */
const idParamSchema = Joi.object({
  danhGiaSkID: Joi.number().integer().positive().required().messages({
    'any.required': 'ID Đánh giá là bắt buộc.',
  }),
});

/**
 * Schema kiểm tra payload cập nhật đánh giá sự kiện
 */
const updateRatingPayloadSchema = Joi.object({
  diemNoiDung: Joi.number().integer().min(1).max(5).optional(),
  diemToChuc: Joi.number().integer().min(1).max(5).optional(),
  diemDiaDiem: Joi.number().integer().min(1).max(5).optional(),
  yKienDongGop: Joi.string().max(2000).allow('', null).optional(),
})
  .min(1)
  .messages({
    'object.min': 'Cần cung cấp ít nhất một trường để cập nhật đánh giá.',
  });

export const danhGiaSuKienValidation = {
  validateSubmitRatingPayload: validate(submitRatingPayloadSchema, 'body'),
  validateIdParam: validate(idParamSchema, 'params'),
  validateUpdateRatingPayload: validate(updateRatingPayloadSchema, 'body'),
};
