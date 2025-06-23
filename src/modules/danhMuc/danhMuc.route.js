// src/modules/danhMuc/danhMuc.route.js
import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import toaNhaRoutes from '../toaNha/toaNha.route.js';
import loaiTangRoutes from '../loaiTang/loaiTang.route.js';
import { loaiPhongController } from './loaiPhong.controller.js';
import { loaiPhongValidation } from './loaiPhong.validation.js';
import { phongForSelectController } from './phongForSelect.controller.js';
import { phongForSelectValidation } from './phongForSelect.validation.js';
import toaNhaTangListRoutes from '../toaNhaTang/toaNhaTang.route.js';
import tangVatLyOpsRoutes from '../tangVatLy/tangVatLy.route.js';
import phongCRUDRoutes from '../phongCRUD/phongCRUD.route.js';
import { trangThaiPhongController } from '../trangThaiPhong/trangThaiPhong.controller.js';
import { trangThaiPhongValidation } from '../trangThaiPhong/trangThaiPhong.validation.js';
import { toaNhaTangValidation } from '../toaNhaTang/toaNhaTang.validation.js';
import { toaNhaTangController } from '../toaNhaTang/toaNhaTang.controller.js';
import { trangThietBiValidation } from '../trangThietBi/trangThietBi.validation.js';
import { trangThietBiController } from '../trangThietBi/trangThietBi.controller.js';
import trangThietBiRoutes from '../trangThietBi/trangThietBi.route.js';
import lopHocRoutes from '../lopHoc/lopHoc.route.js';
import nganhHocRoutes from '../nganhHoc/nganhHoc.route.js';
import { directChuyenNganhRouter } from '../chuyenNganh/chuyenNganh.route.js';
import { donViController } from '../donVi/donVi.controller.js';

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các route danh mục
router.use(authMiddleware.authenticateToken);

/**
 * Lấy danh sách loại phòng
 * @route GET /danh-muc/loai-phong
 * @header {string} Authorization - Bearer access token (CB_TO_CHUC_SU_KIEN, QUAN_LY_CSVC, ADMIN_HE_THONG)
 * @query {object} Các tham số lọc loại phòng
 * @returns {Array<object>} Danh sách loại phòng
 */
router.get(
  '/loai-phong',
  // authMiddleware.authorizeRoles(
  //   MaVaiTro.CB_TO_CHUC_SU_KIEN,
  //   MaVaiTro.QUAN_LY_CSVC,
  //   MaVaiTro.ADMIN_HE_THONG
  // ),
  loaiPhongValidation.validateGetLoaiPhongsParams,
  asyncHandler(loaiPhongController.getLoaiPhongsController)
);

/**
 * Lấy danh sách loại đơn vị.
 * @route GET /danh-muc/loai-don-vi
 * @returns {Array<object>} Danh sách loại đơn vị
 */
router.get(
  '/loai-don-vi',
  asyncHandler(donViController.getLoaiDonViOptionsController)
);

/**
 * Lấy danh sách phòng cho select (CSVC, Admin).
 * @route GET /danh-muc/phong/cho-chon
 * @header {string} Authorization - Bearer access token (QUAN_LY_CSVC, ADMIN_HE_THONG)
 * @query {object} Các tham số lọc phòng
 * @returns {Array<object>} Danh sách phòng cho select
 */
router.get(
  '/phong/cho-chon',
  // authMiddleware.authorizeRoles(MaVaiTro.QUAN_LY_CSVC, MaVaiTro.ADMIN_HE_THONG),
  phongForSelectValidation.validateGetPhongForSelectParams,
  asyncHandler(phongForSelectController.getPhongsForSelectController)
);

/**
 * Lấy danh sách trạng thái phòng.
 * @route GET /danh-muc/trang-thai-phong
 * @returns {Array<object>} Danh sách trạng thái phòng
 */
router.get(
  '/trang-thai-phong',
  trangThaiPhongValidation.validateGetTrangThaiPhongParams,
  asyncHandler(trangThaiPhongController.getTrangThaiPhongListController)
);

/**
 * Lấy danh sách tòa nhà-tầng cho select.
 * @route GET /danh-muc/toa-nha-tang/cho-chon
 * @header {string} Authorization - Bearer access token
 * @query {object} Các tham số lọc tòa nhà-tầng
 * @returns {Array<object>} Danh sách tòa nhà-tầng cho select
 */
router.get(
  '/toa-nha-tang/cho-chon',
  authMiddleware.authenticateToken,
  toaNhaTangValidation.validateGetToaNhaTangForSelectParams,
  asyncHandler(toaNhaTangController.getToaNhaTangListForSelectController)
);

/**
 * Lấy danh sách trang thiết bị cho select.
 * @route GET /danh-muc/trang-thiet-bi/cho-chon
 * @header {string} Authorization - Bearer access token
 * @query {object} Các tham số lọc trang thiết bị
 * @returns {Array<object>} Danh sách trang thiết bị cho select
 */
router.get(
  '/trang-thiet-bi/cho-chon',
  authMiddleware.authenticateToken,
  trangThietBiValidation.validateGetTrangThietBiForSelectParams,
  asyncHandler(trangThietBiController.getTrangThietBiListForSelectController)
);

// Mount các router con cho các danh mục khác
router.use('/toa-nha', toaNhaRoutes);
router.use('/loai-tang', loaiTangRoutes);
router.use('/toa-nha/:toaNhaId/tang', toaNhaTangListRoutes);
router.use('/tang', tangVatLyOpsRoutes);
router.use('/phong', phongCRUDRoutes);
router.use('/trang-thiet-bi', trangThietBiRoutes);
router.use('/lop-hoc', lopHocRoutes);
router.use('/nganh-hoc', nganhHocRoutes);
router.use('/chuyen-nganh', directChuyenNganhRouter);

export default router;
