// src/modules/chiTietSuDungPhong/chiTietSuDungPhong.validation.js
import Joi from 'joi';
import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';
import validate from '../../utils/validation.utils.js';

const getMyActiveBookedRoomsParamsSchema = Joi.object({
  nguoiYeuCauID: Joi.number().integer().positive().optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

/**
 * Middleware validate query params cho API lấy danh sách phòng đã đặt có thể đổi.
 * @param {import('express').Request} req - Request object
 * @param {import('express').Response} res - Response object
 * @param {Function} next - Next middleware function
 * @returns {void} Trả về lỗi 400 nếu dữ liệu không hợp lệ, gọi next() nếu hợp lệ
 */
export const chiTietSuDungPhongValidation = {
  validateGetMyActiveBookedRoomsParams: validate(
    getMyActiveBookedRoomsParamsSchema,
    'query'
  ),
};
