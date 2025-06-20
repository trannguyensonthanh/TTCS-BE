import Joi from 'joi';
import validate from '../../utils/validation.utils.js';

const moiThamGiaIdParamSchema = Joi.object({
  moiThamGiaID: Joi.number().integer().positive().required().messages({
    'any.required': 'ID Lời mời là bắt buộc.',
  }),
});

export const moiThamGiaValidation = {
  validateIdParam: validate(moiThamGiaIdParamSchema, 'params'),
};
