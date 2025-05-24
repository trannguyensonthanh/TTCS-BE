// src/modules/yeuCauMuonPhong/yeuCauMuonPhong.validation.js
import Joi from 'joi';
import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';
import validate from '../../utils/validation.utils.js';

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

const ycMuonPhongIDParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Yêu cầu mượn phòng là bắt buộc' }),
});

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

const ycMuonPhongChiTietCreatePayloadSchema = Joi.object({
  moTaNhomPhong: Joi.string().max(200).allow('', null).optional(),
  slPhongNhomNay: Joi.number().integer().min(1).required(),
  loaiPhongYcID: Joi.number().integer().positive().allow(null).optional(),
  sucChuaYc: Joi.number().integer().min(1).allow(null).optional(),
  thietBiThemYc: Joi.string().allow('', null).optional(),
  tgMuonDk: Joi.date().iso().required(), // Đổi từ string sang date
  tgTraDk: Joi.date().iso().required().greater(Joi.ref('tgMuonDk')), // Đổi từ string sang date
});

const createYeuCauMuonPhongPayloadSchema = Joi.object({
  suKienID: Joi.number().integer().positive().required(),
  ghiChuChungYc: Joi.string().allow('', null).optional(),
  chiTietYeuCau: Joi.array()
    .items(ycMuonPhongChiTietCreatePayloadSchema)
    .min(1)
    .required(),
});

const phongDuocCapPayloadSchema = Joi.object({
  phongID: Joi.number().integer().positive().required(),
});

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
};
