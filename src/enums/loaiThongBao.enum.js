// src/enums/loaiThongBao.enum.js
const LoaiThongBao = Object.freeze({
  SU_KIEN_MOI_CHO_DUYET_BGH: 'SU_KIEN_MOI_CHO_DUYET_BGH', // Gửi BGH
  SU_KIEN_DA_DUYET_BGH: 'SU_KIEN_DA_DUYET_BGH', // Gửi người tạo
  SU_KIEN_BI_TU_CHOI_BGH: 'SU_KIEN_BI_TU_CHOI_BGH', // Gửi người tạo
  YC_PHONG_MOI_CHO_CSVC: 'YC_PHONG_MOI_CHO_CSVC', // Gửi CSVC
  YC_PHONG_DA_DUYET_CSVC: 'YC_PHONG_DA_DUYET_CSVC', // Gửi người yêu cầu phòng
  YC_PHONG_BI_TU_CHOI_CSVC: 'YC_PHONG_BI_TU_CHOI_CSVC', // Gửi người yêu cầu phòng
  YC_HUY_SK_MOI_CHO_BGH: 'YC_HUY_SK_MOI_CHO_BGH', // Gửi BGH
  YC_HUY_SK_DA_DUYET: 'YC_HUY_SK_DA_DUYET', // Gửi người yêu cầu hủy
  YC_HUY_SK_BI_TU_CHOI: 'YC_HUY_SK_BI_TU_CHOI', // Gửi người yêu cầu hủy
  SK_SAP_DIEN_RA: 'SK_SAP_DIEN_RA', // Gửi người tham gia/được mời
  THONG_BAO_CHUNG: 'THONG_BAO_CHUNG',
  // Thêm các loại khác nếu cần
});

export default LoaiThongBao;
