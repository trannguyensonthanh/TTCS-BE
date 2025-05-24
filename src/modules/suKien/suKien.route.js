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

router.get(
  '/',
  // suKienValidation.validateGetSuKienParams, // Middleware validation cho query params
  asyncHandler(suKienController.getSuKienListController)
);

router.get(
  '/:suKienID',
  // suKienValidation.validateSuKienIDParam, // Middleware validation cho suKienID
  asyncHandler(suKienController.getSuKienDetailController)
);

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

router.post(
  '/', // POST /v1/sukien
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG /*, các vai trò khác được tạo SK */
  ),
  suKienValidation.validateCreateSuKien,
  asyncHandler(suKienController.createSuKienController)
);

router.put(
  '/:suKienID', // PUT /v1/sukien/:suKienID
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  suKienValidation.validateSuKienIDParam,
  suKienValidation.validateUpdateSuKien,
  asyncHandler(suKienController.updateSuKienController)
);

// API BGH Duyệt Sự Kiện
router.post(
  '/:id/duyet-bgh', // Sử dụng :id cho nhất quán với FE và các route khác
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(
    MaVaiTro.BGH_DUYET_SK_TRUONG,
    MaVaiTro.ADMIN_HE_THONG
  ),
  suKienValidation.validateIDParam, // Cần tạo/dùng lại middleware validateIDParam cho req.params.id
  suKienValidation.validateDuyetSuKienBGHPayload,
  asyncHandler(suKienController.duyetSuKienByBGHController)
);

// API BGH Từ Chối Sự Kiện
router.post(
  '/:id/tuchoi-bgh', // Sử dụng :id
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(
    MaVaiTro.BGH_DUYET_SK_TRUONG,
    MaVaiTro.ADMIN_HE_THONG
  ),
  suKienValidation.validateIDParam, // Cần tạo/dùng lại middleware validateIDParam
  suKienValidation.validateTuChoiSuKienBGHPayload,
  asyncHandler(suKienController.tuChoiSuKienByBGHController)
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

export default router;
