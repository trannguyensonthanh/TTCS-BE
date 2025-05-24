// src/modules/suKien/suKien.validation.js
import Joi from 'joi';
import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';
import validate from '../../utils/validation.utils.js';

const getSuKienParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('').optional(),
  trangThaiSkMa: Joi.string().allow('').optional(),
  // loaiSuKienMa: Joi.string().allow('').optional(), // Nếu có
  donViChuTriID: Joi.number().integer().positive().optional(),
  tuNgay: Joi.date().iso().optional(),
  denNgay: Joi.date().iso().optional().min(Joi.ref('tuNgay')),
  isCongKhaiNoiBo: Joi.boolean().optional(),
  sapDienRa: Joi.boolean().optional(),
  nguoiTaoID: Joi.number().integer().positive().optional(),
  thamGiaDonViID: Joi.number().integer().positive().optional(),
  thamGiaNguoiDungID: Joi.number().integer().positive().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(), // Ví dụ: 'TenSK', 'TgBatDauDK'
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const publicSuKienIDParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    // Đổi thành 'id'
    'number.base': 'ID sự kiện phải là một số',
    // ... các messages khác
  }),
});

const suKienIDParamSchema = Joi.object({
  suKienID: Joi.number().integer().positive().required().messages({
    'number.base': 'ID sự kiện phải là một số',
    'number.integer': 'ID sự kiện phải là số nguyên',
    'number.positive': 'ID sự kiện phải là số dương',
    'any.required': 'ID sự kiện là bắt buộc',
  }),
});

const updateTrangThaiPayloadSchema = Joi.object({
  maTrangThaiMoi: Joi.string().required().messages({
    'string.empty': 'Mã trạng thái mới không được để trống',
    'any.required': 'Mã trạng thái mới là bắt buộc',
  }),
  lyDo: Joi.string().allow('').optional(),
});

const createSuKienSchema = Joi.object({
  tenSK: Joi.string().max(300).required(),
  tgBatDauDK: Joi.date().iso().required(),
  tgKetThucDK: Joi.date().iso().required().min(Joi.ref('tgBatDauDK')),
  moTaChiTiet: Joi.string().allow('', null),
  donViChuTriID: Joi.number().integer().positive().required(),
  loaiSuKienID: Joi.number().integer().positive().allow(null).optional(), // Cho phép null nếu không bắt buộc
  nguoiChuTriID: Joi.number().integer().positive().allow(null).optional(),
  tenChuTriNgoai: Joi.string().max(150).allow('', null).optional(),
  donViChuTriNgoai: Joi.string().max(200).allow('', null).optional(),
  slThamDuDK: Joi.number().integer().min(0).allow(null).optional(),
  isCongKhaiNoiBo: Joi.boolean().default(false),
  khachMoiNgoaiGhiChu: Joi.string().allow('', null),
  // Thêm các trường khác bạn cho phép client gửi lên khi tạo
  // Ví dụ: donViThamGiaIDs: Joi.array().items(Joi.number().integer().positive()).optional(),
  //        nguoiDuocMoiIDs: Joi.array().items(Joi.number().integer().positive()).optional(),
})
  .with('tenChuTriNgoai', 'donViChuTriNgoai') // Nếu có tenChuTriNgoai thì phải có donViChuTriNgoai
  .without('nguoiChuTriID', ['tenChuTriNgoai', 'donViChuTriNgoai']); // Không thể có cả nguoiChuTriID và tenChuTriNgoai

const updateSuKienSchema = Joi.object({
  tenSK: Joi.string().max(300).optional(),
  tgBatDauDK: Joi.date().iso().optional(),
  tgKetThucDK: Joi.date().iso().optional().min(Joi.ref('tgBatDauDK')),
  // ... các trường khác có thể sửa, bao gồm loaiSuKienID
  loaiSuKienID: Joi.number().integer().positive().allow(null).optional(),
  // ...
}).min(1); // Ít nhất một trường để cập nhật

const duyetSuKienBGHPayloadSchema = Joi.object({
  ghiChuBGH: Joi.string().max(1000).allow('', null).optional(),
});

const tuChoiSuKienBGHPayloadSchema = Joi.object({
  lyDoTuChoiBGH: Joi.string().min(10).max(1000).required().messages({
    'string.base': 'Lý do từ chối phải là chuỗi',
    'string.empty': 'Lý do từ chối không được để trống',
    'string.min': 'Lý do từ chối phải có ít nhất {#limit} ký tự',
    'string.max': 'Lý do từ chối không được vượt quá {#limit} ký tự',
    'any.required': 'Lý do từ chối là bắt buộc',
  }),
});

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID phải là một số',
    'number.integer': 'ID phải là số nguyên',
    'number.positive': 'ID phải là số dương',
    'any.required': 'ID là bắt buộc',
  }),
});

const getSuKienForSelectParamsSchema = Joi.object({
  nguoiTaoID: Joi.number().integer().positive().optional(),
  donViChuTriID: Joi.number().integer().positive().optional(),
  searchTerm: Joi.string().allow('').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  coTheTaoYeuCauPhongMoi: Joi.boolean().default(true), // Mặc định là true
  sortBy: Joi.string().optional().default('TgBatDauDK'), // <<<< THÊM LẠI, default có thể là TgBatDauDK
  sortOrder: Joi.string().valid('asc', 'desc').default('ASC'), // <<<< THÊM LẠI
});

export const suKienValidation = {
  validateGetSuKienParams: validate(getSuKienParamsSchema, 'query'),
  validateSuKienIDParam: validate(suKienIDParamSchema, 'params'),
  validatePublicSuKienIDParam: validate(publicSuKienIDParamSchema, 'params'), // Dùng cho route public
  validateUpdateTrangThaiPayload: validate(
    updateTrangThaiPayloadSchema,
    'body'
  ),
  validateCreateSuKien: validate(createSuKienSchema),
  validateUpdateSuKien: validate(updateSuKienSchema),
  validateDuyetSuKienBGHPayload: validate(duyetSuKienBGHPayloadSchema, 'body'),
  validateTuChoiSuKienBGHPayload: validate(
    tuChoiSuKienBGHPayloadSchema,
    'body'
  ),
  validateIDParam: validate(idParamSchema, 'params'), // Dùng chung cho các route cần ID
  validateGetSuKienForSelectParams: validate(
    getSuKienForSelectParamsSchema,
    'query'
  ),
};
