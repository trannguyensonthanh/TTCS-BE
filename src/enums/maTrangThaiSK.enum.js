// src/enums/maTrangThaiSK.enum.js
const MaTrangThaiSK = Object.freeze({
  CHO_DUYET_BGH: 'CHO_DUYET_BGH', // Chờ Ban Giám hiệu duyệt
  DA_DUYET_BGH: 'DA_DUYET_BGH', // Đã được BGH duyệt (chờ duyệt phòng)
  BI_TU_CHOI_BGH: 'BI_TU_CHOI_BGH', // Bị BGH từ chối
  DA_HUY_BOI_NGUOI_TAO: 'DA_HUY_BOI_NGUOI_TAO', // Người tạo tự hủy trước khi BGH duyệt
  CHO_DUYET_PHONG: 'CHO_DUYET_PHONG', // Đã được BGH duyệt, đang chờ CSVC duyệt phòng
  DA_XAC_NHAN_PHONG: 'DA_XAC_NHAN_PHONG', // CSVC đã xếp phòng
  PHONG_BI_TU_CHOI: 'PHONG_BI_TU_CHOI', // Yêu cầu phòng bị CSVC từ chối (Sự kiện quay lại CHO_DUYET_PHONG hoặc cần hành động khác)
  CHO_DUYET_HUY_SAU_DUYET: 'CHO_DUYET_HUY_SAU_DUYET', // Chờ BGH duyệt yêu cầu hủy (sau khi sự kiện đã từng được BGH duyệt)
  DA_HUY: 'DA_HUY', // Sự kiện đã được hủy chính thức (sau khi BGH duyệt hủy)
  HOAN_THANH: 'HOAN_THANH', // Sự kiện đã diễn ra và hoàn thành
  // Thêm các mã trạng thái sự kiện khác nếu có
});

export default MaTrangThaiSK;
