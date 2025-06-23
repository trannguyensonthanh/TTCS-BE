// src/modules/suKien/suKien.route.js
import express from 'express';
import { suKienController } from './suKien.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { suKienValidation } from './suKien.validation.js'; // Sẽ tạo sau
import MaVaiTro from '../../enums/maVaiTro.enum.js';

const router = express.Router();
// --- PUBLIC ROUTES ---
// API này có thể không cần authenticateToken hoặc authenticateToken là optional
// Nếu không cần biết ai đang xem:

router.get(
  '/public',
  suKienValidation.validateGetSuKienParams, // Vẫn nên validate query params
  asyncHandler(suKienController.getPublicSuKienListController)
);
router.get(
  '/public/:id', // Đổi thành :id để khớp với FE
  suKienValidation.validatePublicSuKienIDParam, // Sử dụng lại validation cho ID (đổi tên param từ suKienID thành id nếu cần trong schema)
  asyncHandler(suKienController.getPublicSuKienDetailController)
);

// Tất cả các route trong module này đều yêu cầu xác thực
router.use(authMiddleware.authenticateToken);

/**
 * [MỚI] Lấy danh sách sự kiện đủ điều kiện để gửi lời mời.
 * @route GET /api/v1/su-kien/co-the-moi
 * @access CONG_TAC_SINH_VIEN
 */
router.get(
  '/co-the-moi',
  authMiddleware.authorizeRoles(
    MaVaiTro.CONG_TAC_SINH_VIEN,
    MaVaiTro.ADMIN_HE_THONG
  ), // Cho phép cả Admin
  suKienValidation.validateGetSuKienCoTheMoiParams,
  asyncHandler(suKienController.getSuKienCoTheMoiController)
);

router.get(
  '/sap-dien-ra-dashboard',
  // suKienValidation.validateGetSapDienRaDashboardParams, // Sẽ tạo validation
  asyncHandler(suKienController.getSuKienSapDienRaDashboardController)
);

/**
 * [MỚI] Gửi lời mời hàng loạt theo tiêu chí hoặc danh sách.
 * @route POST /api/v1/su-kien/{suKienID}/gui-loi-moi-hang-loat
 * @access CONG_TAC_SINH_VIEN, ADMIN_HE_THONG
 */
router.post(
  '/:suKienID/gui-loi-moi-hang-loat',
  authMiddleware.authorizeRoles(
    MaVaiTro.CONG_TAC_SINH_VIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  suKienValidation.validateSuKienIDParam,
  suKienValidation.validateGuiLoiMoiHangLoatPayload,
  asyncHandler(suKienController.guiLoiMoiHangLoatController)
);

/**
 * [MỚI] Lấy danh sách các sự kiện đã có lời mời được gửi đi.
 * @route GET /api/v1/su-kien/da-gui-loi-moi
 * @access CTSV, CBTCISK, Admin, BGH
 */
router.get(
  '/da-gui-loi-moi',
  authMiddleware.authorizeRoles(
    MaVaiTro.CONG_TAC_SINH_VIEN,
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG,
    MaVaiTro.BGH_DUYET_SK_TRUONG
  ),
  suKienValidation.validateGetEventsWithInvitationsParams, // Sẽ tạo
  asyncHandler(suKienController.getEventsWithInvitationsController)
);

router.get(
  '/',
  // suKienValidation.validateGetSuKienParams, // Middleware validation cho query params
  asyncHandler(suKienController.getSuKienListController)
);

router.get(
  '/cho-chon-yc-phong', // GET /v1/sukien/cho-chon-yc-phong

  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  suKienValidation.validateGetSuKienForSelectParams,
  asyncHandler(suKienController.getSuKiensForYeuCauPhongSelectController)
);

router.get(
  '/:suKienID', // GET /v1/sukien/:suKienID
  // suKienValidation.validateSuKienIDParam, // Middleware validation cho suKienID
  asyncHandler(suKienController.getSuKienDetailController)
);

/**
 * PUT /v1/sukien/:suKienID
 * Cập nhật thông tin một sự kiện theo ID.
 * Yêu cầu xác thực và vai trò: CB_TO_CHUC_SU_KIEN, ADMIN_HE_THONG.
 * @param {string} suKienID - ID sự kiện (param)
 * @body {object} Thông tin cập nhật sự kiện
 * @returns {object} Sự kiện đã được cập nhật
 */
router.put(
  '/:suKienID/trangthai',
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ), // Chỉ người tạo SK hoặc admin có thể tự hủy/cập nhật trạng thái kiểu này
  suKienValidation.validateUpdateTrangThaiPayload,
  suKienValidation.validateSuKienIDParam,
  asyncHandler(suKienController.updateSuKienTrangThaiController)
);

/**
 * POST /v1/sukien
 * Tạo mới một sự kiện.
 * Yêu cầu vai trò: CB_TO_CHUC_SU_KIEN, ADMIN_HE_THONG.
 * @body {object} Thông tin sự kiện
 * @returns {object} Sự kiện vừa được tạo
 */
router.post(
  '/', // POST /v1/sukien
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG /* , các vai trò khác được tạo SK */
  ),
  (req, res, next) => {
    console.log('Creating new suKien:', req.body);
    next();
  },
  suKienValidation.validateCreateSuKien,
  asyncHandler(suKienController.createSuKienController)
);

/**
 * PUT /v1/sukien/:suKienID
 * Cập nhật thông tin một sự kiện theo ID.
 * Yêu cầu xác thực và vai trò: CB_TO_CHUC_SU_KIEN, ADMIN_HE_THONG.
 * @param {string} suKienID - ID sự kiện (param)
 * @body {object} Thông tin cập nhật sự kiện
 * @returns {object} Sự kiện đã được cập nhật
 */
router.put(
  '/:suKienID',
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  suKienValidation.validateSuKienIDParam,
  suKienValidation.validateUpdateSuKien,
  asyncHandler(suKienController.updateSuKienController)
);

/**
 * POST /v1/sukien/:id/duyet-bgh
 * Duyệt sự kiện bởi BGH.
 * Yêu cầu xác thực và vai trò: BGH_DUYET_SK_TRUONG, ADMIN_HE_THONG.
 * @param {string} id - ID sự kiện (param)
 * @body {object} Ghi chú BGH (nếu có)
 * @returns {object} Sự kiện đã được duyệt
 */
router.post(
  '/:id/duyet-bgh',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(
    MaVaiTro.BGH_DUYET_SK_TRUONG,
    MaVaiTro.ADMIN_HE_THONG
  ),
  suKienValidation.validateIDParam,
  suKienValidation.validateDuyetSuKienBGHPayload,
  asyncHandler(suKienController.duyetSuKienByBGHController)
);

/**
 * POST /v1/sukien/:id/tuchoi-bgh
 * Từ chối sự kiện bởi BGH.
 * Yêu cầu xác thực và vai trò: BGH_DUYET_SK_TRUONG, ADMIN_HE_THONG.
 * @param {string} id - ID sự kiện (param)
 * @body {object} Lý do từ chối
 * @returns {object} Sự kiện đã bị từ chối
 */
router.post(
  '/:id/tuchoi-bgh',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(
    MaVaiTro.BGH_DUYET_SK_TRUONG,
    MaVaiTro.ADMIN_HE_THONG
  ),
  suKienValidation.validateIDParam,
  suKienValidation.validateTuChoiSuKienBGHPayload,
  asyncHandler(suKienController.tuChoiSuKienByBGHController)
);

/**
 * [MỚI] Gửi lời mời tham gia sự kiện.
 * @route POST /api/v1/sukien/{suKienID}/moi-tham-gia
 * @access CONG_TAC_SINH_VIEN
 */
router.post(
  '/:suKienID/moi-tham-gia/ca-nhan',
  authMiddleware.authorizeRoles(
    MaVaiTro.CONG_TAC_SINH_VIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  suKienValidation.validateSuKienIDParam,
  suKienValidation.validateGuiLoiMoiPayload,
  asyncHandler(suKienController.guiLoiMoiThamGiaController)
);

/**
 * [MỚI] Lấy danh sách người đã được mời cho một sự kiện.
 * @route GET /api/v1/su-kien/{suKienID}/danh-sach-moi
 * @access CONG_TAC_SINH_VIEN, ADMIN_HE_THONG
 */
router.get(
  '/:suKienID/danh-sach-moi',
  authMiddleware.authorizeRoles(
    MaVaiTro.CONG_TAC_SINH_VIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  suKienValidation.validateSuKienIDParam, // Dùng lại validation ID sự kiện
  suKienValidation.validateGetDanhSachMoiParams, // Sẽ tạo validation này
  asyncHandler(suKienController.getDanhSachMoiController)
);

/**
 * [MỚI] Lấy danh sách sự kiện người dùng đã tham gia.
 * @route GET /api/v1/su-kien/da-tham-gia/cua-toi
 * @access Đăng nhập
 */
router.get(
  '/da-tham-gia/cua-toi',
  // Middleware xác thực đã được áp dụng cho cả router
  suKienValidation.validateGetMyAttendedEventsParams, // Sẽ tạo schema này
  asyncHandler(suKienController.getMyAttendedEventsController)
);

export default router;
