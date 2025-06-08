// src/jobs/eventStatusManager.job.js
import cron from 'node-cron';
import logger from '../utils/logger.util.js';
import { suKienService } from '../modules/suKien/suKien.service.js';
import { yeuCauMuonPhongService } from '../modules/yeuCauMuonPhong/yeuCauMuonPhong.service.js';

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
      await yeuCauMuonPhongService.sendRemindersForOverdueCSVCProcessing();
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
 * Khởi động tất cả các scheduled jobs quản lý trạng thái sự kiện và yêu cầu phòng.
 * Đầu vào: không
 * Đầu ra: không
 */
export const startScheduledJobs = () => {
  scheduleBGHOverdueChecks();
  scheduleCSVCOverdueChecks();
  scheduleEventCompletionChecks();
  logger.info(
    'Scheduled jobs for event and room request status management have been started.'
  );
};
