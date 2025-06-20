import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { moiThamGiaController } from './moiThamGia.controller.js';
import { moiThamGiaValidation } from './moiThamGia.validation.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

const router = express.Router();
router.use(authMiddleware.authenticateToken);

/**
 * [MỚI] Thu hồi/Xóa một lời mời đã gửi.
 * @route DELETE /api/v1/moi-tham-gia/{moiThamGiaID}
 * @access CONG_TAC_SINH_VIEN, ADMIN_HE_THONG
 */
router.delete(
  '/:moiThamGiaID',
  authMiddleware.authorizeRoles(
    MaVaiTro.CONG_TAC_SINH_VIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  moiThamGiaValidation.validateIdParam,
  asyncHandler(moiThamGiaController.thuHoiLoiMoiController)
);

export default router;
