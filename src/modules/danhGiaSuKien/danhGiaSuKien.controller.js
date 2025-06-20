import { danhGiaSuKienService } from './danhGiaSuKien.service.js';
import {
  createdResponse,
  noContentResponse,
  okResponse,
} from '../../utils/response.util.js';

const submitEventRatingController = async (req, res) => {
  const payload = req.body;
  const currentUser = req.user;
  const result = await danhGiaSuKienService.submitEventRating(
    payload,
    currentUser
  );
  createdResponse(res, result, 'Gửi đánh giá thành công.');
};

const updateEventRatingController = async (req, res) => {
  const { danhGiaSkID } = req.params;
  const payload = req.body;
  const currentUser = req.user;
  const result = await danhGiaSuKienService.updateEventRating(
    parseInt(danhGiaSkID, 10),
    payload,
    currentUser
  );
  okResponse(res, result, 'Cập nhật đánh giá thành công.');
};

const deleteEventRatingController = async (req, res) => {
  const { danhGiaSkID } = req.params;
  const currentUser = req.user;
  await danhGiaSuKienService.deleteEventRating(
    parseInt(danhGiaSkID, 10),
    currentUser
  );
  noContentResponse(res); // Trả về 204 No Content
};

export const danhGiaSuKienController = {
  submitEventRatingController,
  updateEventRatingController,
  deleteEventRatingController,
};
