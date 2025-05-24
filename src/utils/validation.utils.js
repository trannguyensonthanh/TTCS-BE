import ApiError from './ApiError.util.js';
import httpStatus from '../constants/httpStatus.js';
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
      // stripUnknown: true, // Vẫn có thể giữ nếu muốn loại bỏ các trường không mong muốn, đặc biệt cho query/params
      // allowUnknown: source === 'body', // Cho phép trường lạ trong body nếu cần
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

    if (source === 'query') {
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          req.query[key] = value[key];
        }
      }
    } else if (source === 'params') {
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          req.params[key] = value[key];
        }
      }
    } else {
      // source === 'body'
      req.body = value; // Đối với req.body, việc gán lại thường an toàn hơn
    }

    return next();
  };

export default validate;
