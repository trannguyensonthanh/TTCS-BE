// File: thongKe.controller.js
// Mô tả: Controller cho các API thống kê, gọi service và trả response

import { thongKeService } from './thongKe.service.js';
import { okResponse } from '../../utils/response.util.js';
import pick from '../../utils/pick.util.js';

/**
 * Lấy dữ liệu KPI tổng quan sự kiện
 */
const getSuKienKpiController = async (req, res) => {
  const params = pick(req.query, ['tuNgay', 'denNgay', 'donViID']);
  const result = await thongKeService.getSuKienKpi(params);
  okResponse(res, result, 'Lấy dữ liệu KPI tổng quan thành công.');
};

/**
 * Lấy thống kê sự kiện theo loại
 */
const getThongKeSuKienTheoLoaiController = async (req, res) => {
  const params = pick(req.query, ['tuNgay', 'denNgay', 'donViID']);
  const result = await thongKeService.getThongKeSuKienTheoLoai(params);
  okResponse(res, result, 'Lấy thống kê sự kiện theo loại thành công.');
};

/**
 * Lấy thống kê sự kiện theo thời gian
 */
const getThongKeSuKienTheoThoiGianController = async (req, res) => {
  const params = pick(req.query, [
    'tuNgay',
    'denNgay',
    'donViThoiGian',
    'donViID',
  ]);
  const result = await thongKeService.getThongKeSuKienTheoThoiGian(params);
  okResponse(res, result, 'Lấy thống kê sự kiện theo thời gian thành công.');
};

/**
 * Lấy danh sách yêu cầu chờ xử lý
 */
const getYeuCauChoXuLyController = async (req, res) => {
  const params = pick(req.query, ['limit']);
  const currentUser = req.user;
  const result = await thongKeService.getYeuCauChoXuLy(params, currentUser);
  okResponse(res, result, 'Lấy danh sách yêu cầu chờ xử lý thành công.');
};

/**
 * Lấy thống kê đánh giá sự kiện
 */
const getThongKeDanhGiaSuKienController = async (req, res) => {
  const params = pick(req.query, [
    'tuNgaySuKienKetThuc',
    'denNgaySuKienKetThuc',
    'donViID',
    'loaiSuKienID',
    'tieuChiDiem',
  ]);
  const result = await thongKeService.getThongKeDanhGiaSuKien(params);
  okResponse(res, result, 'Lấy thống kê đánh giá sự kiện thành công.');
};

/**
 * Lấy dữ liệu KPI CSVC tổng quan
 */
const getCsVcKpiController = async (req, res) => {
  const params = pick(req.query, ['toaNhaID', 'coSoID', 'ngayHienTai']);
  const result = await thongKeService.getCsVcKpi(params);
  okResponse(res, result, 'Lấy dữ liệu KPI CSVC tổng quan thành công.');
};

/**
 * Lấy thống kê sử dụng phòng theo thời gian
 */
const getSuDungPhongTheoThoiGianController = async (req, res) => {
  const params = pick(req.query, [
    'tuNgay',
    'denNgay',
    'donViThoiGian',
    'toaNhaID',
    'loaiPhongID',
  ]);
  const result = await thongKeService.getSuDungPhongTheoThoiGian(params);
  okResponse(res, result, 'Lấy thống kê sử dụng phòng thành công.');
};

/**
 * Lấy thống kê loại phòng phổ biến
 */
const getLoaiPhongPhoBienController = async (req, res) => {
  const params = pick(req.query, ['tuNgay', 'denNgay', 'limit']);
  const result = await thongKeService.getLoaiPhongPhoBien(params);
  okResponse(res, result, 'Lấy thống kê loại phòng phổ biến thành công.');
};

/**
 * Lấy thống kê thiết bị
 */
const getThongKeThietBiController = async (req, res) => {
  const params = pick(req.query, [
    'loaiThongKe',
    'tuNgay',
    'denNgay',
    'limit',
    'toaNhaID',
    'loaiPhongID',
  ]);
  const result = await thongKeService.getThongKeThietBi(params);
  okResponse(res, result, 'Lấy thống kê thiết bị thành công.');
};

export const thongKeController = {
  getSuKienKpiController,
  getThongKeSuKienTheoLoaiController,
  getThongKeSuKienTheoThoiGianController,
  getYeuCauChoXuLyController,
  getThongKeDanhGiaSuKienController,
  getCsVcKpiController,
  getSuDungPhongTheoThoiGianController,
  getLoaiPhongPhoBienController,
  getThongKeThietBiController,
};
