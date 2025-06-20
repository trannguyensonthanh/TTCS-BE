// src/modules/phongCRUD/phongCRUD.route.js
import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import { phongCRUDController } from './phongCRUD.controller.js'; // Đổi tên import
import { phongCRUDValidation } from './phongCRUD.validation.js'; // Đổi tên import
import uploadExcel from '../../middlewares/upload.middleware.js';

const router = express.Router();

router.use(authMiddleware.authenticateToken);

/**
 * GET /v1/danhmuc/phong
 * Lấy danh sách phòng với phân trang, lọc và phân quyền truy cập.
 * Yêu cầu xác thực và vai trò: ADMIN_HE_THONG, QUAN_LY_CSVC, CB_TO_CHUC_SU_KIEN.
 * Query params được validate bởi validateGetPhongParams.
 * @returns {object[]} Danh sách phòng phù hợp với bộ lọc.
 */
router.get(
  '/',
  phongCRUDValidation.validateGetPhongParams,
  asyncHandler(phongCRUDController.getPhongListController)
);

/**
 * GET /v1/danhmuc/phong/generate-ma-phong
 * Sinh mã phòng mới dựa trên các quy tắc nghiệp vụ.
 * Yêu cầu xác thực và vai trò: QUAN_LY_CSVC, ADMIN_HE_THONG.
 * Query params được validate bởi validateGenerateMaPhongParams.
 * @returns {string} Mã phòng mới được sinh ra.
 */
router.get(
  '/generate-ma-phong',
  authMiddleware.authorizeRoles(MaVaiTro.QUAN_LY_CSVC, MaVaiTro.ADMIN_HE_THONG),
  phongCRUDValidation.validateGenerateMaPhongParams,
  asyncHandler(phongCRUDController.generateMaPhongController)
);

/**
 * GET /v1/danhmuc/phong/:id
 * Lấy chi tiết một phòng theo ID.
 * Yêu cầu xác thực và vai trò: ADMIN_HE_THONG, QUAN_LY_CSVC, CB_TO_CHUC_SU_KIEN.
 * @param {string} id - ID phòng (param)
 * @returns {object} Thông tin chi tiết phòng.
 */
router.get(
  '/:id',
  phongCRUDValidation.validateIdParam,
  asyncHandler(phongCRUDController.getPhongDetailController)
);

/**
 * POST /v1/danhmuc/phong
 * Tạo mới một phòng.
 * Yêu cầu xác thực và vai trò: QUAN_LY_CSVC, ADMIN_HE_THONG.
 * Body được validate bởi validateCreatePhongPayload.
 * @body {object} Thông tin phòng cần tạo.
 * @returns {object} Phòng vừa được tạo.
 */
router.post(
  '/',
  authMiddleware.authorizeRoles(MaVaiTro.QUAN_LY_CSVC, MaVaiTro.ADMIN_HE_THONG),
  phongCRUDValidation.validateCreatePhongPayload,
  asyncHandler(phongCRUDController.createPhongController)
);

/**
 * PUT /v1/danhmuc/phong/:id
 * Cập nhật thông tin một phòng theo ID.
 * Yêu cầu xác thực và vai trò: QUAN_LY_CSVC, ADMIN_HE_THONG.
 * @param {string} id - ID phòng (param)
 * Body được validate bởi validateUpdatePhongPayload.
 * @body {object} Thông tin cập nhật phòng.
 * @returns {object} Phòng đã được cập nhật.
 */
router.put(
  '/:id',
  authMiddleware.authorizeRoles(MaVaiTro.QUAN_LY_CSVC, MaVaiTro.ADMIN_HE_THONG),
  phongCRUDValidation.validateIdParam,
  phongCRUDValidation.validateUpdatePhongPayload,
  asyncHandler(phongCRUDController.updatePhongController)
);

/**
 * DELETE /v1/danhmuc/phong/:id
 * Xóa một phòng theo ID.
 * Yêu cầu xác thực và vai trò: ADMIN_HE_THONG, QUAN_LY_CSVC.
 * @param {string} id - ID phòng (param)
 * @returns {object} Kết quả xóa phòng.
 */
router.delete(
  '/:id',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG, MaVaiTro.QUAN_LY_CSVC),
  phongCRUDValidation.validateIdParam,
  asyncHandler(phongCRUDController.deletePhongController)
);

router.post(
  '/import-excel', // POST /v1/danhmuc/phong/import-excel
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG, MaVaiTro.QUAN_LY_CSVC),
  uploadExcel.single('file'), // Middleware của Multer để xử lý field 'file'
  asyncHandler(phongCRUDController.importPhongFromExcelController)
);

export default router;
