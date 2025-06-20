// src/modules/nguoiDung/nguoiDung.controller.js
import { nguoiDungService } from './nguoiDung.service.js';
import {
  okResponse,
  noContentResponse,
  createdResponse,
} from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';
import httpStatus from '../../constants/httpStatus.js';
import ApiError from '../../utils/ApiError.util.js';

/**
 * Lấy danh sách người dùng (có phân trang, filter).
 * @param {Request} req - Express request (query: searchTerm, loaiNguoiDung, maVaiTro, donViID, isActive, page, limit, sortBy, sortOrder)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response danh sách người dùng
 */
const getNguoiDungListController = async (req, res) => {
  const params = pick(req.query, [
    'searchTerm',
    'loaiNguoiDung',
    'maVaiTro',
    'donViID',
    'isActive',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await nguoiDungService.getNguoiDungList(params);
  okResponse(res, result, 'Lấy danh sách người dùng thành công.');
};

/**
 * Lấy thông tin hồ sơ cá nhân của người dùng hiện tại.
 * @param {Request} req - Express request (user từ middleware xác thực)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response thông tin hồ sơ
 */
const getMyProfileController = async (req, res) => {
  const nguoiDungID = req.user.nguoiDungID; // Từ authMiddleware
  const userProfile = await nguoiDungService.getMyProfile(nguoiDungID);
  okResponse(res, userProfile, 'Lấy thông tin hồ sơ thành công.');
};

/**
 * Đổi mật khẩu cho người dùng hiện tại.
 * @param {Request} req - Express request (user, body: matKhauHienTai, matKhauMoi)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response xác nhận đổi mật khẩu
 */
const changeMyPasswordController = async (req, res) => {
  const nguoiDungID = req.user.nguoiDungID;
  const { matKhauHienTai, matKhauMoi } = req.body; // Đã validate
  const result = await nguoiDungService.changeMyPassword(
    nguoiDungID,
    matKhauHienTai,
    matKhauMoi
  );
  noContentResponse(res, result.message);
};

/**
 * Lấy chi tiết người dùng cho admin theo ID.
 * @param {Request} req - Express request (params: nguoiDungId)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response chi tiết người dùng
 */
const getNguoiDungDetailForAdminController = async (req, res) => {
  const targetNguoiDungID = parseInt(req.params.nguoiDungId);
  const userProfile =
    await nguoiDungService.getNguoiDungDetailForAdmin(targetNguoiDungID);
  okResponse(res, userProfile, 'Lấy chi tiết người dùng thành công.');
};

/**
 * Tạo mới người dùng (bởi admin).
 * @param {Request} req - Express request (body: thông tin người dùng)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response người dùng vừa tạo
 */
const createNguoiDungByAdminController = async (req, res) => {
  const userProfile = await nguoiDungService.createNguoiDungByAdmin(req.body); // req.body đã validate
  createdResponse(res, userProfile, 'Tạo người dùng mới thành công.');
};

/**
 * Cập nhật thông tin người dùng (bởi admin).
 * @param {Request} req - Express request (params: nguoiDungId, body: thông tin cập nhật)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response người dùng sau khi cập nhật
 */
const updateNguoiDungByAdminController = async (req, res) => {
  const nguoiDungId = parseInt(req.params.nguoiDungId);
  const updatePayload = req.body; // Đã được validate
  const updatedUserProfile = await nguoiDungService.updateNguoiDungByAdmin(
    nguoiDungId,
    updatePayload
  );
  okResponse(
    res,
    updatedUserProfile,
    'Cập nhật thông tin người dùng thành công.'
  );
};

/**
 * Cập nhật trạng thái tài khoản người dùng (bởi admin).
 * @param {Request} req - Express request (params: nguoiDungId, body: trạng thái mới)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response trạng thái tài khoản mới
 */
const updateUserAccountStatusByAdminController = async (req, res) => {
  const nguoiDungId = parseInt(req.params.nguoiDungId);
  const payload = req.body; // Đã validate
  const updatedNguoiDung =
    await nguoiDungService.updateUserAccountStatusByAdmin(nguoiDungId, payload);
  okResponse(
    res,
    { nguoiDung: updatedNguoiDung },
    'Cập nhật trạng thái tài khoản người dùng thành công.'
  );
};

/**
 * Gán vai trò chức năng cho người dùng (bởi admin).
 * @param {Request} req - Express request (params: nguoiDungId, body: vai trò chức năng)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response xác nhận gán vai trò
 */
const assignFunctionalRoleController = async (req, res) => {
  const nguoiDungId = parseInt(req.params.nguoiDungId);
  const payload = req.body; // Đã validate
  const assignedRole = await nguoiDungService.assignFunctionalRoleToUser(
    nguoiDungId,
    payload
  );
  createdResponse(res, assignedRole, 'Gán vai trò chức năng thành công.');
};

/**
 * Cập nhật gán vai trò chức năng cho người dùng (bởi admin).
 * @param {Request} req - Express request (params: ganVaiTroID, body: vai trò chức năng mới)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response xác nhận cập nhật vai trò
 */
const updateAssignedFunctionalRoleController = async (req, res) => {
  const ganVaiTroID = parseInt(req.params.ganVaiTroID);
  const payload = req.body; // Đã validate
  const updatedAssignment = await nguoiDungService.updateAssignedFunctionalRole(
    ganVaiTroID,
    payload
  );
  okResponse(
    res,
    updatedAssignment,
    'Cập nhật gán vai trò chức năng thành công.'
  );
};

/**
 * Gỡ bỏ vai trò chức năng đã gán cho người dùng (bởi admin).
 * @param {Request} req - Express request (params: ganVaiTroID)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response xác nhận gỡ bỏ vai trò
 */
const removeAssignedFunctionalRoleController = async (req, res) => {
  const ganVaiTroID = parseInt(req.params.ganVaiTroID);
  await nguoiDungService.removeAssignedFunctionalRole(ganVaiTroID);
  noContentResponse(res, 'Gỡ bỏ vai trò chức năng đã gán thành công.'); // Trả về 204 No Content
};

/**
 * Import hàng loạt người dùng từ payload.
 * @param {Request} req - Express request (body: users[])
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response kết quả import
 */
const importUsersBatchController = async (req, res) => {
  if (!req.body.users || !Array.isArray(req.body.users)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Payload phải chứa một mảng 'users'."
    );
  }
  const result = await nguoiDungService.importUsersBatch(req.body.users);
  okResponse(res, result, result.summaryMessage);
};

/**
 * Xóa cứng người dùng theo ID.
 * @param {Request} req - Express request (params: nguoiDungID)
 * @param {Response} res - Express response
 * @returns {Promise<void>} Gửi response xác nhận xóa hoặc lỗi nếu có liên kết dữ liệu
 */
const deleteNguoiDungByIDController = async (req, res) => {
  const nguoiDungID = parseInt(req.params.nguoiDungId);
  await nguoiDungService.deleteNguoiDungByID(nguoiDungID);
  noContentResponse(res, 'Xóa người dùng thành công.');
};

/**
 * [MỚI] Tìm kiếm người dùng để mời tham gia sự kiện.
 */
const findUsersForInvitationController = async (req, res) => {
  const params = pick(req.query, [
    'suKienID',
    'searchTerm',
    'loaiNguoiDung',
    'donViID',
    'nganhHocID',
    'lopID',
    'limit',
  ]);
  const result = await nguoiDungService.findUsersForInvitation(params);
  okResponse(res, result, 'Tìm kiếm người dùng thành công.');
};

export const nguoiDungController = {
  getMyProfileController,
  changeMyPasswordController,
  getNguoiDungListController,
  getNguoiDungDetailForAdminController,
  createNguoiDungByAdminController,
  updateNguoiDungByAdminController,
  updateUserAccountStatusByAdminController,
  assignFunctionalRoleController,
  findUsersForInvitationController,
  updateAssignedFunctionalRoleController,
  removeAssignedFunctionalRoleController,
  importUsersBatchController,
  deleteNguoiDungByIDController,
};
