// src/modules/lichSuDungPhong/lichSuDungPhong.validation.js
import Joi from 'joi';

import validate from '../../utils/validation.utils.js';

const getLichDatPhongParamsSchema = Joi.object({
  tuNgay: Joi.date().iso().required().messages({
    'any.required': 'Từ ngày là bắt buộc',
    'date.format': 'Từ ngày không đúng định dạng YYYY-MM-DD',
  }),

  denNgay: Joi.date().iso().min(Joi.ref('tuNgay')).required().messages({
    'any.required': 'Đến ngày là bắt buộc',
    'date.format': 'Đến ngày không đúng định dạng YYYY-MM-DD',
    'date.min': 'Đến ngày phải sau hoặc bằng Từ ngày',
  }),
  phongIDs: Joi.string()
    .allow('', null)
    .optional()
    .custom((value, helpers) => {
      if (!value || value.trim() === '') return null;
      const ids = value.split(',').map((id) => parseInt(id.trim(), 10));
      if (ids.some(isNaN)) {
        return helpers.error('string.custom');
      }
      return ids;
    }, 'Custom PhongIDs validation')
    .messages({
      'string.custom': 'phongIDs phải là chuỗi các số, cách nhau bằng dấu phẩy',
    }),
  toaNhaID: Joi.number().integer().positive().allow(null).optional(),
  loaiPhongID: Joi.number().integer().positive().allow(null).optional(),
  suKienID: Joi.number().integer().positive().allow(null).optional(),
  donViToChucID: Joi.number().integer().positive().allow(null).optional(),
});

/**
 * Middleware validate query params cho API lấy dữ liệu lịch sử sử dụng phòng.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 * @returns {void} Trả về lỗi 400 nếu không hợp lệ, gọi next() nếu hợp lệ
 */
export const lichSuDungPhongValidation = {
  validateGetLichDatPhongParams: validate(getLichDatPhongParamsSchema, 'query'),
};
