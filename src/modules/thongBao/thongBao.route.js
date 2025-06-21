// src/modules/thongBao/thongBao.route.js
import express from 'express';
import { thongBaoController } from './thongBao.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { thongBaoValidation } from './thongBao.validation.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

const router = express.Router();

router.use(authMiddleware.authenticateToken); // Tất cả các API thông báo đều cần biết người dùng là ai

/**
 * GET /v1/thongbao/cua-toi
 * Lấy danh sách thông báo của người dùng hiện tại (có lọc, phân trang).
 * @returns {object[]} Danh sách thông báo
 */
router.get(
  '/cua-toi',
  thongBaoValidation.validateGetThongBaoCuaToiParams,
  asyncHandler(thongBaoController.getThongBaoCuaToiController)
);

/**
 * POST /v1/thongbao/:id/danh-dau-da-doc
 * Đánh dấu một thông báo là đã đọc cho người dùng hiện tại.
 * @param {string} id - ID thông báo (param)
 * @returns {object} Kết quả đánh dấu đã đọc
 */
router.post(
  '/:id/danh-dau-da-doc',
  thongBaoValidation.validateThongBaoIDParam,
  asyncHandler(thongBaoController.danhDauDaDocController)
);

/**
 * POST /v1/thongbao/danh-dau-tat-ca-da-doc
 * Đánh dấu tất cả thông báo là đã đọc cho người dùng hiện tại.
 * @returns {object} Kết quả đánh dấu đã đọc
 */
router.post(
  '/danh-dau-tat-ca-da-doc',
  asyncHandler(thongBaoController.danhDauTatCaDaDocController)
);

/**
 * POST /v1/thongbao/yeu-cau-chinh-sua
 * Tạo yêu cầu chỉnh sửa thông báo (chỉ cho các vai trò đặc biệt).
 * Yêu cầu xác thực và vai trò: BGH_DUYET_SK_TRUONG, QUAN_LY_CSVC, ADMIN_HE_THONG.
 * @body {object} Thông tin yêu cầu chỉnh sửa
 * @returns {object} Kết quả tạo yêu cầu
 */
router.post(
  '/yeu-cau-chinh-sua',
  authMiddleware.authorizeRoles(
    MaVaiTro.BGH_DUYET_SK_TRUONG,
    MaVaiTro.QUAN_LY_CSVC,
    MaVaiTro.ADMIN_HE_THONG
  ),
  thongBaoValidation.validateCreateYeuCauChinhSuaPayload,
  asyncHandler(thongBaoController.createYeuCauChinhSuaThongBaoController)
);

/**
 * GET /v1/thongbao/cua-toi/tat-ca
 * Lấy tất cả thông báo của người dùng hiện tại với các tùy chọn lọc/phân trang.
 * @returns {object[]} Danh sách thông báo
 */
router.get(
  '/cua-toi/tat-ca', // GET /v1/thongbao/cua-toi/tat-ca
  thongBaoValidation.validateGetAllMyNotificationsParams,
  asyncHandler(thongBaoController.getAllMyNotificationsController)
);

router.get(
  '/cong-khai-noi-bat',
  // Middleware xác thực token đã có ở đầu file
  thongBaoValidation.validateGetPublicAnnouncementsParams, // Sẽ tạo
  asyncHandler(thongBaoController.getPublicAnnouncementsController)
);

export default router;
