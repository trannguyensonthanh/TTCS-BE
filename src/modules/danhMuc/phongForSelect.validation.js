// src/modules/phong/phong.validation.js (Hoặc tên file validation của bạn)

import Joi from 'joi';
import validate from '../../utils/validation.utils.js';

// ...
const getPhongForSelectParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('').optional(),
  loaiPhongID: Joi.number().integer().positive().optional(),
  sucChuaToiThieu: Joi.number().integer().min(1).optional(),
  thoiGianMuon: Joi.date().iso().optional(), // ISO format

  thoiGianTra: Joi.date()
    .iso()
    .optional()
    .when('thoiGianMuon', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('thoiGianMuon')).required(),
      otherwise: Joi.optional(),
    }),
  trangThaiPhongMa: Joi.string().default('SAN_SANG'), // Mặc định chỉ lấy phòng sẵn sàng
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

export const phongForSelectValidation = {
  // Hoặc tên export của bạn
  // ...
  validateGetPhongForSelectParams: validate(
    getPhongForSelectParamsSchema,
    'query'
  ),
};
