// src/jobs/eventStatusManager.job.js
import cron from 'node-cron';
import logger from '../utils/logger.util.js';
import { suKienService } from '../modules/suKien/suKien.service.js';
import { yeuCauMuonPhongService } from '../modules/yeuCauMuonPhong/yeuCauMuonPhong.service.js';
import { phongCRUDService } from '../modules/phongCRUD/phongCRUD.service.js';
import { yeuCauHuySKService } from '../modules/yeuCauHuySK/yeuCauHuySK.service.js';
import { yeuCauDoiPhongService } from '../modules/yeuCauDoiPhong/yeuCauDoiPhong.service.js';

/**
 * Lên lịch kiểm tra quá hạn duyệt BGH mỗi ngày.
 * Đầu vào: không
 * Đầu ra: không (tự động chạy cron job)
 */
const scheduleBGHOverdueChecks = () => {
  cron.schedule('0 10 * * *', async () => {
    logger.info('CRON JOB: Starting BGH overdue checks...');
    try {
      await suKienService.sendRemindersForOverdueBGHApproval();
      await suKienService.autoCancelOverdueBGHApprovalEvents();
      logger.info('CRON JOB: BGH overdue checks finished.');
    } catch (error) {
      logger.error('CRON JOB: Error during BGH overdue checks:', error);
    }
  });
};

/**
 * Lên lịch kiểm tra quá hạn xử lý CSVC mỗi ngày.
 * Đầu vào: không
 * Đầu ra: không (tự động chạy cron job)
 */
const scheduleCSVCOverdueChecks = () => {
  cron.schedule('01 16 * * *', async () => {
    logger.info('CRON JOB: Starting CSVC overdue checks...');
    try {
      // Nhắc nhở yêu cầu bị quên lãng
      await yeuCauMuonPhongService.sendRemindersForOverdueCSVCProcessing();
      // [THÊM MỚI] Gửi cảnh báo khẩn cấp cho sự kiện sắp diễn ra
      await yeuCauMuonPhongService.sendUrgentRoomAssignmentWarnings();
      // Tự động hủy các sự kiện CSVC quá hạn
      await yeuCauMuonPhongService.autoCancelOverdueRoomAssignmentEvents();
      logger.info('CRON JOB: CSVC overdue checks finished.');
    } catch (error) {
      logger.error('CRON JOB: Error during CSVC overdue checks:', error);
    }
  });
};

/**
 * Lên lịch kiểm tra và cập nhật sự kiện đã hoàn thành mỗi giờ.
 * Đầu vào: không
 * Đầu ra: không (tự động chạy cron job)
 */
const scheduleEventCompletionChecks = () => {
  cron.schedule('5 * * * *', async () => {
    logger.info('CRON JOB: Starting event completion checks...');
    try {
      await suKienService.autoCompleteFinishedEvents();
      logger.info('CRON JOB: Event completion checks finished.');
    } catch (error) {
      logger.error('CRON JOB: Error during event completion checks:', error);
    }
  });
};

/**
 * [MỚI] Lên lịch kiểm tra và cập nhật trạng thái phòng mỗi 5 phút.
 */
const scheduleRoomStatusUpdates = () => {
  // Chạy mỗi 5 phút
  cron.schedule('*/5 * * * *', async () => {
    logger.info('CRON JOB: Starting room status updates...');
    try {
      await phongCRUDService.autoUpdateRoomStatusToInUse();
      await phongCRUDService.autoUpdateRoomStatusToAvailable();
      logger.info('CRON JOB: Room status updates finished.');
    } catch (error) {
      logger.error('CRON JOB: Error during room status updates:', error);
    }
  });
};

/**
 * [MỚI] Lên lịch kiểm tra các yêu cầu hủy/đổi quá hạn.
 */
const scheduleOtherRequestOverdueChecks = () => {
  // Chạy vào 10:04 mỗi sáng
  cron.schedule('4 10 * * *', async () => {
    logger.info('CRON JOB: Starting other request overdue checks...');
    try {
      await yeuCauHuySKService.sendRemindersForOverdueCancelRequests();
      await yeuCauDoiPhongService.sendRemindersForOverdueChangeRoomRequests();
      logger.info('CRON JOB: Other request overdue checks finished.');
    } catch (error) {
      logger.error(
        'CRON JOB: Error during other request overdue checks:',
        error
      );
    }
  });
};

/**
 * Khởi động tất cả các scheduled jobs quản lý trạng thái sự kiện và yêu cầu phòng.
 * Đầu vào: không
 * Đầu ra: không
 */
export const startScheduledJobs = () => {
  scheduleBGHOverdueChecks();
  scheduleCSVCOverdueChecks();
  scheduleEventCompletionChecks();
  scheduleRoomStatusUpdates();
  scheduleOtherRequestOverdueChecks();
  logger.info(
    'Scheduled jobs for event, room request, and room status management have been started.'
  );
};
