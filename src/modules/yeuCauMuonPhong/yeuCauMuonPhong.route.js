// src/modules/yeuCauMuonPhong/yeuCauMuonPhong.route.js
import express from 'express';
import { yeuCauMuonPhongController } from './yeuCauMuonPhong.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { yeuCauMuonPhongValidation } from './yeuCauMuonPhong.validation.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

const router = express.Router();
router.use(authMiddleware.authenticateToken);

/**
 * Lấy danh sách yêu cầu mượn phòng
 * Đầu vào: query params (searchTerm, trangThaiChungMa, suKienID, nguoiYeuCauID, donViYeuCauID, tuNgayYeuCau, denNgayYeuCau, page, limit, sortBy, sortOrder)
 * Đầu ra: Danh sách yêu cầu mượn phòng
 */
router.get(
  '/',
  yeuCauMuonPhongValidation.validateGetYeuCauMuonPhongParams,
  asyncHandler(yeuCauMuonPhongController.getYeuCauMuonPhongsController)
);

/**
 * Lấy chi tiết một yêu cầu mượn phòng
 * Đầu vào: params.id (ID yêu cầu)
 * Đầu ra: Chi tiết yêu cầu mượn phòng
 */
router.get(
  '/:id',
  yeuCauMuonPhongValidation.validateYcMuonPhongIDParam,
  asyncHandler(yeuCauMuonPhongController.getYeuCauMuonPhongDetailController)
);

/**
 * Tạo mới yêu cầu mượn phòng
 * Đầu vào: body (payload tạo yêu cầu), user phải có vai trò phù hợp
 * Đầu ra: Thông tin yêu cầu mượn phòng vừa tạo
 */
router.post(
  '/',
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  yeuCauMuonPhongValidation.validateCreateYeuCauMuonPhongPayload,
  asyncHandler(yeuCauMuonPhongController.createYeuCauMuonPhongController)
);

/**
 * Xử lý chi tiết yêu cầu mượn phòng
 * Đầu vào: params (ycMuonPhongID, ycMuonPhongCtID), body (payload xử lý), user phải có vai trò phù hợp
 * Đầu ra: Kết quả xử lý chi tiết yêu cầu
 */
router.put(
  '/:ycMuonPhongID/chitiet/:ycMuonPhongCtID/xu-ly',
  authMiddleware.authorizeRoles(MaVaiTro.QUAN_LY_CSVC, MaVaiTro.ADMIN_HE_THONG),
  yeuCauMuonPhongValidation.validateYcMuonPhongChiTietIDParams,
  yeuCauMuonPhongValidation.validateXuLyYcChiTietPayload,
  asyncHandler(yeuCauMuonPhongController.xuLyChiTietYeuCauController)
);

/**
 * Hủy yêu cầu mượn phòng bởi người dùng
 * Đầu vào: params.id (ID yêu cầu), user phải có vai trò phù hợp
 * Đầu ra: Kết quả hủy yêu cầu
 */
router.put(
  '/:id/huy',
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  yeuCauMuonPhongValidation.validateYcMuonPhongIDParam,
  asyncHandler(yeuCauMuonPhongController.huyYeuCauMuonPhongByUserController)
);

/**
 * Cập nhật yêu cầu mượn phòng bởi người dùng
 * Đầu vào: params.id (ID yêu cầu), body (payload cập nhật), user phải có vai trò phù hợp
 * Đầu ra: Kết quả cập nhật yêu cầu
 */
router.put(
  '/chitiet/:id/cap-nhat-boi-nguoi-dung',
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  yeuCauMuonPhongValidation.validateYcMuonPhongIDParam,
  yeuCauMuonPhongValidation.validateUpdateYeuCauMuonPhongPayload,
  asyncHandler(yeuCauMuonPhongController.updateYeuCauMuonPhongByUserController)
);

export default router;
