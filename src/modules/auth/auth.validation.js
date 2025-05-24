// src/modules/auth/auth.validation.js
// Cần cài đặt: npm install joi
import Joi from 'joi';

const loginSchema = Joi.object({
  // email được dùng như tên đăng nhập trong logic hiện tại
  email: Joi.string().required().messages({
    'string.base': `"email" phải là một chuỗi`,
    'string.empty': `"email" không được để trống`,
    'any.required': `"email" là trường bắt buộc`,
  }),
  matKhau: Joi.string().required().messages({
    'string.base': `"matKhau" phải là một chuỗi`,
    'string.empty': `"matKhau" không được để trống`,
    'any.required': `"matKhau" là trường bắt buộc`,
  }),
});

// Middleware validation
const validateLogin = (req, res, next) => {
  const { error } = loginSchema.validate(req.body, { abortEarly: false }); // abortEarly: false để trả về tất cả lỗi
  if (error) {
    const errors = error.details.reduce((acc, current) => {
      acc[current.path[0]] = current.message.replace(/['"]/g, ''); // Loại bỏ dấu nháy kép/đơn
      return acc;
    }, {});
    // Trả về lỗi 400 với chi tiết lỗi
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Dữ liệu không hợp lệ.',
      errors,
    });
  }
  next();
};

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.base': `"email" phải là một chuỗi`,
    'string.email': `"email" không đúng định dạng`,
    'string.empty': `"email" không được để trống`,
    'any.required': `"email" là trường bắt buộc`,
  }),
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.base': `"email" phải là một chuỗi`,
    'string.email': `"email" không đúng định dạng`,
    'string.empty': `"email" không được để trống`,
    'any.required': `"email" là trường bắt buộc`,
  }),
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      // Giả sử OTP 6 chữ số
      'string.base': `"otp" phải là một chuỗi`,
      'string.length': `"otp" phải có đúng 6 ký tự`,
      'string.pattern.base': `"otp" chỉ được chứa chữ số`,
      'string.empty': `"otp" không được để trống`,
      'any.required': `"otp" là trường bắt buộc`,
    }),
});

const resetPasswordSchema = Joi.object({
  resetToken: Joi.string().required().messages({
    /*...*/
  }),
  matKhauMoi: Joi.string().min(6).required().messages({
    // Ví dụ: mật khẩu mới ít nhất 6 ký tự
    'string.base': `"matKhauMoi" phải là một chuỗi`,
    'string.min': `"matKhauMoi" phải có ít nhất {#limit} ký tự`,
    'string.empty': `"matKhauMoi" không được để trống`,
    'any.required': `"matKhauMoi" là trường bắt buộc`,
  }),
});

// Middlewares validation (thêm các hàm mới)
const validateForgotPassword = (req, res, next) => {
  /* Tương tự validateLogin, dùng forgotPasswordSchema */
  const { error } = forgotPasswordSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    const errors = error.details.reduce((acc, current) => {
      acc[current.path[0]] = current.message.replace(/['"]/g, '');
      return acc;
    }, {});
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Dữ liệu không hợp lệ.',
      errors,
    });
  }
  next();
};
const validateVerifyOtp = (req, res, next) => {
  /* Dùng verifyOtpSchema */
  const { error } = verifyOtpSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.reduce((acc, current) => {
      acc[current.path[0]] = current.message.replace(/['"]/g, '');
      return acc;
    }, {});
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Dữ liệu không hợp lệ.',
      errors,
    });
  }
  next();
};
const validateResetPassword = (req, res, next) => {
  /* Dùng resetPasswordSchema */
  const { error } = resetPasswordSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    const errors = error.details.reduce((acc, current) => {
      acc[current.path[0]] = current.message.replace(/['"]/g, '');
      return acc;
    }, {});
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Dữ liệu không hợp lệ.',
      errors,
    });
  }
  next();
};

export const authValidation = {
  login: validateLogin, // Sử dụng middleware này trong route
  forgotPassword: validateForgotPassword, // Sử dụng middleware này trong route
  verifyOtp: validateVerifyOtp, // Sử dụng middleware này trong route
  resetPassword: validateResetPassword, // Sử dụng middleware này trong route
  resendOtp: validateForgotPassword,
};
