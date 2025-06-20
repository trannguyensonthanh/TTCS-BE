import Joi from 'joi';
import validate from '../../utils/validation.utils.js';

const getMyInvitationsParamsSchema = Joi.object({
  trangThaiPhanHoi: Joi.string()
    .valid('CHUA_PHAN_HOI', 'DA_CHAP_NHAN', 'DA_TU_CHOI', 'ALL')
    .default('CHUA_PHAN_HOI'),
  sapDienRa: Joi.boolean().default(true),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  sortBy: Joi.string().optional().default('SuKien.TgBatDauDK'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

const respondToInvitationPayloadSchema = Joi.object({
  chapNhan: Joi.boolean().required().messages({
    'any.required': 'Trạng thái chấp nhận là bắt buộc.',
  }),
  lyDoTuChoi: Joi.string()
    .max(1000)
    .allow('', null)
    .when('chapNhan', {
      is: false,
      // Có thể để là optional hoặc required tùy yêu cầu nghiệp vụ
      then: Joi.string().allow('', null),
      otherwise: Joi.forbidden(),
    }),
});

const moiThamGiaIdParamSchema = Joi.object({
  moiThamGiaID: Joi.number().integer().positive().required().messages({
    'any.required': 'ID Lời mời là bắt buộc.',
  }),
});

export const loiMoiSuKienValidation = {
  validateGetMyInvitationsParams: validate(
    getMyInvitationsParamsSchema,
    'query'
  ),
  validateIdParam: validate(moiThamGiaIdParamSchema, 'params'),
  validateRespondToInvitationPayload: validate(
    respondToInvitationPayloadSchema,
    'body'
  ),
};
