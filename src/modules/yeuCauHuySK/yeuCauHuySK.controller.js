import pick from '../../utils/pick.util.js';
import { okResponse, createdResponse } from '../../utils/response.util.js';
import { yeuCauHuySKService } from './yeuCauHuySK.service.js';

/**
 * Lấy danh sách yêu cầu hủy sự kiện.
 * Đầu vào: req.query (searchTerm, trangThaiYcHuySkMa, suKienID, nguoiYeuCauID, page, limit, sortBy, sortOrder), req.user
 * Đầu ra: Response trả về danh sách yêu cầu hủy sự kiện
 */
const getYeuCauHuySKsController = async (req, res) => {
  const params = pick(req.query, [
    'searchTerm',
    'trangThaiYcHuySkMa',
    'suKienID',
    'nguoiYeuCauID',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  const currentUser = req.user;
  const result = await yeuCauHuySKService.getYeuCauHuySKs(params, currentUser);
  okResponse(res, result, 'Lấy danh sách yêu cầu hủy sự kiện thành công.');
};

/**
 * Lấy chi tiết một yêu cầu hủy sự kiện.
 * Đầu vào: req.params.id (ID yêu cầu), req.user, req.query.includeSuKienDetail (bool)
 * Đầu ra: Response trả về chi tiết yêu cầu hủy sự kiện
 */
const getYeuCauHuySKDetailController = async (req, res) => {
  const ycHuySkID = parseInt(req.params.id, 10);
  const currentUser = req.user;
  const fetchSuKienFullDetail = req.query.includeSuKienDetail === 'true';
  const result = await yeuCauHuySKService.getYeuCauHuySKDetail(
    ycHuySkID,
    currentUser,
    fetchSuKienFullDetail
  );
  okResponse(res, result, 'Lấy chi tiết yêu cầu hủy sự kiện thành công.');
};

/**
 * Tạo mới yêu cầu hủy sự kiện.
 * Đầu vào: req.body (suKienID, lyDoHuy), req.user
 * Đầu ra: Response trả về sự kiện đã cập nhật và message
 */
const createYeuCauHuySKController = async (req, res) => {
  const { suKienID, lyDoHuy } = req.body;
  const nguoiYeuCau = req.user;
  const suKienUpdated = await yeuCauHuySKService.createYeuCauHuySK(
    suKienID,
    lyDoHuy,
    nguoiYeuCau
  );
  createdResponse(
    res,
    { suKienUpdated },
    'Yêu cầu hủy sự kiện đã được tạo thành công và đang chờ duyệt.'
  );
};

/**
 * Duyệt yêu cầu hủy sự kiện.
 * Đầu vào: req.params.id (ID yêu cầu), req.body (ghiChuBGH - optional), req.user
 * Đầu ra: Response trả về kết quả duyệt yêu cầu
 */
const duyetYeuCauHuySKController = async (req, res) => {
  const ycHuySkID = parseInt(req.params.id, 10);
  const payload = req.body;
  const nguoiDuyet = req.user;
  const result = await yeuCauHuySKService.duyetYeuCauHuySK(
    ycHuySkID,
    payload,
    nguoiDuyet
  );
  okResponse(res, result, 'Duyệt yêu cầu hủy sự kiện thành công.');
};

/**
 * Từ chối yêu cầu hủy sự kiện.
 * Đầu vào: req.params.id (ID yêu cầu), req.body (lyDoTuChoiHuyBGH - required), req.user
 * Đầu ra: Response trả về kết quả từ chối yêu cầu
 */
const tuChoiYeuCauHuySKController = async (req, res) => {
  const ycHuySkID = parseInt(req.params.id, 10);
  const payload = req.body;
  const nguoiDuyet = req.user;
  const result = await yeuCauHuySKService.tuChoiYeuCauHuySK(
    ycHuySkID,
    payload,
    nguoiDuyet
  );
  okResponse(res, result, 'Từ chối yêu cầu hủy sự kiện thành công.');
};

const thuHoiYeuCauHuySKController = async (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;
  const result = await yeuCauHuySKService.thuHoiYeuCauHuySK(
    parseInt(id, 10),
    currentUser
  );
  okResponse(res, result, 'Thu hồi yêu cầu hủy sự kiện thành công.');
};

export const yeuCauHuySKController = {
  getYeuCauHuySKsController,
  getYeuCauHuySKDetailController,
  createYeuCauHuySKController,
  duyetYeuCauHuySKController,
  tuChoiYeuCauHuySKController,
  thuHoiYeuCauHuySKController,
};
