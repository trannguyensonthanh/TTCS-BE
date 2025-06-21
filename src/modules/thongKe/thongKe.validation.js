import Joi from 'joi';
import validate from '../../utils/validation.utils.js';

function compareDateRef(value, helpers, refKey) {
  const refValue = helpers.state.ancestors[0][refKey];
  if (refValue && value && new Date(value) < new Date(refValue)) {
    return helpers.error('date.min', { limit: refValue });
  }
  return value;
}

const thongKeBaseParamsSchema = Joi.object({
  tuNgay: Joi.string().isoDate().optional(),
  denNgay: Joi.string()
    .isoDate()
    .optional()
    .custom((value, helpers) => compareDateRef(value, helpers, 'tuNgay'))
    .messages({
      'date.min': 'denNgay phải sau hoặc bằng tuNgay.',
    }),
  donViID: Joi.number().integer().positive().optional(),
});

const thongKeDanhGiaParamsSchema = Joi.object({
  tuNgaySuKienKetThuc: Joi.string().isoDate().optional(),
  denNgaySuKienKetThuc: Joi.string()
    .isoDate()
    .optional()
    .custom((value, helpers) =>
      compareDateRef(value, helpers, 'tuNgaySuKienKetThuc')
    )
    .messages({
      'date.min':
        'denNgaySuKienKetThuc phải sau hoặc bằng tuNgaySuKienKetThuc.',
    }),
  donViID: Joi.number().integer().positive().optional(),
  loaiSuKienID: Joi.number().integer().positive().optional(),
  tieuChiDiem: Joi.string()
    .valid('NOI_DUNG', 'TO_CHUC', 'DIA_DIEM', 'TONG_QUAT')
    .default('TONG_QUAT'),
});

/**
 * [MỚI] Schema validate params cho API thống kê sự kiện theo thời gian.
 */
const thongKeThoiGianParamsSchema = Joi.object({
  tuNgay: Joi.string().isoDate().required().messages({
    'any.required': 'tuNgay là bắt buộc.',
  }),
  denNgay: Joi.string()
    .isoDate()
    .required()
    .custom((value, helpers) => compareDateRef(value, helpers, 'tuNgay'))
    .messages({
      'any.required': 'denNgay là bắt buộc.',
      'date.min': 'denNgay phải sau hoặc bằng tuNgay.',
    }),
  donViThoiGian: Joi.string().valid('THANG', 'TUAN', 'QUY').default('THANG'),
  donViID: Joi.number().integer().positive().optional(),
});

/**
 * [MỚI] Schema validate params cho API lấy yêu cầu chờ xử lý.
 */
const getYeuCauChoXuLyParamsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(5),
});

const getCsVcKpiParamsSchema = Joi.object({
  toaNhaID: Joi.number().integer().positive().optional(),
  coSoID: Joi.number().integer().positive().optional(),
  ngayHienTai: Joi.string().isoDate().optional(),
});

const suDungPhongTheoThoiGianParamsSchema = Joi.object({
  tuNgay: Joi.string().isoDate().required(),
  denNgay: Joi.string()
    .isoDate()
    .required()
    .custom((value, helpers) => compareDateRef(value, helpers, 'tuNgay'))
    .messages({
      'date.min': 'denNgay phải sau hoặc bằng tuNgay.',
    }),
  donViThoiGian: Joi.string().valid('NGAY', 'TUAN', 'THANG').default('NGAY'),
  toaNhaID: Joi.number().integer().positive().optional(),
  loaiPhongID: Joi.number().integer().positive().optional(),
});

const loaiPhongPhoBienParamsSchema = Joi.object({
  tuNgay: Joi.string().isoDate().optional(),
  denNgay: Joi.string()
    .isoDate()
    .optional()
    .custom((value, helpers) => compareDateRef(value, helpers, 'tuNgay'))
    .messages({
      'date.min': 'denNgay phải sau hoặc bằng tuNgay.',
    }),
  limit: Joi.number().integer().min(1).max(20).default(5),
});

const thongKeThietBiParamsSchema = Joi.object({
  loaiThongKe: Joi.string().valid('SU_DUNG_NHIEU', 'TINH_TRANG').required(),
  tuNgay: Joi.string().isoDate().optional(),
  denNgay: Joi.string()
    .isoDate()
    .optional()
    .custom((value, helpers) => compareDateRef(value, helpers, 'tuNgay'))
    .messages({
      'date.min': 'denNgay phải sau hoặc bằng tuNgay.',
    }),
  limit: Joi.number().integer().min(1).max(50).default(10),
  toaNhaID: Joi.number().integer().positive().optional(),
  loaiPhongID: Joi.number().integer().positive().optional(),
});

export const thongKeValidation = {
  validateThongKeParams: validate(thongKeBaseParamsSchema, 'query'),
  validateThongKeDanhGiaParams: validate(thongKeDanhGiaParamsSchema, 'query'),
  validateThongKeThoiGianParams: validate(thongKeThoiGianParamsSchema, 'query'),
  validateGetYeuCauChoXuLyParams: validate(
    getYeuCauChoXuLyParamsSchema,
    'query'
  ),
  validateGetCsVcKpiParams: validate(getCsVcKpiParamsSchema, 'query'),
  validateSuDungPhongTheoThoiGianParams: validate(
    suDungPhongTheoThoiGianParamsSchema,
    'query'
  ),
  validateLoaiPhongPhoBienParams: validate(
    loaiPhongPhoBienParamsSchema,
    'query'
  ),
  validateThongKeThietBiParams: validate(thongKeThietBiParamsSchema, 'query'),
};
