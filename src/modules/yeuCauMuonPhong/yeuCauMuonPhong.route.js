// src/modules/yeuCauMuonPhong/yeuCauMuonPhong.route.js
import express from 'express';
import { yeuCauMuonPhongController } from './yeuCauMuonPhong.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { yeuCauMuonPhongValidation } from './yeuCauMuonPhong.validation.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
// import MaVaiTro from '../../enums/maVaiTro.enum.js'; // Sẽ cần cho các API POST, PUT

const router = express.Router();
router.use(authMiddleware.authenticateToken);

router.get(
  '/',
  yeuCauMuonPhongValidation.validateGetYeuCauMuonPhongParams,
  asyncHandler(yeuCauMuonPhongController.getYeuCauMuonPhongsController)
);

router.get(
  '/:id',
  yeuCauMuonPhongValidation.validateYcMuonPhongIDParam,
  asyncHandler(yeuCauMuonPhongController.getYeuCauMuonPhongDetailController)
);

router.post(
  '/',
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  yeuCauMuonPhongValidation.validateCreateYeuCauMuonPhongPayload,
  asyncHandler(yeuCauMuonPhongController.createYeuCauMuonPhongController)
);

router.put(
  '/:ycMuonPhongID/chitiet/:ycMuonPhongCtID/xu-ly',
  authMiddleware.authorizeRoles(MaVaiTro.QUAN_LY_CSVC, MaVaiTro.ADMIN_HE_THONG),
  yeuCauMuonPhongValidation.validateYcMuonPhongChiTietIDParams, // Validate cả 2 ID
  yeuCauMuonPhongValidation.validateXuLyYcChiTietPayload,
  asyncHandler(yeuCauMuonPhongController.xuLyChiTietYeuCauController)
);

router.put(
  '/:id/huy', // Endpoint: PUT /v1/yeucaumuonphong/{id}/huy
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ), // Chỉ người tạo YC hoặc Admin
  yeuCauMuonPhongValidation.validateYcMuonPhongIDParam, // Validate ID của YC Header
  asyncHandler(yeuCauMuonPhongController.huyYeuCauMuonPhongByUserController)
);

export default router;

// NguoiDuyetTongCSVCID khi hủy: Khi hủy yêu cầu header, NguoiDuyetTongCSVCID và NgayDuyetTongCSVC trong YeuCauMuonPhong cũng nên được set lại thành NULL nếu việc hủy xảy ra trước khi CSVC duyệt tổng thể. Hàm updateYeuCauMuonPhongHeaderStatus cần được điều chỉnh để hỗ trợ việc này khi trạng thái là hủy.
// // Trong yeuCauMuonPhongRepository.updateYeuCauMuonPhongHeaderStatus
// // ...
// // Nếu trangThaiChungIDMoi là trạng thái hủy, có thể set NguoiDuyetTongCSVCID và NgayDuyetTongCSVC về NULL
// let query = `
//     UPDATE YeuCauMuonPhong
//     SET TrangThaiChungID = @TrangThaiChungIDMoi,
//         NguoiDuyetTongCSVCID = CASE WHEN @IsHuyAction = 1 THEN NULL ELSE @NguoiDuyetTongCSVCID END,
//         NgayDuyetTongCSVC = CASE WHEN @IsHuyAction = 1 THEN NULL ELSE GETDATE() END
//     WHERE YcMuonPhongID = @YcMuonPhongID;
// `;
// // Và thêm param @IsHuyAction (BIT)
// Tuy nhiên, để đơn giản, script hiện tại chỉ cập nhật trạng thái. Nếu NguoiDuyetTongCSVCID chưa có giá trị (do CSVC chưa duyệt) thì nó vẫn là NULL.
