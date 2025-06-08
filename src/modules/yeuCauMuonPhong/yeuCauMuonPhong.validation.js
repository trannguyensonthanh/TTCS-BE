// src/modules/yeuCauMuonPhong/yeuCauMuonPhong.validation.js
import Joi from 'joi';
import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';
import validate from '../../utils/validation.utils.js';

/**
 * Schema kiểm tra query params khi lấy danh sách yêu cầu mượn phòng.
 * Đầu vào: query params (searchTerm, trangThaiChungMa, suKienID, nguoiYeuCauID, donViYeuCauID, tuNgayYeuCau, denNgayYeuCau, page, limit, sortBy, sortOrder)
 * Đầu ra: Joi schema validate query
 */
const getYeuCauMuonPhongParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('').optional(),
  trangThaiChungMa: Joi.string().allow('').optional(),
  suKienID: Joi.number().integer().positive().optional(),
  nguoiYeuCauID: Joi.number().integer().positive().optional(),
  donViYeuCauID: Joi.number().integer().positive().optional(),
  tuNgayYeuCau: Joi.date().iso().optional(),
  denNgayYeuCau: Joi.date().iso().optional().min(Joi.ref('tuNgayYeuCau')),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

/**
 * Schema kiểm tra params id khi lấy chi tiết hoặc thao tác yêu cầu mượn phòng.
 * Đầu vào: params (id)
 * Đầu ra: Joi schema validate params
 */
const ycMuonPhongIDParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Yêu cầu mượn phòng là bắt buộc' }),
});

/**
 * Schema kiểm tra params id khi thao tác chi tiết yêu cầu mượn phòng.
 * Đầu vào: params (ycMuonPhongID, ycMuonPhongCtID)
 * Đầu ra: Joi schema validate params
 */
const ycMuonPhongChiTietIDParamSchema = Joi.object({
  ycMuonPhongID: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Yêu cầu mượn phòng (header) là bắt buộc' }),
  ycMuonPhongCtID: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Chi tiết yêu cầu mượn phòng là bắt buộc' }),
});

/**
 * Schema kiểm tra payload khi tạo mới chi tiết yêu cầu mượn phòng.
 * Đầu vào: body (moTaNhomPhong, slPhongNhomNay, loaiPhongYcID, sucChuaYc, thietBiThemYc, tgMuonDk, tgTraDk)
 * Đầu ra: Joi schema validate body
 */
const ycMuonPhongChiTietCreatePayloadSchema = Joi.object({
  moTaNhomPhong: Joi.string().max(200).allow('', null).optional(),
  slPhongNhomNay: Joi.number().integer().min(1).required(),
  loaiPhongYcID: Joi.number().integer().positive().allow(null).optional(),
  sucChuaYc: Joi.number().integer().min(1).allow(null).optional(),
  thietBiThemYc: Joi.string().allow('', null).optional(),
  tgMuonDk: Joi.date().iso().required(), // Đổi từ string sang date
  tgTraDk: Joi.date().iso().required().greater(Joi.ref('tgMuonDk')), // Đổi từ string sang date
});

/**
 * Schema kiểm tra payload khi tạo mới yêu cầu mượn phòng.
 * Đầu vào: body (suKienID, ghiChuChungYc, chiTietYeuCau[])
 * Đầu ra: Joi schema validate body
 */
const createYeuCauMuonPhongPayloadSchema = Joi.object({
  suKienID: Joi.number().integer().positive().required(),
  ghiChuChungYc: Joi.string().allow('', null).optional(),
  chiTietYeuCau: Joi.array()
    .items(ycMuonPhongChiTietCreatePayloadSchema)
    .min(1)
    .required(),
});

/**
 * Schema kiểm tra payload phòng được cấp khi duyệt chi tiết yêu cầu.
 * Đầu vào: body (phongID)
 * Đầu ra: Joi schema validate body
 */
const phongDuocCapPayloadSchema = Joi.object({
  phongID: Joi.number().integer().positive().required(),
});

/**
 * Schema kiểm tra payload khi xử lý chi tiết yêu cầu mượn phòng.
 * Đầu vào: body (hanhDong, phongDuocCap[], ghiChuCSVC)
 * Đầu ra: Joi schema validate body
 */
const xuLyYcChiTietPayloadSchema = Joi.object({
  hanhDong: Joi.string().valid('DUYET', 'TU_CHOI').required(),
  phongDuocCap: Joi.array()
    .items(phongDuocCapPayloadSchema)
    .optional()
    .when('hanhDong', {
      is: 'DUYET',
      then: Joi.array().min(1).required(), // Nếu duyệt, phải có ít nhất 1 phòng được cấp
      otherwise: Joi.array().forbidden(), // Nếu từ chối, không được có phòngDuocCap
    }),
  ghiChuCSVC: Joi.string()
    .allow('', null)
    .optional()
    .when('hanhDong', {
      is: 'TU_CHOI',
      then: Joi.string()
        .min(5)
        .required()
        .messages({ 'string.min': 'Lý do từ chối phải có ít nhất 5 ký tự' }), // Nếu từ chối, lý do là bắt buộc (ví dụ)
      otherwise: Joi.string().allow('', null),
    }),
});

/**
 * Schema kiểm tra payload khi cập nhật chi tiết yêu cầu mượn phòng.
 * Đầu vào: body (ycMuonPhongCtID, moTaNhomPhong, slPhongNhomNay, loaiPhongYcID, sucChuaYc, thietBiThemYc, tgMuonDk, tgTraDk)
 * Đầu ra: Joi schema validate body
 */
const ycMuonPhongChiTietUpdatePayloadSchema = Joi.object({
  ycMuonPhongCtID: Joi.number().integer().positive().allow(null, 0).optional(), // ID của chi tiết cũ, null hoặc 0 cho chi tiết mới
  moTaNhomPhong: Joi.string().max(200).allow('', null).optional(),
  slPhongNhomNay: Joi.number().integer().min(1).required(),
  loaiPhongYcID: Joi.number().integer().positive().allow(null).optional(),
  sucChuaYc: Joi.number().integer().min(1).allow(null).optional(),
  thietBiThemYc: Joi.string().allow('', null).optional(),
  tgMuonDk: Joi.date().iso().required(),
  tgTraDk: Joi.date().iso().required().greater(Joi.ref('tgMuonDk')),
})
  .min(1)
  .custom((value, helpers) => {
    if (
      value.tgMuonDk &&
      value.tgTraDk &&
      new Date(value.tgTraDk) <= new Date(value.tgMuonDk)
    ) {
      return helpers.error('date.greater');
    }
    return value;
  })
  .messages({
    'object.min': 'Cần ít nhất một trường để cập nhật.',
    'date.greater':
      'Thời gian trả phòng dự kiến phải sau thời gian mượn dự kiến.',
  });

/**
 * Schema kiểm tra payload khi cập nhật toàn bộ yêu cầu mượn phòng.
 * Đầu vào: body (ghiChuChungYc, chiTietYeuCau[], ghiChuPhanHoiChoCSVC)
 * Đầu ra: Joi schema validate body
 */
const updateYeuCauMuonPhongPayloadSchema = Joi.object({
  ghiChuChungYc: Joi.string().allow('', null).optional(),
  chiTietYeuCau: Joi.array()
    .items(ycMuonPhongChiTietUpdatePayloadSchema)
    .min(1)
    .required(),
  ghiChuPhanHoiChoCSVC: Joi.string().max(1000).allow('', null).optional(),
});

/**
 * Export các middleware validate cho yêu cầu mượn phòng.
 * Đầu vào: request (body, query, params)
 * Đầu ra: middleware validate tương ứng
 */
export const yeuCauMuonPhongValidation = {
  validateGetYeuCauMuonPhongParams: validate(
    getYeuCauMuonPhongParamsSchema,
    'query'
  ),
  validateYcMuonPhongIDParam: validate(ycMuonPhongIDParamSchema, 'params'),
  validateYcMuonPhongChiTietIDParams: validate(
    ycMuonPhongChiTietIDParamSchema,
    'params'
  ),
  validateCreateYeuCauMuonPhongPayload: validate(
    createYeuCauMuonPhongPayloadSchema
  ),
  validateXuLyYcChiTietPayload: validate(xuLyYcChiTietPayloadSchema),
  validateUpdateYeuCauMuonPhongPayload: validate(
    updateYeuCauMuonPhongPayloadSchema
  ),
};
