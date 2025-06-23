// src/modules/suKien/suKien.validation.js
import Joi from 'joi';
import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';
import validate from '../../utils/validation.utils.js';

const getSuKienParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('').optional(),
  trangThaiSkMa: Joi.string().allow('').optional(),
  // loaiSuKienMa: Joi.string().allow('').optional(),
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
    'number.base': 'ID sự kiện phải là một số',
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
  tgBatDauDK: Joi.date().iso().required().messages({
    'any.required': 'Thời gian bắt đầu là bắt buộc.',
  }),
  tgKetThucDK: Joi.date().iso().required().min(Joi.ref('tgBatDauDK')).messages({
    'any.required': 'Thời gian kết thúc là bắt buộc.',
    'date.min': 'Thời gian kết thúc phải sau thời gian bắt đầu.', // Quy tắc 1
  }),
  moTaChiTiet: Joi.string().allow('', null),
  donViChuTriID: Joi.number().integer().positive().required(),
  loaiSuKienID: Joi.number().integer().positive().allow(null).optional(),
  nguoiChuTriID: Joi.number().integer().positive().allow(null).optional(),
  tenChuTriNgoai: Joi.string().max(150).allow('', null).optional(),
  donViChuTriNgoai: Joi.string().max(200).allow('', null).optional(),
  slThamDuDK: Joi.number().integer().min(0).allow(null).optional().messages({
    'number.min': 'Số lượng tham dự phải là số dương.', // Quy tắc 12
  }),
  isCongKhaiNoiBo: Joi.boolean().default(false),
  khachMoiNgoaiGhiChu: Joi.string().allow('', null),
  cacDonViThamGiaIDs: Joi.array()
    .items(Joi.number().integer().positive())
    .optional(),

  // Ví dụ: donViThamGiaIDs: Joi.array().items(Joi.number().integer().positive()).optional(),
  //        nguoiDuocMoiIDs: Joi.array().items(Joi.number().integer().positive()).optional(),
})
  .with('tenChuTriNgoai', 'donViChuTriNgoai') // Nếu có tenChuTriNgoai thì phải có donViChuTriNgoai
  .without('nguoiChuTriID', ['tenChuTriNgoai', 'donViChuTriNgoai']); // Không thể có cả nguoiChuTriID và tenChuTriNgoai

const updateSuKienSchema = Joi.object({
  tenSK: Joi.string().max(300).optional(),
  moTaChiTiet: Joi.string().allow('', null).optional(),
  tgBatDauDK: Joi.date().iso().optional(),
  tgKetThucDK: Joi.date().iso().optional().min(Joi.ref('tgBatDauDK')),
  slThamDuDK: Joi.number().integer().min(0).allow(null).optional(),
  donViChuTriID: Joi.number().integer().positive().optional(), // Cân nhắc không cho sửa
  nguoiChuTriID: Joi.number().integer().positive().allow(null).optional(),
  tenChuTriNgoai: Joi.string().max(150).allow('', null).optional(),
  donViChuTriNgoai: Joi.string().max(200).allow('', null).optional(),
  cacDonViThamGiaIDs: Joi.array()
    .items(Joi.number().integer().positive())
    .optional()
    .default([]),
  khachMoiNgoaiGhiChu: Joi.string().allow('', null).optional(),
  isCongKhaiNoiBo: Joi.boolean().optional(),
  loaiSuKienID: Joi.number().integer().positive().allow(null).optional(),
  ghiChuPhanHoiChoBGH: Joi.string().max(1000).allow('', null).optional(),
}).min(1);

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
  coTheTaoYeuCauPhongMoi: Joi.boolean().default(true),
  sortBy: Joi.string().optional().default('TgBatDauDK'),
  sortOrder: Joi.string().valid('asc', 'desc').default('ASC'),
});

const getSuKienCoTheMoiParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  donViToChucID: Joi.number().integer().positive().optional(),
  loaiSuKienID: Joi.number().integer().positive().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional().default('TgBatDauDK'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const moiThamGiaPayloadItemSchema = Joi.object({
  nguoiDuocMoiID: Joi.number().integer().positive().required(),
  vaiTroDuKienSK: Joi.string().max(200).allow('', null).optional(),
  ghiChuMoi: Joi.string().max(500).allow('', null).optional(),
});

const guiLoiMoiPayloadSchema = Joi.array()
  .items(moiThamGiaPayloadItemSchema)
  .min(1)
  .required()
  .messages({
    'array.min': 'Phải có ít nhất một người được mời.',
    'any.required': 'Danh sách người mời là bắt buộc.',
  });

const getDanhSachMoiParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  trangThaiPhanHoi: Joi.string()
    .valid('CHUA_PHAN_HOI', 'CHAP_NHAN', 'TU_CHOI', 'ALL')
    .default('ALL'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional().default('NguoiDung.HoTen'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

const tieuChiMoiHangLoatSchema = Joi.object({
  loaiNguoiDung: Joi.string()
    .valid(
      'SINH_VIEN_THEO_KHOA',
      'GIANG_VIEN_THEO_KHOA',
      'TAT_CA_SV',
      'TAT_CA_GV',
      'SINH_VIEN_THEO_LOP',
      'SINH_VIEN_THEO_NGANH'
    )
    .required(),
  donViIDs: Joi.array().items(Joi.number().integer().positive()).optional(),
  nganhHocIDs: Joi.array().items(Joi.number().integer().positive()).optional(),
  lopIDs: Joi.array().items(Joi.number().integer().positive()).optional(),
  nienKhoaSV: Joi.string().optional(),
  trangThaiHocTapSV: Joi.string().optional(),
  hocViGV: Joi.string().optional(),
});

const guiLoiMoiHangLoatPayloadSchema = Joi.object({
  loaiDoiTuongMoi: Joi.string()
    .valid('THEO_TIEU_CHI', 'DANH_SACH_CU_THE')
    .required(),
  tieuChiMoi: tieuChiMoiHangLoatSchema.when('loaiDoiTuongMoi', {
    is: 'THEO_TIEU_CHI',
    then: Joi.required(),
  }),
  danhSachNguoiDungIDs: Joi.array()
    .items(Joi.number().integer().positive())
    .when('loaiDoiTuongMoi', {
      is: 'DANH_SACH_CU_THE',
      then: Joi.required(),
    }),
  vaiTroDuKienSK: Joi.string().max(200).allow('', null).optional(),
  ghiChuMoiChung: Joi.string().max(500).allow('', null).optional(),
  loaiTruNguoiDungIDs: Joi.array()
    .items(Joi.number().integer().positive())
    .optional(),
});

const getMyAttendedEventsParamsSchema = Joi.object({
  trangThaiSuKien: Joi.string()
    .valid('SAP_DIEN_RA', 'DANG_DIEN_RA', 'DA_HOAN_THANH', 'DA_HUY', 'ALL')
    .default('ALL'),
  daDanhGia: Joi.boolean().optional(),
  tuNgay: Joi.string().isoDate().optional(),
  denNgay: Joi.string().isoDate().optional().min(Joi.ref('tuNgay')),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  sortBy: Joi.string().optional().default('SuKien.TgKetThucDK'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

const getEventsWithInvitationsParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  donViToChucID: Joi.number().integer().positive().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional().default('NgayTaoSK'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const suKienValidation = {
  /**
   * Middleware validate query params cho lấy danh sách sự kiện (lọc, phân trang, sắp xếp).
   * @returns {function} Middleware validate query params.
   */
  validateGetSuKienParams: validate(getSuKienParamsSchema, 'query'),

  /**
   * Middleware validate param :suKienID cho các route thao tác với sự kiện theo ID.
   * @returns {function} Middleware validate param suKienID.
   */
  validateSuKienIDParam: validate(suKienIDParamSchema, 'params'),

  /**
   * Middleware validate param :id cho các route public lấy sự kiện theo ID.
   * @returns {function} Middleware validate param id.
   */
  validatePublicSuKienIDParam: validate(publicSuKienIDParamSchema, 'params'),

  /**
   * Middleware validate body khi cập nhật trạng thái sự kiện.
   * @returns {function} Middleware validate body cập nhật trạng thái.
   */
  validateUpdateTrangThaiPayload: validate(
    updateTrangThaiPayloadSchema,
    'body'
  ),

  /**
   * Middleware validate body khi tạo mới sự kiện.
   * @returns {function} Middleware validate body tạo sự kiện.
   */
  validateCreateSuKien: validate(createSuKienSchema),

  /**
   * Middleware validate body khi cập nhật sự kiện.
   * @returns {function} Middleware validate body cập nhật sự kiện.
   */
  validateUpdateSuKien: validate(updateSuKienSchema),

  /**
   * Middleware validate body khi duyệt sự kiện bởi BGH.
   * @returns {function} Middleware validate body duyệt sự kiện.
   */
  validateDuyetSuKienBGHPayload: validate(duyetSuKienBGHPayloadSchema, 'body'),

  /**
   * Middleware validate body khi từ chối sự kiện bởi BGH.
   * @returns {function} Middleware validate body từ chối sự kiện.
   */
  validateTuChoiSuKienBGHPayload: validate(
    tuChoiSuKienBGHPayloadSchema,
    'body'
  ),

  /**
   * Middleware validate param :id cho các route cần ID chung.
   * @returns {function} Middleware validate param id.
   */
  validateIDParam: validate(idParamSchema, 'params'),

  /**
   * Middleware validate query params cho lấy danh sách sự kiện để chọn tạo yêu cầu phòng.
   * @returns {function} Middleware validate query params.
   */
  validateGetSuKienForSelectParams: validate(
    getSuKienForSelectParamsSchema,
    'query'
  ),

  validateGetSuKienCoTheMoiParams: validate(
    getSuKienCoTheMoiParamsSchema,
    'query'
  ),

  validateGuiLoiMoiPayload: validate(guiLoiMoiPayloadSchema, 'body'),
  validateGetDanhSachMoiParams: validate(getDanhSachMoiParamsSchema, 'query'),
  validateGuiLoiMoiHangLoatPayload: validate(
    guiLoiMoiHangLoatPayloadSchema,
    'body'
  ),

  validateGetMyAttendedEventsParams: validate(
    getMyAttendedEventsParamsSchema,
    'query'
  ),

  validateGetEventsWithInvitationsParams: validate(
    getEventsWithInvitationsParamsSchema,
    'query'
  ),
};
