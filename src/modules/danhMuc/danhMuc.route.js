// src/modules/danhMuc/danhMuc.route.js
import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

// Import controllers và validations cho từng loại danh mục
import { loaiPhongController } from './loaiPhong.controller.js';
import { loaiPhongValidation } from './loaiPhong.validation.js';
import { phongForSelectController } from './phongForSelect.controller.js';
import { phongForSelectValidation } from './phongForSelect.validation.js';
// Import thêm nếu có các danh mục khác (ví dụ: TrangThaiSK, LoaiSuKien, ...)

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các route danh mục
router.use(authMiddleware.authenticateToken);

// --- Routes cho Loại Phòng ---
router.get(
  '/loai-phong',
  // Không cần authorizeRoles cụ thể ở đây nếu tất cả người dùng đăng nhập đều có thể xem
  // Hoặc nếu cần, ví dụ: authMiddleware.authorizeRoles(MaVaiTro.CB_TO_CHUC_SU_KIEN, MaVaiTro.QUAN_LY_CSVC, MaVaiTro.ADMIN_HE_THONG),
  loaiPhongValidation.validateGetLoaiPhongsParams,
  asyncHandler(loaiPhongController.getLoaiPhongsController)
);

// --- Routes cho Phòng (để CSVC chọn) ---
router.get(
  '/phong/cho-chon',
  authMiddleware.authorizeRoles(MaVaiTro.QUAN_LY_CSVC, MaVaiTro.ADMIN_HE_THONG), // Chỉ CSVC và Admin
  phongForSelectValidation.validateGetPhongForSelectParams,
  asyncHandler(phongForSelectController.getPhongsForSelectController)
);

// --- Ví dụ thêm Routes cho các danh mục khác ---
// import { trangThaiSKController } from './trangThaiSK.controller.js'; // Giả sử có
// router.get('/trang-thai-su-kien', asyncHandler(trangThaiSKController.getTrangThaiSKsController));

export default router;
