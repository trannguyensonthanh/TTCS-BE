// src/modules/yeuCauHuySK/yeuCauHuySK.controller.js
import { yeuCauHuySKService } from './yeuCauHuySK.service.js';
import { createdResponse } from '../../utils/response.util.js'; // Hoặc okResponse tùy theo bạn muốn trả về status code nào

const createYeuCauHuySKController = async (req, res) => {
  const { suKienID, lyDoHuy } = req.body; // Đã được validate
  const nguoiYeuCau = req.user; // Từ authMiddleware

  const suKienUpdated = await yeuCauHuySKService.createYeuCauHuySK(
    suKienID,
    lyDoHuy,
    nguoiYeuCau
  );

  // FE yêu cầu trả về message và suKienUpdated
  createdResponse(
    res,
    { suKienUpdated },
    'Yêu cầu hủy sự kiện đã được tạo thành công và đang chờ duyệt.'
  );
};

export const yeuCauHuySKController = {
  createYeuCauHuySKController,
};
