import httpStatus from '../../constants/httpStatus.js';
import MaVaiTro from '../../enums/maVaiTro.enum.js';
import ApiError from '../../utils/ApiError.util.js';
import logger from '../../utils/logger.util.js';
import { authRepository } from '../auth/auth.repository.js';
import { suKienRepository } from '../suKien/suKien.repository.js';
import { yeuCauDoiPhongRepository } from '../yeuCauDoiPhong/yeuCauDoiPhong.repository.js';
import { yeuCauHuySKRepository } from '../yeuCauHuySK/yeuCauHuySK.repository.js';
import { yeuCauMuonPhongRepository } from '../yeuCauMuonPhong/yeuCauMuonPhong.repository.js';
import { thongKeRepository } from './thongKe.repository.js';

/**
 * [MỚI] Lấy dữ liệu cho các thẻ KPI tổng quan.
 */
const getSuKienKpi = async (params) => {
  const kpiData = await thongKeRepository.getKpiData(params);

  const diemTbNoiDung = parseFloat(kpiData.DiemNoiDungTrungBinh || 0);
  const diemTbToChuc = parseFloat(kpiData.DiemToChucTrungBinh || 0);
  const diemTbDiaDiem = parseFloat(kpiData.DiemDiaDiemTrungBinh || 0);

  let diemTongQuat = 0;
  if (kpiData.SoLuotDanhGia > 0) {
    diemTongQuat = (diemTbNoiDung + diemTbToChuc + diemTbDiaDiem) / 3;
  }

  return {
    tongSuKien: kpiData.TongSuKien || 0,
    suKienSapToi: kpiData.SuKienSapToi || 0,
    tongLuotThamGiaDuKien: kpiData.TongLuotThamGiaDuKien || 0,
    tongLuotThamGiaThucTe: null, // Sẽ bổ sung khi có dữ liệu điểm danh
    trungBinhNguoiThamGiaMoiSuKien:
      kpiData.TongSuKien > 0
        ? parseFloat(
            (kpiData.TongLuotThamGiaDuKien / kpiData.TongSuKien).toFixed(2)
          )
        : 0,
    danhGiaTrungBinh: {
      diemNoiDung: parseFloat(diemTbNoiDung.toFixed(2)),
      diemToChuc: parseFloat(diemTbToChuc.toFixed(2)),
      diemDiaDiem: parseFloat(diemTbDiaDiem.toFixed(2)),
      diemTongQuat: parseFloat(diemTongQuat.toFixed(2)),
      soLuotDanhGia: kpiData.SoLuotDanhGia || 0,
    },
  };
};

/**
 * [MỚI] Lấy dữ liệu thống kê sự kiện theo loại, tính toán tỷ lệ phần trăm.
 */
const getThongKeSuKienTheoLoai = async (params) => {
  const stats = await thongKeRepository.getStatsByEventType(params);

  const tongSoSuKien = stats.reduce((sum, item) => sum + item.SoLuongSuKien, 0);

  return stats.map((item) => ({
    loaiSuKienID: item.LoaiSuKienID,
    tenLoaiSK: item.TenLoaiSK,
    maLoaiSK: item.MaLoaiSK,
    soLuongSuKien: item.SoLuongSuKien,
    tyLePhanTram:
      tongSoSuKien > 0
        ? parseFloat(((item.SoLuongSuKien / tongSoSuKien) * 100).toFixed(2))
        : 0,
  }));
};
/**
 * [MỚI] Lấy dữ liệu thống kê sự kiện và người tham gia theo thời gian.
 */
const getThongKeSuKienTheoThoiGian = async (params) => {
  const stats = await thongKeRepository.getStatsOverTime(params);
  // Repository đã định dạng sẵn, chỉ cần trả về
  return stats.map((item) => ({
    thoiGian: item.ThoiGian,
    soLuongSuKien: item.SoLuongSuKien,
    soNguoiThamGiaDuKien: item.SoNguoiThamGiaDuKien,
    soNguoiThamGiaThucTe: null, // Sẽ bổ sung khi có dữ liệu điểm danh
  }));
};

/**
 * [MỚI] Lấy danh sách sự kiện sắp diễn ra cho dashboard.
 */
const getSuKienSapDienRaDashboard = async (params) => {
  const events = await thongKeRepository.getUpcomingEventsForDashboard(params);

  return events.map((event) => ({
    suKienID: event.suKienID,
    tenSK: event.tenSK,
    tgBatDauDK: event.tgBatDauDK.toISOString(),
    tgKetThucDK: event.tgKetThucDK.toISOString(),
    diaDiemDaXep: event.DiaDiemDaXep,
    donViChuTri: { tenDonVi: event.TenDonViChuTri },
    loaiSuKien: event.TenLoaiSK ? { tenLoaiSK: event.TenLoaiSK } : null,
    slThamDuDK: event.slThamDuDK,
    soNguoiDaChapNhanMoi: event.SoNguoiDaChapNhanMoi,
  }));
};

/**
 * [MỚI] Lấy danh sách các yêu cầu đang chờ xử lý cho người dùng hiện tại.
 */
const getYeuCauChoXuLy = async (params, currentUser) => {
  const { limit = 5 } = params;
  const userRoles = await authRepository.getVaiTroChucNangByNguoiDungID(
    currentUser.nguoiDungID
  );

  const isAdmin = userRoles.some((r) => r.maVaiTro === MaVaiTro.ADMIN_HE_THONG);
  const isBGH = userRoles.some(
    (r) => r.maVaiTro === MaVaiTro.BGH_DUYET_SK_TRUONG
  );
  const isCSVC = userRoles.some((r) => r.maVaiTro === MaVaiTro.QUAN_LY_CSVC);

  const promises = [];

  if (isAdmin || isBGH) {
    promises.push(suKienRepository.getPendingApprovalEventsForDashboard(limit));
    promises.push(
      yeuCauHuySKRepository.getPendingCancelRequestsForDashboard(limit)
    );
  }
  if (isAdmin || isCSVC) {
    promises.push(
      yeuCauMuonPhongRepository.getPendingRoomRequestsForDashboard(limit)
    );
    promises.push(
      yeuCauDoiPhongRepository.getPendingChangeRoomRequestsForDashboard(limit)
    );
  }

  const results = await Promise.all(promises);
  const combinedList = [];

  // Duyệt sự kiện chờ
  if (results[0]) {
    combinedList.push(
      ...results[0].map((item) => ({
        idYeuCau: `SK_${item.SuKienID}`,
        loaiYeuCau: 'DUYET_SU_KIEN',
        tenYeuCau: `Duyệt sự kiện: ${item.TenSK}`,
        nguoiGuiYeuCau: {
          hoTen: item.HoTenNguoiTao,
          donVi: item.TenDonViChuTri,
        },
        ngayGuiYeuCau: item.NgayTaoSK.toISOString(),
        duongDanChiTiet: `/admin/su-kien-cho-duyet/${item.SuKienID}`,
      }))
    );
  }
  // Duyệt hủy sự kiện
  if (results[1]) {
    combinedList.push(
      ...results[1].map((item) => ({
        idYeuCau: `YCHS_${item.YcHuySkID}`,
        loaiYeuCau: 'DUYET_HUY_SU_KIEN',
        tenYeuCau: `Duyệt hủy sự kiện: ${item.TenSK}`,
        nguoiGuiYeuCau: { hoTen: item.HoTenNguoiYeuCau, donVi: null }, // Cần join thêm để có đơn vị người yêu cầu
        ngayGuiYeuCau: item.NgayYeuCauHuy.toISOString(),
        duongDanChiTiet: `/admin/yeu-cau-huy-cho-duyet/${item.YcHuySkID}`,
      }))
    );
  }
  // Duyệt mượn phòng
  if (results[2]) {
    combinedList.push(
      ...results[2].map((item) => ({
        idYeuCau: `YCMP_${item.YcMuonPhongID}`,
        loaiYeuCau: 'DUYET_MUON_PHONG',
        tenYeuCau: `Duyệt yêu cầu phòng cho sự kiện: ${item.TenSK}`,
        nguoiGuiYeuCau: { hoTen: item.HoTenNguoiYeuCau, donVi: null },
        ngayGuiYeuCau: item.NgayYeuCau.toISOString(),
        duongDanChiTiet: `/admin/yeu-cau-phong/${item.YcMuonPhongID}`,
      }))
    );
  }
  // Duyệt đổi phòng
  if (results[3]) {
    combinedList.push(
      ...results[3].map((item) => ({
        idYeuCau: `YCDP_${item.YcDoiPhongID}`,
        loaiYeuCau: 'DUYET_DOI_PHONG',
        tenYeuCau: `Duyệt yêu cầu đổi phòng cho sự kiện: ${item.TenSK}`,
        nguoiGuiYeuCau: { hoTen: item.HoTenNguoiYeuCau, donVi: null },
        ngayGuiYeuCau: item.NgayYeuCauDoi.toISOString(),
        duongDanChiTiet: `/admin/yeu-cau-doi-phong/${item.YcDoiPhongID}`,
      }))
    );
  }

  // Sắp xếp lại theo ngày gửi gần nhất và cắt theo limit
  combinedList.sort(
    (a, b) => new Date(b.ngayGuiYeuCau) - new Date(a.ngayGuiYeuCau)
  );
  return combinedList.slice(0, limit);
};

/**
 * [MỚI] Lấy dữ liệu thống kê đánh giá sự kiện.
 */
const getThongKeDanhGiaSuKien = async (params) => {
  const rawStats = await thongKeRepository.getEventRatingStats(params);

  const statsMap = new Map(
    rawStats.map((item) => [item.MucDiem, item.SoLuotDanhGia])
  );
  const tongSoLuotDanhGia = rawStats.reduce(
    (sum, item) => sum + item.SoLuotDanhGia,
    0
  );

  const result = [];

  for (let i = 1; i <= 5; i += 1) {
    const soLuot = statsMap.get(i) || 0;
    result.push({
      mucDiem: `${i} sao`,
      soLuotDanhGia: soLuot,
      tyLePhanTram:
        tongSoLuotDanhGia > 0
          ? parseFloat(((soLuot / tongSoLuotDanhGia) * 100).toFixed(2))
          : 0,
    });
  }

  return result.sort((a, b) => b.mucDiem.localeCompare(a.mucDiem));
};

/**
 * [MỚI] Lấy dữ liệu cho các thẻ KPI CSVC.
 */
const getCsVcKpi = async (params) => {
  // Đặt ngày mặc định là hôm nay nếu không được cung cấp
  if (!params.ngayHienTai) {
    [params.ngayHienTai] = new Date().toISOString().split('T');
  }

  const kpiData = await thongKeRepository.getFacilityKpiData(params);

  const tongSoPhong = kpiData.phongStats.TongSoPhong || 0;
  const phongDangSuDung = kpiData.phongDangSuDung || 0;
  // Phòng có thể sử dụng = Tổng - Ngưng sử dụng
  const tongSoPhongCoTheSuDung =
    tongSoPhong - (kpiData.phongStats.PhongNgungSuDung || 0);

  const tyLeSuDung =
    tongSoPhongCoTheSuDung > 0
      ? parseFloat(
          ((phongDangSuDung / tongSoPhongCoTheSuDung) * 100).toFixed(2)
        )
      : 0;

  return {
    tongSoPhong,
    phongSanSang: kpiData.phongStats.PhongSanSang || 0,
    phongDangSuDung,
    phongDangBaoTri: kpiData.phongStats.PhongDangBaoTri || 0,
    phongNgungSuDung: kpiData.phongStats.PhongNgungSuDung || 0,
    tyLeSuDungPhongHomNay: tyLeSuDung,
    tongSoThietBi: kpiData.thietBiStats.TongSoThietBi || 0,
    thietBiDangHoatDongTot: kpiData.thietBiStats.ThietBiTot || 0,
    thietBiCanBaoTri: kpiData.thietBiStats.ThietBiCanBaoTri || 0,
    yeuCauMuonPhongChoDuyet: kpiData.yeuCauMuonPhongChoDuyet || 0,
    yeuCauDoiPhongChoDuyet: kpiData.yeuCauDoiPhongChoDuyet || 0,
  };
};

/**
 * [MỚI] Lấy dữ liệu sử dụng phòng theo thời gian.
 */
const getSuDungPhongTheoThoiGian = async (params) => {
  const stats = await thongKeRepository.getRoomUsageOverTime(params);
  return stats.map((item) => ({
    thoiGian: item.ThoiGian,
    soLuotDatPhong: item.SoLuotDatPhong,
    tongGioSuDung: parseFloat(item.TongGioSuDung.toFixed(2)),
  }));
};

/**
 * [MỚI] Lấy dữ liệu thống kê loại phòng phổ biến.
 */
const getLoaiPhongPhoBien = async (params) => {
  const stats = await thongKeRepository.getPopularRoomTypes(params);
  return stats.map((item) => ({
    loaiPhongID: item.LoaiPhongID,
    tenLoaiPhong: item.TenLoaiPhong,
    soLuotDat: item.SoLuotDat,
    tongGioSuDung: parseFloat(item.TongGioSuDung.toFixed(2)),
  }));
};

/**
 * [MỚI] Lấy dữ liệu thống kê thiết bị.
 */
const getThongKeThietBi = async (params) => {
  const { loaiThongKe } = params;

  if (loaiThongKe === 'TINH_TRANG') {
    const stats = await thongKeRepository.getEquipmentStatusStats(params);
    return stats.map((item) => ({
      tinhTrang: item.TinhTrang,
      soLuong: item.SoLuong,
    }));
  }

  if (loaiThongKe === 'SU_DUNG_NHIEU') {
    // Logic cho thống kê sử dụng nhiều chưa được hỗ trợ do cấu trúc DB.
    // Trả về mảng rỗng hoặc thông báo.
    logger.warn('Thống kê thiết bị theo "SU_DUNG_NHIEU" chưa được hỗ trợ.');
    return [];
  }

  throw new ApiError(httpStatus.BAD_REQUEST, 'Loại thống kê không hợp lệ.');
};

export const thongKeService = {
  getSuKienKpi,
  getThongKeSuKienTheoLoai,
  getThongKeSuKienTheoThoiGian,
  getSuKienSapDienRaDashboard,
  getYeuCauChoXuLy,
  getThongKeDanhGiaSuKien,
  getCsVcKpi,
  getSuDungPhongTheoThoiGian,
  getLoaiPhongPhoBien,
  getThongKeThietBi,
};
