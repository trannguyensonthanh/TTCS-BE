// src/modules/chuyenNganh/chuyenNganh.route.js
import express from 'express';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { chuyenNganhController } from './chuyenNganh.controller.js';
import { chuyenNganhValidation } from './chuyenNganh.validation.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
const router = express.Router({ mergeParams: true });

/**
 * Lấy danh sách chuyên ngành để chọn theo ngành học
 */
router.get(
  '/select-options',
  authMiddleware.authenticateToken,
  chuyenNganhValidation.validateGetChuyenNganhForSelectParams,
  asyncHandler(
    chuyenNganhController.getChuyenNganhListForSelectByNganhController
  )
);

/**
 * Lấy danh sách chuyên ngành có phân trang (thuộc một ngành)
 */
router.get(
  '/',
  authMiddleware.authenticateToken,
  chuyenNganhValidation.validateGetChuyenNganhForSelectParams,
  asyncHandler(chuyenNganhController.getChuyenNganhListByNganhController)
);

/**
 * Tạo chuyên ngành mới cho một ngành
 */
router.post(
  '/',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  chuyenNganhValidation.validateCreateChuyenNganhPayload,
  asyncHandler(chuyenNganhController.createChuyenNganhForNganhController)
);

// === Các API CRUD trực tiếp cho ChuyenNganh (mount với prefix /chuyen-nganh) ===
const directChuyenNganhRouter = express.Router();
directChuyenNganhRouter.use(authMiddleware.authenticateToken);

/**
 * Lấy chi tiết chuyên ngành theo ID
 */
directChuyenNganhRouter.get(
  '/:id',
  chuyenNganhValidation.validateIdParam,
  asyncHandler(chuyenNganhController.getChuyenNganhDetailController)
);

/**
 * Cập nhật chuyên ngành theo ID.
 * @route PUT /chuyen-nganh/:id
 * @header {string} Authorization - Bearer access token (ADMIN_HE_THONG)
 * @param {string} id - ID chuyên ngành (URL param)
 * @body {object} body - Dữ liệu cập nhật chuyên ngành
 * @returns {object} Chuyên ngành đã cập nhật
 */
directChuyenNganhRouter.put(
  '/:id',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  chuyenNganhValidation.validateIdParam,
  chuyenNganhValidation.validateUpdateChuyenNganhPayload,
  asyncHandler(chuyenNganhController.updateChuyenNganhController)
);

/**
 * Xóa chuyên ngành theo ID.
 * @route DELETE /chuyen-nganh/:id
 * @header {string} Authorization - Bearer access token (ADMIN_HE_THONG)
 * @param {string} id - ID chuyên ngành (URL param)
 * @returns {void} Trả về 204 No Content nếu xóa thành công
 */
directChuyenNganhRouter.delete(
  '/:id',
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  chuyenNganhValidation.validateIdParam,
  asyncHandler(chuyenNganhController.deleteChuyenNganhController)
);

export { router as chuyenNganhNestedRoutes, directChuyenNganhRouter };
