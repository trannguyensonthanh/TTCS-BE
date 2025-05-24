// src/modules/chiTietSuDungPhong/chiTietSuDungPhong.validation.js
import Joi from 'joi';
import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';

// Hàm validate chung
const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const dataToValidate =
      source === 'params'
        ? req.params
        : source === 'query'
          ? req.query
          : req.body;
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const errorMessage = error.details
        .map((details) => details.message.replace(/['"]/g, ''))
        .join(', ');
      return next(
        new ApiError(
          httpStatus.BAD_REQUEST,
          `Lỗi dữ liệu đầu vào: ${errorMessage}`
        )
      );
    }
    if (source === 'query') req.query = value;
    else if (source === 'params') req.params = value;
    else req.body = value;
    return next();
  };

const getMyActiveBookedRoomsParamsSchema = Joi.object({
  nguoiYeuCauID: Joi.number().integer().positive().optional(), // Sẽ được set ở service nếu không phải admin
  limit: Joi.number().integer().min(1).max(100).default(20),
  // Không cần page ở đây nếu chỉ lấy danh sách cho dropdown/select
  // searchTerm: Joi.string().allow('').optional(), // Có thể thêm tìm kiếm nếu danh sách quá dài
});

export const chiTietSuDungPhongValidation = {
  validateGetMyActiveBookedRoomsParams: validate(
    getMyActiveBookedRoomsParamsSchema,
    'query'
  ),
};
