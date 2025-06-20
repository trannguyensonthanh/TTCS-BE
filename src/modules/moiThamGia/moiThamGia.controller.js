import { suKienService } from '../suKien/suKien.service.js';
import { noContentResponse } from '../../utils/response.util.js';

/**
 * [MỚI] Thu hồi một lời mời tham gia sự kiện.
 */
const thuHoiLoiMoiController = async (req, res) => {
  const { moiThamGiaID } = req.params;
  const currentUser = req.user;

  await suKienService.thuHoiLoiMoi(parseInt(moiThamGiaID), currentUser);
  noContentResponse(res, 'Đã thu hồi lời mời thành công.');
};

export const moiThamGiaController = {
  thuHoiLoiMoiController,
};
