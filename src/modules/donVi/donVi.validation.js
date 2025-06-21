// src/modules/donVi/donVi.validation.js
import Joi from 'joi';
import validate from '../../utils/validation.utils.js';
import LoaiDonVi from '../../enums/loaiDonVi.enum.js';

const cacLoaiDonViHopLe = Object.values(LoaiDonVi);

/**
 * Validate query params cho API lấy danh sách đơn vị
 * @param {object} req.query
 */
const getDonViParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  loaiDonVi: Joi.string()
    .allow('', null)
    .optional()
    .custom((value, helpers) => {
      if (!value || value.trim() === '') return null;
      const loaiArray = value
        .split(',')
        .map((item) => item.trim().toUpperCase());
      for (const loai of loaiArray) {
        if (!cacLoaiDonViHopLe.includes(loai)) {
          return helpers.error('any.invalid', { value: loai });
        }
      }
      return loaiArray;
    })
    .messages({
      'any.invalid': `Loại đơn vị "{{#value}}" không hợp lệ. Các giá trị hợp lệ là: ${cacLoaiDonViHopLe.join(', ')}`,
    }),
  donViChaID: Joi.number().integer().positive().allow(null).optional(),
  page: Joi.number().integer().min(1).default(1).allow(null).optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .allow(null)
    .optional(),
  sortBy: Joi.string().allow(null).optional(),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('asc')
    .allow(null)
    .optional(),
});

/**
 * Validate param :donViId
 * @param {object} req.params
 */
const idParamSchema = Joi.object({
  donViId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Đơn vị là bắt buộc' }),
});

/**
 * Validate body tạo mới đơn vị
 * @param {object} req.body
 */
const createDonViPayloadSchema = Joi.object({
  tenDonVi: Joi.string().max(200).required(),
  maDonVi: Joi.string().max(50).allow('', null).optional(),
  loaiDonVi: Joi.string()
    .valid(...cacLoaiDonViHopLe)
    .required()
    .messages({
      'any.only': `Loại đơn vị phải là một trong các giá trị: ${cacLoaiDonViHopLe.join(', ')}`,
      'any.required': 'Loại đơn vị là bắt buộc',
    }),
  donViChaID: Joi.number().integer().positive().allow(null).optional(),
  moTaDv: Joi.string().max(500).allow('', null).optional(),
});

/**
 * Validate body cập nhật đơn vị
 * @param {object} req.body
 */
const updateDonViPayloadSchema = Joi.object({
  tenDonVi: Joi.string().max(200).optional(),
  maDonVi: Joi.string().max(50).allow('', null).optional(),
  loaiDonVi: Joi.string()
    .valid(...cacLoaiDonViHopLe)
    .optional(),
  donViChaID: Joi.number().integer().positive().allow(null).optional(),
  moTaDv: Joi.string().max(500).allow('', null).optional(),
})
  .min(1)
  .messages({
    'object.min': 'Cần ít nhất một trường để cập nhật thông tin đơn vị.',
  });

/**
 * Validate query params cho API lấy danh sách đơn vị cha tiềm năng
 * @param {object} req.query
 */
const getDonViChaOptionsParamsSchema = Joi.object({
  excludeDonViId: Joi.number().integer().positive().optional(),
  searchTerm: Joi.string().allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(200).default(50).optional(),
});

export const donViValidation = {
  validateGetDonViParams: validate(getDonViParamsSchema, 'query'),
  validateIdParam: validate(idParamSchema, 'params'),
  validateCreateDonViPayload: validate(createDonViPayloadSchema),
  validateUpdateDonViPayload: validate(updateDonViPayloadSchema),
  validateGetDonViChaOptionsParams: validate(
    getDonViChaOptionsParamsSchema,
    'query'
  ),
};
