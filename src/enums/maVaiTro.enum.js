// src/enums/maVaiTro.enum.js
const MaVaiTro = Object.freeze({
  SINH_VIEN: 'SINH_VIEN',
  GIANG_VIEN: 'GIANG_VIEN',
  // === Vai trò chức năng, cấp quyền ===
  ADMIN_HE_THONG: 'ADMIN_HE_THONG',
  BGH_DUYET_SK_TRUONG: 'BGH_DUYET_SK_TRUONG',
  QUAN_LY_CSVC: 'QUAN_LY_CSVC',
  CB_TO_CHUC_SU_KIEN: 'CB_TO_CHUC_SU_KIEN',
  CONG_TAC_SINH_VIEN: 'CONG_TAC_SINH_VIEN',

  // === Vai trò định danh mối quan hệ (không trực tiếp cấp quyền) ===
  /**
   * Dùng để xác định một người dùng là thành viên của một đơn vị cụ thể (Khoa, Phòng, Ban,...).
   * Vai trò này không cấp quyền hạn, chỉ để thiết lập mối quan hệ.
   */
  THANH_VIEN_DON_VI: 'THANH_VIEN_DON_VI',
});

export default MaVaiTro;
