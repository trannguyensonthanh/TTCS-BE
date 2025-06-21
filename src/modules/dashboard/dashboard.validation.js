import Joi from 'joi';
import validate from '../../utils/validation.utils.js';

const getPublicKpiParamsSchema = Joi.object({
  thoiGian: Joi.string()
    .valid('HOM_NAY', 'TUAN_NAY', 'THANG_NAY', 'SAP_TOI_7_NGAY')
    .default('SAP_TOI_7_NGAY'),
});

export const dashboardValidation = {
  validateGetPublicKpiParams: validate(getPublicKpiParamsSchema, 'query'),
};
