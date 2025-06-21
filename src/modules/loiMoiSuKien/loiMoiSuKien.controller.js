// File: src/modules/loiMoiSuKien/loiMoiSuKien.controller.js
// Controller for handling event invitations

import { suKienService } from '../suKien/suKien.service.js';
import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Lấy danh sách lời mời của người dùng hiện tại
 */
const getMyInvitationsController = async (req, res) => {
  const { nguoiDungID } = req.user;
  const params = pick(req.query, [
    'trangThaiPhanHoi',
    'sapDienRa',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const result = await suKienService.getMyInvitations(nguoiDungID, params);
  okResponse(res, result, 'Lấy danh sách lời mời thành công.');
};

/**
 * Phản hồi lời mời tham gia sự kiện
 */
const respondToInvitationController = async (req, res) => {
  const { moiThamGiaID } = req.params;
  const payload = req.body;
  const currentUser = req.user;

  const result = await suKienService.phanHoiLoiMoi(
    parseInt(moiThamGiaID, 10),
    payload,
    currentUser
  );
  okResponse(res, result, result.message);
};

export const loiMoiSuKienController = {
  getMyInvitationsController,
  respondToInvitationController,
};
