// src/modules/trangThaiPhong/trangThaiPhong.validation.js
import Joi from 'joi';
import validate from '../../utils/validation.utils.js';

/**
 * Schema kiểm tra tham số truy vấn khi lấy danh sách trạng thái phòng.
 * @property {number} [limit] - Số lượng trạng thái phòng tối đa trả về (tùy chọn, mặc định 20)
 */
const getTrangThaiPhongParamsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(20),
});

/**
 * Middleware kiểm tra query khi lấy danh sách trạng thái phòng.
 * @returns {function} Middleware validate query params.
 */
export const trangThaiPhongValidation = {
  validateGetTrangThaiPhongParams: validate(
    getTrangThaiPhongParamsSchema,
    'query'
  ),
};
