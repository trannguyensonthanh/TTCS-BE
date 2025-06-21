// src/modules/index.route.js
import express from 'express';
import authRoutes from './auth/auth.route.js';
// Import các routes khác từ các module khác ở đây
// import userRoutes from './nguoiDung/nguoiDung.route.js';
import suKienRoutes from './suKien/suKien.route.js'; // Đường dẫn đến file route của module sự kiện
import yeuCauHuySKRoutes from './yeuCauHuySK/yeuCauHuySK.route.js'; // Đường dẫn đến file route của module yêu cầu hủy sự kiện
import loaiSuKienRoutes from './loaiSuKien/loaiSuKien.route.js'; // Đường dẫn đến file route của module loại sự kiện
import donViRoutes from './donVi/donVi.route.js';
import nguoiDungRoutes from './nguoiDung/nguoiDung.route.js';
import thongBaoRoutes from './thongBao/thongBao.route.js';
import yeuCauMuonPhongRoutes from './yeuCauMuonPhong/yeuCauMuonPhong.route.js';
import danhMucRoutes from './danhMuc/danhMuc.route.js';
import yeuCauDoiPhongRoutes from './yeuCauDoiPhong/yeuCauDoiPhong.route.js';
import chiTietSuDungPhongRoutes from './chiTietSuDungPhong/chiTietSuDungPhong.route.js';
import lichSuDungPhongRoutes from './lichSuDungPhong/lichSuDungPhong.route.js';
import vaiTroHeThongRoutes from './vaiTroHeThong/vaiTroHeThong.route.js';
import moiThamGiaRoutes from './moiThamGia/moiThamGia.route.js';
import loiMoiSuKienRoutes from './loiMoiSuKien/loiMoiSuKien.route.js';
import danhGiaSuKienRoutes from './danhGiaSuKien/danhGiaSuKien.route.js';
import thongKeRoutes from './thongKe/thongKe.route.js';

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/sukien', // Endpoint cho sự kiện
    route: suKienRoutes,
  },
  { path: '/yeucauhuysk', route: yeuCauHuySKRoutes },
  { path: '/loaisukien', route: loaiSuKienRoutes },
  { path: '/donvi', route: donViRoutes },
  { path: '/nguoidung', route: nguoiDungRoutes },
  { path: '/thongbao', route: thongBaoRoutes },
  { path: '/yeucaumuonphong', route: yeuCauMuonPhongRoutes },
  { path: '/danhmuc', route: danhMucRoutes },
  { path: '/yeucaudoipphong', route: yeuCauDoiPhongRoutes },
  { path: '/chitietsudungphong', route: chiTietSuDungPhongRoutes },
  { path: '/lichsudungphong', route: lichSuDungPhongRoutes },
  { path: '/vaitrohethong', route: vaiTroHeThongRoutes },
  {
    path: '/moi-tham-gia',
    route: moiThamGiaRoutes,
  },
  {
    path: '/loi-moi-su-kien',
    route: loiMoiSuKienRoutes,
  },
  { path: '/danh-gia-su-kien', route: danhGiaSuKienRoutes },
  { path: '/thong-ke', route: thongKeRoutes },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
