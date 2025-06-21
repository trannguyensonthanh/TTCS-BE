// src/modules/thongBao/thongBao.validation.js
import Joi from 'joi';
import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';
import validate from '../../utils/validation.utils.js';

const getThongBaoCuaToiParamsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10),
  page: Joi.number().integer().min(1).default(1), // Thêm page nếu muốn phân trang đầy đủ
  chiChuaDoc: Joi.boolean().optional(),
});

const thongBaoIDParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID thông báo phải là một số',
    'any.required': 'ID thông báo là bắt buộc',
  }),
});

const createYeuCauChinhSuaThongBaoPayloadSchema = Joi.object({
  loaiThucThe: Joi.string()
    .valid('SU_KIEN', 'YC_MUON_PHONG_CHI_TIET')
    .required()
    .messages({
      'any.only':
        'Loại thực thể không hợp lệ. Chỉ chấp nhận SU_KIEN hoặc YC_MUON_PHONG_CHI_TIET.',
      'any.required': 'Loại thực thể là bắt buộc.',
    }),
  idThucThe: Joi.number().integer().positive().required().messages({
    'number.base': 'ID thực thể phải là số.',
    'any.required': 'ID thực thể là bắt buộc.',
  }),
  nguoiNhanID: Joi.number().integer().positive().required().messages({
    'number.base': 'ID người nhận phải là số.',
    'any.required': 'ID người nhận là bắt buộc.',
  }),
  noiDungGhiChu: Joi.string().min(10).max(1000).required().messages({
    'string.min': 'Nội dung ghi chú phải có ít nhất {#limit} ký tự.',
    'string.max': 'Nội dung ghi chú không được vượt quá {#limit} ký tự.',
    'any.required': 'Nội dung ghi chú là bắt buộc.',
  }),
});

const getAllMyNotificationsParamsSchema = Joi.object({
  daDoc: Joi.boolean().optional(),
  loaiThongBao: Joi.string().max(50).allow('', null).optional(), // Mã loại thông báo
  searchTerm: Joi.string().allow('', null).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(15),
  sortBy: Joi.string().optional().default('NgayTaoTB'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const getPublicAnnouncementsParamsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(20).default(5),
});

export const thongBaoValidation = {
  /**
   * Validate query params cho lấy danh sách thông báo của tôi (lọc, phân trang).
   * @returns {function} Middleware validate query params.
   */
  validateGetThongBaoCuaToiParams: validate(
    getThongBaoCuaToiParamsSchema,
    'query'
  ),
  /**
   * Validate param :id cho các route thao tác với thông báo theo ID.
   * @returns {function} Middleware validate param id.
   */
  validateThongBaoIDParam: validate(thongBaoIDParamSchema, 'params'),
  /**
   * Validate body khi tạo yêu cầu chỉnh sửa thông báo.
   * @returns {function} Middleware validate body tạo yêu cầu chỉnh sửa.
   */
  validateCreateYeuCauChinhSuaPayload: validate(
    createYeuCauChinhSuaThongBaoPayloadSchema
  ),
  /**
   * Validate query params cho lấy tất cả thông báo của tôi (lọc, phân trang).
   * @returns {function} Middleware validate query params.
   */
  validateGetAllMyNotificationsParams: validate(
    getAllMyNotificationsParamsSchema,
    'query'
  ),
  validateGetPublicAnnouncementsParams: validate(
    getPublicAnnouncementsParamsSchema,
    'query'
  ),
};
