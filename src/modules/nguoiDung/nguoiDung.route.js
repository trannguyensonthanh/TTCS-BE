// src/modules/nguoiDung/nguoiDung.route.js
import express from 'express';
import { nguoiDungController } from './nguoiDung.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { nguoiDungValidation } from './nguoiDung.validation.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js'; // Enum cho vai trò người dùng
const router = express.Router();
router.use(authMiddleware.authenticateToken);

/**
 * Lấy danh sách người dùng (chỉ Admin hệ thống).
 * @route GET /nguoidung
 * @returns {object} Danh sách người dùng (phân trang)
 */
router.get(
  '/',
  authMiddleware.authenticateToken,
  // authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  nguoiDungValidation.validateGetNguoiDungsParams,
  asyncHandler(nguoiDungController.getNguoiDungListController)
);

/**
 * Lấy thông tin hồ sơ cá nhân của người dùng hiện tại.
 * @route GET /nguoidung/toi
 * @returns {object} Thông tin hồ sơ cá nhân
 */
router.get(
  '/toi',
  authMiddleware.authenticateToken,
  asyncHandler(nguoiDungController.getMyProfileController)
);

/**
 * Đổi mật khẩu cho người dùng hiện tại.
 * @route PUT /nguoidung/toi/doi-mat-khau
 * @body {object} { matKhauHienTai, matKhauMoi }
 * @returns {object} Kết quả đổi mật khẩu
 */
router.put(
  '/toi/doi-mat-khau',
  authMiddleware.authenticateToken,
  nguoiDungValidation.validateChangePasswordPayload,
  asyncHandler(nguoiDungController.changeMyPasswordController)
);

/**
 * [MỚI] Tìm kiếm người dùng (SV/GV) để mời.
 * @route GET /nguoi-dung/tim-kiem-de-moi
 * @access CONG_TAC_SINH_VIEN, ADMIN_HE_THONG
 */
router.get(
  '/tim-kiem-de-moi',
  authMiddleware.authorizeRoles(
    MaVaiTro.CONG_TAC_SINH_VIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  nguoiDungValidation.validateFindUsersForInvitationParams,
  asyncHandler(nguoiDungController.findUsersForInvitationController)
);

/**
 * Lấy chi tiết người dùng theo ID (chỉ Admin).
 * @route GET /nguoidung/:nguoiDungId
 * @param {string} nguoiDungId - ID người dùng (URL param)
 * @returns {object} Thông tin chi tiết người dùng
 */
router.get(
  '/:nguoiDungId',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  nguoiDungValidation.validateIdParam,
  asyncHandler(nguoiDungController.getNguoiDungDetailForAdminController)
);

/**
 * Tạo mới người dùng (chỉ Admin).
 * @route POST /nguoidung/admin-create
 * @body {object} Thông tin người dùng
 * @returns {object} Người dùng vừa tạo
 */
router.post(
  '/admin-create',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  nguoiDungValidation.validateCreateNguoiDungPayload,
  asyncHandler(nguoiDungController.createNguoiDungByAdminController)
);

/**
 * Cập nhật thông tin người dùng (chỉ Admin).
 * @route PUT /nguoidung/:nguoiDungId/admin-update
 * @param {string} nguoiDungId - ID người dùng (URL param)
 * @body {object} Thông tin cập nhật
 * @returns {object} Người dùng sau khi cập nhật
 */
router.put(
  '/:nguoiDungId/admin-update',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  nguoiDungValidation.validateIdParam,
  nguoiDungValidation.validateUpdateNguoiDungAdminPayload,
  asyncHandler(nguoiDungController.updateNguoiDungByAdminController)
);

/**
 * Cập nhật trạng thái tài khoản người dùng (chỉ Admin).
 * @route PUT /nguoidung/:nguoiDungId/cap-nhat-trang-thai-tai-khoan
 * @param {string} nguoiDungId - ID người dùng (URL param)
 * @body {object} Trạng thái tài khoản mới
 * @returns {object} Người dùng với trạng thái mới
 */
router.put(
  '/:nguoiDungId/cap-nhat-trang-thai-tai-khoan',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  nguoiDungValidation.validateIdParam,
  nguoiDungValidation.validateUpdateUserAccountStatusPayload,
  asyncHandler(nguoiDungController.updateUserAccountStatusByAdminController)
);

/**
 * Gán vai trò chức năng cho người dùng (chỉ Admin).
 * @route POST /nguoidung/:nguoiDungId/vai-tro-chuc-nang
 * @param {string} nguoiDungId - ID người dùng (URL param)
 * @body {object} Thông tin vai trò chức năng
 * @returns {object} Kết quả gán vai trò
 */
router.post(
  '/:nguoiDungId/vai-tro-chuc-nang',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  nguoiDungValidation.validateIdParam,
  nguoiDungValidation.validateAssignFunctionalRolePayload,
  asyncHandler(nguoiDungController.assignFunctionalRoleController)
);

/**
 * Cập nhật gán vai trò chức năng cho người dùng (chỉ Admin).
 * @route PUT /nguoidung/vai-tro-chuc-nang/:ganVaiTroID
 * @param {string} ganVaiTroID - ID gán vai trò (URL param)
 * @body {object} Thông tin cập nhật vai trò
 * @returns {object} Kết quả cập nhật vai trò
 */
router.put(
  '/vai-tro-chuc-nang/:ganVaiTroID',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  nguoiDungValidation.validateGanVaiTroIDParam,
  nguoiDungValidation.validateUpdateAssignedFunctionalRolePayload,
  asyncHandler(nguoiDungController.updateAssignedFunctionalRoleController)
);

/**
 * Xóa (gỡ bỏ) vai trò chức năng đã gán cho người dùng (chỉ Admin).
 * @route DELETE /nguoidung/vai-tro-chuc-nang/:ganVaiTroID
 * @param {string} ganVaiTroID - ID gán vai trò (URL param)
 * @returns {object} Kết quả xóa vai trò
 */
router.delete(
  '/vai-tro-chuc-nang/:ganVaiTroID',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  nguoiDungValidation.validateGanVaiTroIDParam,
  asyncHandler(nguoiDungController.removeAssignedFunctionalRoleController)
);

/**
 * Import hàng loạt người dùng (chỉ Admin).
 * @route POST /nguoidung/admin-import-batch
 * @body {object} users[]
 * @returns {object} Kết quả import
 */
router.post(
  '/admin-import-batch',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  nguoiDungValidation.validateImportUsersBatchPayload,
  asyncHandler(nguoiDungController.importUsersBatchController)
);

/**
 * Xóa cứng người dùng theo ID (chỉ Admin hệ thống).
 * @route DELETE /nguoidung/:nguoiDungId
 * @param {string} nguoiDungId - ID người dùng (URL param)
 * @returns {object} Kết quả xóa hoặc lỗi nếu có liên kết dữ liệu
 */
router.delete(
  '/:nguoiDungId',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles(MaVaiTro.ADMIN_HE_THONG),
  nguoiDungValidation.validateIdParam,
  asyncHandler(nguoiDungController.deleteNguoiDungByIDController)
);

export default router;
