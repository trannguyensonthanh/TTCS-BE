// src/modules/yeuCauDoiPhong/yeuCauDoiPhong.route.js
import express from 'express';
import { yeuCauDoiPhongController } from './yeuCauDoiPhong.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { yeuCauDoiPhongValidation } from './yeuCauDoiPhong.validation.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

const router = express.Router();
router.use(authMiddleware.authenticateToken);

/**
 * Lấy danh sách yêu cầu đổi phòng (có phân trang, tìm kiếm).
 * @route GET /
 * @access Đăng nhập
 * @middleware validateGetYeuCauDoiPhongParams
 * @returns {Object} Danh sách yêu cầu đổi phòng
 */
router.get(
  '/',
  yeuCauDoiPhongValidation.validateGetYeuCauDoiPhongParams,
  asyncHandler(yeuCauDoiPhongController.getYeuCauDoiPhongsController)
);

/**
 * Lấy chi tiết một yêu cầu đổi phòng theo ID.
 * @route GET /:id
 * @access Đăng nhập
 * @middleware validateIdParam
 * @returns {Object} Chi tiết yêu cầu đổi phòng
 */
router.get(
  '/:id',
  yeuCauDoiPhongValidation.validateIdParam,
  asyncHandler(yeuCauDoiPhongController.getYeuCauDoiPhongDetailController)
);

/**
 * Tạo mới một yêu cầu đổi phòng.
 * @route POST /
 * @access CB_TO_CHUC_SU_KIEN, ADMIN_HE_THONG
 * @middleware validateCreateYeuCauDoiPhongPayload
 * @returns {Object} Yêu cầu đổi phòng vừa tạo
 */
router.post(
  '/',
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  yeuCauDoiPhongValidation.validateCreateYeuCauDoiPhongPayload,
  asyncHandler(yeuCauDoiPhongController.createYeuCauDoiPhongController)
);

/**
 * Xử lý yêu cầu đổi phòng (duyệt, từ chối).
 * @route PUT /:id/xu-ly
 * @access QUAN_LY_CSVC, ADMIN_HE_THONG
 * @middleware validateIdParam, validateXuLyYeuCauDoiPhongPayload
 * @returns {Object} Yêu cầu đổi phòng đã xử lý
 */
router.put(
  '/:id/xu-ly',
  authMiddleware.authorizeRoles(MaVaiTro.QUAN_LY_CSVC, MaVaiTro.ADMIN_HE_THONG),
  yeuCauDoiPhongValidation.validateIdParam,
  yeuCauDoiPhongValidation.validateXuLyYeuCauDoiPhongPayload,
  asyncHandler(yeuCauDoiPhongController.xuLyYeuCauDoiPhongController)
);

/**
 * Hủy yêu cầu đổi phòng bởi người dùng.
 * @route DELETE /:id
 * @access CB_TO_CHUC_SU_KIEN, ADMIN_HE_THONG
 * @middleware validateIdParam
 * @returns {void} Không trả về dữ liệu nếu hủy thành công
 */
router.delete(
  '/:id',
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  yeuCauDoiPhongValidation.validateIdParam,
  asyncHandler(yeuCauDoiPhongController.huyYeuCauDoiPhongByUserController)
);

export default router;
