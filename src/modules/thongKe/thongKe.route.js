// File: src/modules/thongKe/thongKe.route.js
// Cấu trúc: Định nghĩa các route thống kê, áp dụng middleware xác thực và phân quyền

import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { thongKeController } from './thongKe.controller.js';
import { thongKeValidation } from './thongKe.validation.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';

const router = express.Router();

// Áp dụng middleware xác thực token cho tất cả các route
router.use(authMiddleware.authenticateToken);

// Áp dụng middleware phân quyền cho Admin hoặc BGH cho các route phía dưới
router.use(
  authMiddleware.authorizeRoles(
    MaVaiTro.ADMIN_HE_THONG,
    MaVaiTro.BGH_DUYET_SK_TRUONG
  )
);

// Thống kê sự kiện theo thời gian
router.get(
  '/su-kien/theo-thoi-gian',
  thongKeValidation.validateThongKeThoiGianParams,
  asyncHandler(thongKeController.getThongKeSuKienTheoThoiGianController)
);

// Thống kê tổng quan KPI sự kiện
router.get(
  '/su-kien/tong-quan-kpi',
  thongKeValidation.validateThongKeParams,
  asyncHandler(thongKeController.getSuKienKpiController)
);

// Thống kê sự kiện theo loại
router.get(
  '/su-kien/theo-loai',
  thongKeValidation.validateThongKeParams,
  asyncHandler(thongKeController.getThongKeSuKienTheoLoaiController)
);

// Thống kê yêu cầu chờ xử lý của tôi (phân quyền riêng)
router.get(
  '/yeu-cau-cho-xu-ly/cua-toi',
  authMiddleware.authorizeRoles(
    MaVaiTro.ADMIN_HE_THONG,
    MaVaiTro.BGH_DUYET_SK_TRUONG,
    MaVaiTro.QUAN_LY_CSVC
  ),
  asyncHandler(thongKeController.getYeuCauChoXuLyController)
);

// Thống kê đánh giá sự kiện
router.get(
  '/danh-gia-su-kien',
  thongKeValidation.validateThongKeDanhGiaParams,
  asyncHandler(thongKeController.getThongKeDanhGiaSuKienController)
);

// Thống kê tổng quan KPI cơ sở vật chất (phân quyền riêng)
router.get(
  '/co-so-vat-chat/tong-quan-kpi',
  authMiddleware.authorizeRoles(
    MaVaiTro.ADMIN_HE_THONG,
    MaVaiTro.BGH_DUYET_SK_TRUONG,
    MaVaiTro.QUAN_LY_CSVC
  ),
  thongKeValidation.validateGetCsVcKpiParams,
  asyncHandler(thongKeController.getCsVcKpiController)
);

// Thống kê sử dụng phòng theo thời gian
router.get(
  '/co-so-vat-chat/su-dung-phong-theo-thoi-gian',
  thongKeValidation.validateSuDungPhongTheoThoiGianParams,
  asyncHandler(thongKeController.getSuDungPhongTheoThoiGianController)
);

// Thống kê loại phòng phổ biến
router.get(
  '/co-so-vat-chat/loai-phong-pho-bien',
  thongKeValidation.validateLoaiPhongPhoBienParams,
  asyncHandler(thongKeController.getLoaiPhongPhoBienController)
);

// Thống kê thiết bị (phân quyền riêng)
router.get(
  '/co-so-vat-chat/thiet-bi',
  authMiddleware.authorizeRoles(
    MaVaiTro.ADMIN_HE_THONG,
    MaVaiTro.BGH_DUYET_SK_TRUONG,
    MaVaiTro.QUAN_LY_CSVC
  ),
  thongKeValidation.validateThongKeThietBiParams,
  asyncHandler(thongKeController.getThongKeThietBiController)
);

export default router;
