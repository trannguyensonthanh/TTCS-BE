// src/modules/yeuCauDoiPhong/yeuCauDoiPhong.route.js
import express from 'express';
import { yeuCauDoiPhongController } from './yeuCauDoiPhong.controller.js';
import asyncHandler from '../../utils/asyncHandler.util.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { yeuCauDoiPhongValidation } from './yeuCauDoiPhong.validation.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
// import MaVaiTro from '../../enums/maVaiTro.enum.js';

const router = express.Router();
router.use(authMiddleware.authenticateToken);

router.get(
  '/',
  // authMiddleware.authorizeRoles(...), // Ai được xem danh sách
  yeuCauDoiPhongValidation.validateGetYeuCauDoiPhongParams,
  asyncHandler(yeuCauDoiPhongController.getYeuCauDoiPhongsController)
);

router.get(
  '/:id',
  // authMiddleware.authorizeRoles(...), // Ai được xem chi tiết
  yeuCauDoiPhongValidation.validateIdParam,
  asyncHandler(yeuCauDoiPhongController.getYeuCauDoiPhongDetailController)
);

router.post(
  '/', // POST /v1/yeucaudoipphong
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  yeuCauDoiPhongValidation.validateCreateYeuCauDoiPhongPayload,
  asyncHandler(yeuCauDoiPhongController.createYeuCauDoiPhongController)
);

router.put(
  '/:id/xu-ly', // PUT /v1/yeucaudoipphong/:id/xu-ly
  authMiddleware.authorizeRoles(MaVaiTro.QUAN_LY_CSVC, MaVaiTro.ADMIN_HE_THONG),
  yeuCauDoiPhongValidation.validateIdParam,
  yeuCauDoiPhongValidation.validateXuLyYeuCauDoiPhongPayload,
  asyncHandler(yeuCauDoiPhongController.xuLyYeuCauDoiPhongController)
);

router.delete(
  // Hoặc dùng PUT nếu bạn muốn body (mặc dù FE gửi DELETE không body)
  '/:id', // DELETE /v1/yeucaudoipphong/:id
  authMiddleware.authorizeRoles(
    MaVaiTro.CB_TO_CHUC_SU_KIEN,
    MaVaiTro.ADMIN_HE_THONG
  ),
  yeuCauDoiPhongValidation.validateIdParam,
  asyncHandler(yeuCauDoiPhongController.huyYeuCauDoiPhongByUserController)
);

export default router;

// Các điểm quan trọng và TODOs:
// Transaction: Toàn bộ logic xử lý được đặt trong transaction.
// Kiểm tra phòng trống (checkPhongAvailability): Hàm này rất quan trọng. Logic hiện tại kiểm tra xung đột thời gian cơ bản. Bạn có thể cần làm nó phức tạp hơn nếu có các quy tắc đặt phòng khác (ví dụ: thời gian nghỉ giữa các lượt sử dụng).
// DatPhongID_Moi: Khi duyệt đổi phòng, một bản ghi ChiTietDatPhong mới được tạo cho YcMuonPhongCtID gốc với PhongID mới. DatPhongID của bản ghi mới này sẽ được lưu vào YeuCauDoiPhong.DatPhongID_Moi.
// Xử lý DatPhongID_Cu: Việc "giải phóng" phòng cũ (liên kết với DatPhongID_Cu) cần được định nghĩa rõ ràng.
// Cách 1 (Đơn giản, được ẩn ý trong code hiện tại): Không xóa hay cập nhật trực tiếp bản ghi ChiTietDatPhong cũ. Thay vào đó, logic hiển thị phòng cho một YcMuonPhongCtID sẽ phải kiểm tra xem có YeuCauDoiPhong nào đã được duyệt với DatPhongID_Moi không. Nếu có, thì phòng đó là phòng hiện tại. Cách này giữ lại lịch sử.
// Cách 2 (Cập nhật ChiTietDatPhong cũ): Bạn có thể thêm một cột trạng thái vào ChiTietDatPhong (ví dụ: TrangThaiDatPhong với các giá trị 'Active', 'Changed', 'Cancelled'). Khi đổi phòng, trạng thái của DatPhongID_Cu sẽ được cập nhật thành 'Changed'. Cách này rõ ràng hơn về mặt dữ liệu nhưng thêm một cột trạng thái.
// Cách 3 (Xóa ChiTietDatPhong cũ): Nếu không cần giữ lịch sử đặt phòng cũ trong ChiTietDatPhong một khi đã đổi, bạn có thể xóa bản ghi DatPhongID_Cu. Cẩn thận: nếu YcMuonPhongCtID có SlPhongNhomNay > 1 và chỉ đổi 1 phòng, bạn không thể xóa DatPhongID_Cu nếu nó vẫn đang phục vụ các phòng khác chưa đổi của cùng chi tiết yêu cầu đó (logic này sẽ phức tạp hơn nhiều).
// Hiện tại, tôi chọn Cách 1 ẩn ý (không tác động trực tiếp vào DatPhongID_Cu trong ChiTietDatPhong khi CSVC duyệt đổi).
// Cập nhật trạng thái SuKien: Sau khi CSVC xử lý yêu cầu đổi phòng, trạng thái của SuKien có thể không cần thay đổi ngay lập tức, vì nó vẫn là DA_XAC_NHAN_PHONG (chỉ là phòng khác).
// Thông báo: Gửi thông báo cho người yêu cầu về kết quả xử lý. Cần thêm LoaiThongBao tương ứng.
