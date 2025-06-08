import httpStatus from '../constants/httpStatus.js';

/**
 * Trả về response thành công với status code và message tuỳ chọn.
 * Đầu vào: res (object), statusCode (number), message (string), data (object|null)
 * Đầu ra: response JSON
 */
const successResponse = (res, statusCode, message, data) => {
  if (data === undefined || data === null) {
    res.status(statusCode).json({
      success: true,
      message,
    });
  } else {
    res.status(statusCode).json(data);
  }
};

/**
 * Trả về response lỗi với status code, message và errors tuỳ chọn.
 * Đầu vào: res (object), statusCode (number), message (string), errors (object|null)
 * Đầu ra: response JSON
 */
const errorResponse = (res, statusCode, message, errors = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
};

/**
 * Trả về response thành công khi tạo mới resource (status 201).
 * Đầu vào: res (object), data (object), message (string)
 * Đầu ra: response JSON
 */
const createdResponse = (
  res,
  data,
  message = 'Resource created successfully'
) => {
  successResponse(res, httpStatus.CREATED, message, data);
};

/**
 * Trả về response thành công (status 200).
 * Đầu vào: res (object), data (object), message (string)
 * Đầu ra: response JSON
 */
const okResponse = (res, data, message = 'Request successful') => {
  successResponse(res, httpStatus.OK, message, data);
};

/**
 * Trả về response không có nội dung (status 204).
 * Đầu vào: res (object)
 * Đầu ra: response không có nội dung
 */
const noContentResponse = (res) => {
  res.status(httpStatus.NO_CONTENT).send();
};

export {
  successResponse,
  errorResponse,
  createdResponse,
  okResponse,
  noContentResponse,
};
