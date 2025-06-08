import ApiError from './ApiError.util.js';
import httpStatus from '../constants/httpStatus.js';

/**
 * Middleware validate dữ liệu đầu vào theo schema và nguồn (body, query, params).
 * Đầu vào: schema (Joi schema), source (string: 'body' | 'query' | 'params')
 * Đầu ra: middleware function cho Express (req, res, next)
 */
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
      req.body = value;
    }

    return next();
  };

export default validate;
