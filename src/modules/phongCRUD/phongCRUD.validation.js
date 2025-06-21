// src/modules/phongCRUD/phongCRUD.validation.js
import Joi from 'joi';
import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';
import validate from '../../utils/validation.utils.js';

const getPhongParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  loaiPhongID: Joi.number().integer().positive().allow(null).optional(),
  trangThaiPhongID: Joi.number().integer().positive().allow(null).optional(), // Hoặc MaTrangThaiPhong
  trangThaiPhongMa: Joi.string().max(20).allow('', null).optional(),
  toaNhaID: Joi.number().integer().positive().allow(null).optional(),
  toaNhaTangID: Joi.number().integer().positive().allow(null).optional(),
  sucChuaTu: Joi.number().integer().min(0).allow(null).optional(),
  sucChuaDen: Joi.number()
    .integer()
    .min(Joi.ref('sucChuaTu'))
    .allow(null)
    .optional(),
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

const idParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Phòng là bắt buộc' }),
});

const thietBiTrongPhongInputSchema = Joi.object({
  thietBiID: Joi.number().integer().positive().required(),
  soLuong: Joi.number().integer().min(1).required(),
  tinhTrang: Joi.string().max(200).allow('', null).optional(),
});

const createPhongPayloadSchema = Joi.object({
  tenPhong: Joi.string().max(150).required(), // Đổi từ 100 theo DB
  maPhong: Joi.string().max(50).allow('', null).optional(), // UNIQUE nếu có
  loaiPhongID: Joi.number().integer().positive().required(),
  sucChua: Joi.number().integer().min(0).allow(null).optional(),
  trangThaiPhongID: Joi.number().integer().positive().required(),
  moTaChiTietPhong: Joi.string().allow('', null).optional(),
  anhMinhHoa: Joi.string().uri().max(500).allow('', null).optional(),
  toaNhaTangID: Joi.number().integer().positive().required(), // Bắt buộc
  soThuTuPhong: Joi.string().max(20).allow('', null).optional(),
  thietBiTrongPhong: Joi.array()
    .items(thietBiTrongPhongInputSchema)
    .optional()
    .default([]),
});

const updatePhongPayloadSchema = Joi.object({
  tenPhong: Joi.string().max(150).optional(),
  maPhong: Joi.string().max(50).allow('', null).optional(),
  loaiPhongID: Joi.number().integer().positive().optional(),
  sucChua: Joi.number().integer().min(0).allow(null).optional(),
  trangThaiPhongID: Joi.number().integer().positive().optional(),
  moTaChiTietPhong: Joi.string().allow('', null).optional(),
  anhMinhHoa: Joi.string().uri().max(500).allow('', null).optional(),
  toaNhaTangID: Joi.number().integer().positive().optional(),
  soThuTuPhong: Joi.string().max(20).allow('', null).optional(),
  thietBiTrongPhong: Joi.array().items(thietBiTrongPhongInputSchema).optional(),
})
  .min(1)
  .messages({
    'object.min': 'Cần ít nhất một trường để cập nhật thông tin phòng.',
  });

const generateMaPhongParamsSchema = Joi.object({
  toaNhaTangID: Joi.number().integer().positive().required(),
  loaiPhongID: Joi.number().integer().positive().optional(),
  soThuTuPhong: Joi.string().max(20).required(),
  phongID: Joi.number().integer().positive().optional(), // ID phòng đang sửa (nếu có)
});

export const phongCRUDValidation = {
  /**
   * Validate query params cho lấy danh sách phòng (lọc, phân trang, sắp xếp).
   * @returns {function} Middleware validate query params.
   */
  validateGetPhongParams: validate(getPhongParamsSchema, 'query'),

  /**
   * Validate param :id cho các route thao tác với phòng theo ID.
   * @returns {function} Middleware validate param id.
   */
  validateIdParam: validate(idParamSchema, 'params'),

  /**
   * Validate body khi tạo mới phòng.
   * @returns {function} Middleware validate body tạo phòng.
   */
  validateCreatePhongPayload: validate(createPhongPayloadSchema),

  /**
   * Validate body khi cập nhật phòng.
   * @returns {function} Middleware validate body cập nhật phòng.
   */
  validateUpdatePhongPayload: validate(updatePhongPayloadSchema),

  /**
   * Validate query params khi sinh mã phòng gợi ý.
   * @returns {function} Middleware validate query params sinh mã phòng.
   */
  validateGenerateMaPhongParams: validate(generateMaPhongParamsSchema, 'query'),
};
