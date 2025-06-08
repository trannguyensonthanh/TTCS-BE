// src/modules/yeuCauDoiPhong/yeuCauDoiPhong.validation.js
import Joi from 'joi';

import validate from '../../utils/validation.utils.js';

/**
 * Schema kiểm tra tham số truy vấn khi lấy danh sách yêu cầu đổi phòng.
 * Đầu vào: các trường truy vấn (searchTerm, trangThaiYcDoiPhongMa, suKienID, ...)
 * Đầu ra: object Joi schema để validate query params
 */
const getYeuCauDoiPhongParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  trangThaiYcDoiPhongMa: Joi.string().allow('', null).optional(),
  suKienID: Joi.number().integer().positive().allow(null).optional(),
  nguoiYeuCauID: Joi.number().integer().positive().allow(null).optional(),
  donViNguoiYeuCauID: Joi.number().integer().positive().allow(null).optional(),
  phongCuID: Joi.number().integer().positive().allow(null).optional(),
  phongMoiID: Joi.number().integer().positive().allow(null).optional(),
  tuNgayYeuCau: Joi.string().isoDate().allow(null).optional(),
  denNgayYeuCau: Joi.string()
    .isoDate()
    .allow(null)
    .optional()
    .min(Joi.ref('tuNgayYeuCau')),
  page: Joi.number().integer().min(1).default(1).allow(null).optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .allow(null)
    .optional(),
  sortBy: Joi.string().allow(null).optional(),
  sortOrder: Joi.string().valid('asc', 'desc').allow(null).optional(),
});

/**
 * Schema kiểm tra tham số id trong params.
 * Đầu vào: id (number, bắt buộc)
 * Đầu ra: object Joi schema để validate params
 */
const idParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Yêu cầu đổi phòng là bắt buộc' }),
});

/**
 * Schema kiểm tra payload khi tạo mới yêu cầu đổi phòng.
 * Đầu vào: ycMuonPhongCtID, datPhongID_Cu, lyDoDoiPhong, ycPhongMoi_LoaiID, ycPhongMoi_SucChua, ycPhongMoi_ThietBi
 * Đầu ra: object Joi schema để validate body
 */
const createYeuCauDoiPhongPayloadSchema = Joi.object({
  ycMuonPhongCtID: Joi.number().integer().positive().required(),
  datPhongID_Cu: Joi.number().integer().positive().required(),
  lyDoDoiPhong: Joi.string().min(10).max(1000).required(),
  ycPhongMoi_LoaiID: Joi.number().integer().positive().allow(null).optional(),
  ycPhongMoi_SucChua: Joi.number().integer().min(1).allow(null).optional(),
  ycPhongMoi_ThietBi: Joi.string().allow('', null).optional(),
});

/**
 * Schema kiểm tra payload khi xử lý yêu cầu đổi phòng (duyệt/từ chối).
 * Đầu vào: hanhDong, phongMoiID, ghiChuCSVC, lyDoTuChoiDoiCSVC
 * Đầu ra: object Joi schema để validate body
 */
const xuLyYeuCauDoiPhongPayloadSchema = Joi.object({
  hanhDong: Joi.string().valid('DUYET', 'TU_CHOI').required(),
  phongMoiID: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .optional()
    .when('hanhDong', {
      is: 'DUYET',
      then: Joi.number()
        .required()
        .messages({ 'any.required': 'ID phòng mới là bắt buộc khi duyệt.' }),
      otherwise: Joi.forbidden(),
    }),
  ghiChuCSVC: Joi.string().max(500).allow('', null).optional(),
  lyDoTuChoiDoiCSVC: Joi.string()
    .max(500)
    .allow('', null)
    .optional()
    .when('hanhDong', {
      is: 'TU_CHOI',
      then: Joi.string().min(5).required().messages({
        'any.required': 'Lý do từ chối là bắt buộc khi từ chối.',
        'string.min': 'Lý do từ chối phải có ít nhất 5 ký tự.',
      }),
      otherwise: Joi.optional(),
    }),
});

/**
 * Đối tượng export các middleware validate cho yêu cầu đổi phòng.
 * Đầu vào: request (query, params, body)
 * Đầu ra: middleware validate tương ứng
 */
export const yeuCauDoiPhongValidation = {
  validateGetYeuCauDoiPhongParams: validate(
    getYeuCauDoiPhongParamsSchema,
    'query'
  ),
  validateIdParam: validate(idParamSchema, 'params'),
  validateCreateYeuCauDoiPhongPayload: validate(
    createYeuCauDoiPhongPayloadSchema
  ),
  validateXuLyYeuCauDoiPhongPayload: validate(xuLyYeuCauDoiPhongPayloadSchema),
};
