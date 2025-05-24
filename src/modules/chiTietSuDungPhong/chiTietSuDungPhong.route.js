// src/modules/chiTietSuDungPhong/chiTietSuDungPhong.route.js
import express from 'express';
import { chiTietSuDungPhongController } from './chiTietSuDungPhong.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { chiTietSuDungPhongValidation } from './chiTietSuDungPhong.validation.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

const router = express.Router();

router.use(authMiddleware.authenticateToken);

router.get(
  '/co-the-doi', // Endpoint: /v1/chitietsudungphong/co-the-doi
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ), // Ai được xem danh sách này
  chiTietSuDungPhongValidation.validateGetMyActiveBookedRoomsParams,
  asyncHandler(chiTietSuDungPhongController.getMyActiveBookedRoomsController)
);

export default router;
