import Joi from 'joi';
import validate from '../../utils/validation.utils.js';

const submitRatingPayloadSchema = Joi.object({
  suKienID: Joi.number().integer().positive().required(),
  diemNoiDung: Joi.number().integer().min(1).max(5).required(),
  diemToChuc: Joi.number().integer().min(1).max(5).required(),
  diemDiaDiem: Joi.number().integer().min(1).max(5).required(),
  yKienDongGop: Joi.string().max(2000).allow('', null).optional(),
});

const idParamSchema = Joi.object({
  danhGiaSkID: Joi.number().integer().positive().required().messages({
    'any.required': 'ID Đánh giá là bắt buộc.',
  }),
});

const updateRatingPayloadSchema = Joi.object({
  diemNoiDung: Joi.number().integer().min(1).max(5).optional(),
  diemToChuc: Joi.number().integer().min(1).max(5).optional(),
  diemDiaDiem: Joi.number().integer().min(1).max(5).optional(),
  yKienDongGop: Joi.string().max(2000).allow('', null).optional(),
})
  .min(1)
  .messages({
    // Phải có ít nhất 1 trường để cập nhật
    'object.min': 'Cần cung cấp ít nhất một trường để cập nhật đánh giá.',
  });

export const danhGiaSuKienValidation = {
  validateSubmitRatingPayload: validate(submitRatingPayloadSchema, 'body'),
  validateIdParam: validate(idParamSchema, 'params'),
  validateUpdateRatingPayload: validate(updateRatingPayloadSchema, 'body'),
};
