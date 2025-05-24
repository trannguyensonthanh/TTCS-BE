// src/enums/maTrangThaiYeuCauPhong.enum.js
const MaTrangThaiYeuCauPhong = Object.freeze({
  // Trạng thái cho YeuCauMuonPhong (Header) - LoaiApDung = 'CHUNG'
  YCCP_CHO_XU_LY: 'YCCP_CHO_XU_LY', // Toàn bộ yêu cầu đang chờ CSVC xử lý
  YCCP_DANG_XU_LY: 'YCCP_DANG_XU_LY', // CSVC đang trong quá trình duyệt các chi tiết
  YCCP_DA_XU_LY_MOT_PHAN: 'YCCP_DA_XU_LY_MOT_PHAN', // Một số chi tiết được duyệt, một số bị từ chối
  YCCP_HOAN_TAT_DUYET: 'YCCP_HOAN_TAT_DUYET', // Tất cả chi tiết yêu cầu đã được duyệt (có thể có phòng hoặc không)
  YCCP_TU_CHOI_TOAN_BO: 'YCCP_TU_CHOI_TOAN_BO', // Tất cả chi tiết yêu cầu bị từ chối
  YCCP_DA_HUY_BOI_NGUOI_TAO: 'YCCP_DA_HUY_BOI_NGUOI_TAO',
  // Trạng thái cho YcMuonPhongChiTiet (Detail) - LoaiApDung = 'CHI_TIET'
  YCCPCT_CHO_DUYET: 'YCCPCT_CHO_DUYET', // Chi tiết yêu cầu phòng này đang chờ CSVC duyệt
  YCCPCT_DA_XEP_PHONG: 'YCCPCT_DA_XEP_PHONG', // Đã xếp phòng thành công cho chi tiết này
  YCCPCT_KHONG_PHU_HOP: 'YCCPCT_KHONG_PHU_HOP', // Không có phòng phù hợp/bị từ chối cho chi tiết này
  YCCPCT_DA_HUY: 'YCCPCT_DA_HUY', // Chi tiết yêu cầu phòng này đã bị hủy bởi người yêu cầu
});

export default MaTrangThaiYeuCauPhong;
