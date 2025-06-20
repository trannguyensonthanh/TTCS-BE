// src/modules/nguoiDung/nguoiDung.validation.js
import Joi from 'joi';
import validate from '../../utils/validation.utils.js';

import MaVaiTro from '../../enums/maVaiTro.enum.js';

/**
 * Schema validate query params lấy danh sách người dùng (phân trang, filter).
 * @type {Joi.ObjectSchema}
 */
const getNguoiDungsParamsSchema = Joi.object({
  searchTerm: Joi.string().allow('', null).optional(),
  loaiNguoiDung: Joi.string()
    .valid('SINH_VIEN', 'GIANG_VIEN', 'NHAN_VIEN_KHAC')
    .allow(null)
    .optional(),
  maVaiTro: Joi.string()
    .allow('', null)
    .optional()
    .custom((value, helpers) => {
      if (!value || value.trim() === '') return null;

      const cacMaHopLe = Object.values(MaVaiTro);
      const maVaiTroArray = value
        .split(',')
        .map((item) => item.trim().toUpperCase());

      // Kiểm tra từng mã trong mảng
      for (const ma of maVaiTroArray) {
        if (!cacMaHopLe.includes(ma)) {
          // Nếu có một mã không hợp lệ, báo lỗi ngay lập tức
          return helpers.error('any.invalid', { value: ma });
        }
      }

      // Nếu tất cả đều hợp lệ, trả về mảng đã xử lý
      return maVaiTroArray;
    })
    .messages({
      'any.invalid': 'Mã vai trò "{{#value}}" không hợp lệ.',
    }),
  donViID: Joi.number().integer().positive().allow(null).optional(),
  isActive: Joi.boolean().allow(null).optional(),
  page: Joi.number().integer().min(1).default(1).allow(null).optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .allow(null)
    .optional(),
  sortBy: Joi.string().allow(null).optional().default('HoTen'),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('asc')
    .allow(null)
    .optional(),
});

/**
 * Schema validate payload đổi mật khẩu cá nhân.
 * @type {Joi.ObjectSchema}
 */
const changePasswordPayloadSchema = Joi.object({
  matKhauHienTai: Joi.string().required().messages({
    'any.required': 'Mật khẩu hiện tại là bắt buộc.',
    'string.empty': 'Mật khẩu hiện tại không được để trống.',
  }),
  matKhauMoi: Joi.string().min(6).required().messages({
    // Ví dụ: ít nhất 6 ký tự
    'string.base': 'Mật khẩu mới phải là chuỗi.',
    'string.min': 'Mật khẩu mới phải có ít nhất {#limit} ký tự.',
    'string.empty': 'Mật khẩu mới không được để trống.',
    'any.required': 'Mật khẩu mới là bắt buộc.',
  }),
  // xacNhanMatKhauMoi: Joi.string().required().valid(Joi.ref('matKhauMoi')).messages({
  //   'any.only': 'Xác nhận mật khẩu mới không khớp.',
  //   'any.required': 'Xác nhận mật khẩu mới là bắt buộc.',
  // }) // FE tự validate, BE không cần nếu không muốn xử lý thêm
});

/**
 * Schema validate param id người dùng.
 * @type {Joi.ObjectSchema}
 */
const idParamSchema = Joi.object({
  nguoiDungId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Người dùng là bắt buộc' }),
});

/**
 * Schema validate payload thông tin sinh viên.
 * @type {Joi.ObjectSchema}
 */
const thongTinSinhVienPayloadSchema = Joi.object({
  lopID: Joi.number().integer().positive().required(),
  khoaHoc: Joi.string().max(50).allow('', null).optional(),
  heDaoTao: Joi.string().max(100).allow('', null).optional(),
  ngayNhapHoc: Joi.string().isoDate().allow(null).optional(),
  trangThaiHocTap: Joi.string().max(50).allow('', null).optional(),
});

/**
 * Schema validate payload thông tin giảng viên.
 * @type {Joi.ObjectSchema}
 */
const thongTinGiangVienPayloadSchema = Joi.object({
  hocVi: Joi.string().max(100).allow('', null).optional(),
  hocHam: Joi.string().max(100).allow('', null).optional(),
  chucDanhGD: Joi.string().max(100).allow('', null).optional(),
  chuyenMonChinh: Joi.string().max(255).allow('', null).optional(),
});

/**
 * Schema validate payload gán vai trò chức năng.
 * @type {Joi.ObjectSchema}
 */
const vaiTroChucNangGanPayloadSchema = Joi.object({
  vaiTroID: Joi.number().integer().positive().required(),
  donViID: Joi.number().integer().positive().allow(null).optional(),
  ngayBatDau: Joi.string().isoDate().allow(null).optional(), // Sẽ default GETDATE() nếu null
  ngayKetThuc: Joi.string().isoDate().allow(null).optional(),
  // ghiChuGanVT không cần thiết ở payload tạo, admin có thể thêm sau
});

/**
 * Schema validate payload tạo mới người dùng (admin).
 * @type {Joi.ObjectSchema}
 */
const createNguoiDungPayloadSchema = Joi.object({
  hoTen: Joi.string().max(150).required(),
  email: Joi.string().email().required(),
  maDinhDanh: Joi.string().max(50).required(),
  matKhau: Joi.string().min(6).required(),
  loaiNguoiDung: Joi.string()
    .valid('SINH_VIEN', 'GIANG_VIEN', 'NHAN_VIEN_KHAC')
    .required(),
  soDienThoai: Joi.string().max(20).allow('', null).optional(),
  anhDaiDien: Joi.string().uri().max(500).allow('', null).optional(),
  isActiveNguoiDung: Joi.boolean().default(true),
  trangThaiTk: Joi.string()
    .valid('Active', 'Locked', 'Disabled')
    .default('Active'),
  ngaySinh: Joi.date().iso().allow(null).optional(),

  // Thông tin chi tiết dựa trên loaiNguoiDung
  thongTinSinhVien: thongTinSinhVienPayloadSchema.when('loaiNguoiDung', {
    is: 'SINH_VIEN',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  thongTinGiangVien: thongTinGiangVienPayloadSchema.when('loaiNguoiDung', {
    // Object này không chứa donViCongTacID
    is: 'GIANG_VIEN',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  donViCongTacID: Joi.number()
    .integer()
    .positive()
    .when('loaiNguoiDung', {
      // donViCongTacID là trường riêng
      is: Joi.valid('GIANG_VIEN', 'NHAN_VIEN_KHAC'),
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),

  // Vai trò chức năng là tùy chọn
  vaiTroChucNang: Joi.array()
    .items(vaiTroChucNangGanPayloadSchema)
    .optional()
    .default([]),
});

/**
 * Schema validate payload cập nhật người dùng (admin).
 * @type {Joi.ObjectSchema}
 */
const updateNguoiDungAdminPayloadSchema = Joi.object({
  hoTen: Joi.string().max(150).optional(),
  email: Joi.string().email().optional(), // Nếu cho phép sửa email, cần kiểm tra unique
  maDinhDanh: Joi.string().max(50).allow(null).optional(), // Mã SV/GV/NV. Nếu sửa, cần kiểm tra unique
  soDienThoai: Joi.string().max(20).allow('', null).optional(),
  anhDaiDien: Joi.string().uri().max(500).allow('', null).optional(),
  isActiveNguoiDung: Joi.boolean().optional(), // Cho NguoiDung.IsActive
  ngaySinh: Joi.date().iso().allow(null).optional(),
  matKhau: Joi.string().min(6).optional(), // Nếu admin muốn reset/thay đổi mật khẩu
  trangThaiTk: Joi.string().valid('Active', 'Locked', 'Disabled').optional(), // Cho TaiKhoan.TrangThaiTk

  thongTinSinhVien: thongTinSinhVienPayloadSchema.allow(null).optional(),
  thongTinGiangVien: thongTinGiangVienPayloadSchema.allow(null).optional(),
})
  .min(1)
  .messages({
    'object.min': 'Cần ít nhất một trường để cập nhật thông tin người dùng.',
  });

/**
 * Schema validate payload cập nhật trạng thái tài khoản người dùng.
 * @type {Joi.ObjectSchema}
 */
const updateUserAccountStatusPayloadSchema = Joi.object({
  isActiveNguoiDung: Joi.boolean().optional(),
  trangThaiTaiKhoan: Joi.string()
    .valid('Active', 'Locked', 'Disabled')
    .optional(),
})
  .or('isActiveNguoiDung', 'trangThaiTaiKhoan') // Phải có ít nhất một trong hai trường
  .messages({
    'object.missing':
      'Cần cung cấp ít nhất một trạng thái để cập nhật (isActiveNguoiDung hoặc trangThaiTaiKhoan).',
  });

/**
 * Schema validate payload gán vai trò chức năng cho người dùng.
 * @type {Joi.ObjectSchema}
 */
const assignFunctionalRolePayloadSchema = Joi.object({
  vaiTroID: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID Vai trò là bắt buộc.' }),
  donViID: Joi.number().integer().positive().allow(null).optional(), // Đơn vị thực thi
  ngayBatDau: Joi.date().iso().allow(null).optional(), // Sẽ default là ngày hiện tại nếu null
  ngayKetThuc: Joi.date()
    .iso()
    .allow(null)
    .optional()
    .when('ngayBatDau', {
      is: Joi.exist(),
      then: Joi.date().iso().allow(null).greater(Joi.ref('ngayBatDau')), // Phải sau ngày bắt đầu nếu có
      otherwise: Joi.optional(),
    }),
  ghiChuGanVT: Joi.string().max(500).allow('', null).optional(),
});

/**
 * Schema validate param ganVaiTroID.
 * @type {Joi.ObjectSchema}
 */
const ganVaiTroIDParamSchema = Joi.object({
  ganVaiTroID: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({ 'any.required': 'ID bản ghi gán vai trò là bắt buộc.' }),
});

/**
 * Schema validate payload cập nhật gán vai trò chức năng.
 * @type {Joi.ObjectSchema}
 */
const updateAssignedFunctionalRolePayloadSchema = Joi.object({
  donViID: Joi.number().integer().positive().allow(null).optional(),
  ngayBatDau: Joi.date().iso().allow(null).optional(),
  ngayKetThuc: Joi.date()
    .iso()
    .allow(null)
    .optional()
    .when('ngayBatDau', {
      is: Joi.exist().not(null), // Chỉ validate greater nếu ngayBatDau được cung cấp và không null
      then: Joi.date().iso().allow(null).greater(Joi.ref('ngayBatDau')),
      otherwise: Joi.optional(),
    }),
  ghiChuGanVT: Joi.string().max(500).allow('', null).optional(),
})
  .min(1)
  .messages({
    'object.min': 'Cần ít nhất một trường để cập nhật thông tin gán vai trò.',
  });

/**
 * Schema validate một dòng dữ liệu người dùng trong file import batch.
 * @type {Joi.ObjectSchema}
 */
const userImportRowPayloadSchema = Joi.object({
  hoTen: Joi.string().max(150).required(),
  email: Joi.string().email().required(),
  soDienThoai: Joi.string().max(20).allow('', null).optional(),
  maDinhDanh: Joi.string().max(50).required().messages({
    // MaDinhDanh là MaSV/GV/NV, bắt buộc
    'any.required': 'Mã định danh (Mã SV/GV/NV) là bắt buộc cho mỗi dòng.',
  }),
  loaiNguoiDung: Joi.string()
    .valid('SINH_VIEN', 'GIANG_VIEN', 'NHAN_VIEN_KHAC')
    .required(),
  donViID: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .when('loaiNguoiDung', {
      is: Joi.valid('SINH_VIEN', 'GIANG_VIEN'), // Bắt buộc cho SV (LopID) và GV (DonViCongTacID)
      then: Joi.number().required(),
      otherwise: Joi.optional(),
    })
    .messages({
      'any.required':
        'Đơn vị (Lớp/Đơn vị công tác) là bắt buộc cho Sinh viên/Giảng viên.',
    }),
  matKhau: Joi.string().min(6).required(), // Mật khẩu đã được FE tạo
  ngaySinh: Joi.date().iso().required(),
  // Sinh viên
  khoaHoc: Joi.string()
    .max(50)
    .allow('', null)
    .when('loaiNguoiDung', { is: 'SINH_VIEN', then: Joi.optional() }),
  heDaoTao: Joi.string()
    .max(100)
    .allow('', null)
    .when('loaiNguoiDung', { is: 'SINH_VIEN', then: Joi.optional() }),
  ngayNhapHoc: Joi.string()
    .isoDate()
    .allow(null)
    .when('loaiNguoiDung', { is: 'SINH_VIEN', then: Joi.optional() }),
  trangThaiHocTap: Joi.string()
    .max(50)
    .allow('', null)
    .when('loaiNguoiDung', { is: 'SINH_VIEN', then: Joi.optional() }),

  // Giảng viên
  hocVi: Joi.string()
    .max(100)
    .allow('', null)
    .when('loaiNguoiDung', { is: 'GIANG_VIEN', then: Joi.optional() }),
  hocHam: Joi.string()
    .max(100)
    .allow('', null)
    .when('loaiNguoiDung', { is: 'GIANG_VIEN', then: Joi.optional() }),
  chucDanhGD: Joi.string()
    .max(100)
    .allow('', null)
    .when('loaiNguoiDung', { is: 'GIANG_VIEN', then: Joi.optional() }),
  chuyenMonChinh: Joi.string()
    .max(255)
    .allow('', null)
    .when('loaiNguoiDung', { is: 'GIANG_VIEN', then: Joi.optional() }),
});

/**
 * Schema validate payload import hàng loạt người dùng.
 * @type {Joi.ObjectSchema}
 */
const importUsersBatchPayloadSchema = Joi.object({
  users: Joi.array()
    .items(userImportRowPayloadSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'Danh sách người dùng không được để trống.',
      'any.required': 'Danh sách người dùng là bắt buộc.',
    }),
});

/**
 * [MỚI] Schema validate query params khi tìm kiếm người dùng để mời.
 */
const findUsersForInvitationParamsSchema = Joi.object({
  suKienID: Joi.number().integer().positive().required().messages({
    'any.required': 'suKienID là bắt buộc.',
  }),
  searchTerm: Joi.string().min(1).required().messages({
    'string.min': 'searchTerm phải có ít nhất 1 ký tự.',
    'any.required': 'searchTerm là bắt buộc.',
  }),
  loaiNguoiDung: Joi.string()
    .valid('SINH_VIEN', 'GIANG_VIEN', 'ALL')
    .default('ALL'),
  donViID: Joi.number().integer().positive().optional(),
  nganhHocID: Joi.number().integer().positive().optional(),
  lopID: Joi.number().integer().positive().optional(),
  limit: Joi.number().integer().min(1).max(50).default(15),
});

/**
 * Middleware validate các schema cho module người dùng.
 * @property {Function} validateGetNguoiDungsParams
 * @property {Function} validateChangePasswordPayload
 * @property {Function} validateIdParam
 * @property {Function} validateCreateNguoiDungPayload
 * @property {Function} validateUpdateNguoiDungAdminPayload
 * @property {Function} validateUpdateUserAccountStatusPayload
 * @property {Function} validateAssignFunctionalRolePayload
 * @property {Function} validateGanVaiTroIDParam
 * @property {Function} validateUpdateAssignedFunctionalRolePayload
 * @property {Function} validateImportUsersBatchPayload
 */
export const nguoiDungValidation = {
  validateGetNguoiDungsParams: validate(getNguoiDungsParamsSchema, 'query'),
  validateChangePasswordPayload: validate(changePasswordPayloadSchema, 'body'),
  validateIdParam: validate(idParamSchema, 'params'),
  validateCreateNguoiDungPayload: validate(createNguoiDungPayloadSchema),
  validateUpdateNguoiDungAdminPayload: validate(
    updateNguoiDungAdminPayloadSchema
  ),
  validateUpdateUserAccountStatusPayload: validate(
    updateUserAccountStatusPayloadSchema
  ),
  validateAssignFunctionalRolePayload: validate(
    assignFunctionalRolePayloadSchema
  ),
  validateGanVaiTroIDParam: validate(ganVaiTroIDParamSchema, 'params'),
  validateUpdateAssignedFunctionalRolePayload: validate(
    updateAssignedFunctionalRolePayloadSchema
  ),
  validateImportUsersBatchPayload: validate(importUsersBatchPayloadSchema),
  validateFindUsersForInvitationParams: validate(
    findUsersForInvitationParamsSchema,
    'query'
  ),
};
