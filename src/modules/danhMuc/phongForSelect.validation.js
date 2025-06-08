// src/modules/phong/phongForSelect.validation.js

import Joi from 'joi';
import validate from '../../utils/validation.utils.js';

const getPhongForSelectParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('').optional(),
  loaiPhongID: Joi.number().integer().positive().optional(),
  sucChuaToiThieu: Joi.number().integer().min(1).optional(),
  thoiGianMuon: Joi.date().iso().optional(),
  thoiGianTra: Joi.date()
    .iso()
    .optional()
    .when('thoiGianMuon', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('thoiGianMuon')).required(),
      otherwise: Joi.optional(),
    }),
  trangThaiPhongMa: Joi.string().default('SAN_SANG'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

/**
 * Middleware validate query params cho API lấy danh sách phòng để chọn.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {void} Trả về lỗi 400 nếu không hợp lệ, gọi next() nếu hợp lệ
 */
export const phongForSelectValidation = {
  validateGetPhongForSelectParams: validate(
    getPhongForSelectParamsSchema,
    'query'
  ),
};
