// src/modules/yeuCauHuySK/yeuCauHuySK.route.js
import express from 'express';
import { yeuCauHuySKController } from './yeuCauHuySK.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { yeuCauHuySKValidation } from './yeuCauHuySK.validation.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

const router = express.Router();

// Tất cả các route dưới đây đều yêu cầu xác thực token
router.use(authMiddleware.authenticateToken);

/**
 * Lấy danh sách yêu cầu hủy sự kiện
 * Đầu vào: query params (searchTerm, trangThaiYcHuySkMa, suKienID, nguoiYeuCauID, page, limit, sortBy, sortOrder)
 * Đầu ra: Danh sách yêu cầu hủy sự kiện
 */
router.get(
  '/',
  yeuCauHuySKValidation.validateGetYeuCauHuySKParams,
  asyncHandler(yeuCauHuySKController.getYeuCauHuySKsController)
);

/**
 * Lấy chi tiết một yêu cầu hủy sự kiện
 * Đầu vào: params.id (ID yêu cầu), query param includeSuKienDetail (tùy chọn)
 * Đầu ra: Chi tiết yêu cầu hủy sự kiện
 */
router.get(
  '/:id',
  yeuCauHuySKValidation.validateIdParam,
  asyncHandler(yeuCauHuySKController.getYeuCauHuySKDetailController)
);

/**
 * Tạo mới yêu cầu hủy sự kiện
 * Đầu vào: body (suKienID, lyDoHuy), user phải có vai trò phù hợp
 * Đầu ra: Thông tin sự kiện đã cập nhật
 */
router.post(
  '/',
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  yeuCauHuySKValidation.validateCreateYeuCauHuySK,
  asyncHandler(yeuCauHuySKController.createYeuCauHuySKController)
);

/**
 * Duyệt yêu cầu hủy sự kiện
 * Đầu vào: params.id (ID yêu cầu), body (ghiChuBGH - optional), user phải có vai trò phù hợp
 * Đầu ra: Kết quả duyệt yêu cầu
 */
router.post(
  '/:id/duyet',
  authMiddleware.authorizeRoles(
    MaVaiTro.BGH_DUYET_SK_TRUONG,
    MaVaiTro.ADMIN_HE_THONG
  ),
  yeuCauHuySKValidation.validateIdParam,
  yeuCauHuySKValidation.validateDuyetYcHuyPayload,
  asyncHandler(yeuCauHuySKController.duyetYeuCauHuySKController)
);

/**
 * Từ chối yêu cầu hủy sự kiện
 * Đầu vào: params.id (ID yêu cầu), body (lyDoTuChoiHuyBGH), user phải có vai trò phù hợp
 * Đầu ra: Kết quả từ chối yêu cầu
 */
router.post(
  '/:id/tuchoi',
  authMiddleware.authorizeRoles(
    MaVaiTro.BGH_DUYET_SK_TRUONG,
    MaVaiTro.ADMIN_HE_THONG
  ),
  yeuCauHuySKValidation.validateIdParam,
  yeuCauHuySKValidation.validateTuChoiYcHuyPayload,
  asyncHandler(yeuCauHuySKController.tuChoiYeuCauHuySKController)
);

export default router;
