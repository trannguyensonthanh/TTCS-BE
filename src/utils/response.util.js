import httpStatus from '../constants/httpStatus.js';

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

const errorResponse = (res, statusCode, message, errors = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
};

const createdResponse = (
  res,
  data,
  message = 'Resource created successfully'
) => {
  successResponse(res, httpStatus.CREATED, message, data);
};

const okResponse = (res, data, message = 'Request successful') => {
  successResponse(res, httpStatus.OK, message, data);
};

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
