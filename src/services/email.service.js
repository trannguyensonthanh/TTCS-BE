import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const handlebarOptions = {
  viewEngine: {
    extname: '.hbs',
    partialsDir: path.join(__dirname, '../templates/email/partials'),
    layoutsDir: path.join(__dirname, '../templates/email/layouts'),
    defaultLayout: 'main',
  },
  viewPath: path.join(__dirname, '../templates/email'),
  extName: '.hbs',
};

transporter.use('compile', hbs(handlebarOptions));

const sendEmail = async (to, subject, templateName, context) => {
  const mailOptions = {
    from: `"PTIT Event Booking" <${
      process.env.EMAIL_FROM || process.env.EMAIL_USER
    }>`,
    to,
    subject,
    template: templateName,
    context: {
      ...context,
      logoUrl:
        process.env.LOGO_URL ||
        'https://ptit.edu.vn/wp-content/uploads/2024/08/logo-PTIT-1240x1536.jpg',
      ptitHomepageUrl:
        process.env.PTIT_HOMEPAGE_URL || 'https://ptithcm.edu.vn',
      supportPageUrl: process.env.SUPPORT_PAGE_URL || '#',
      currentYear: new Date().getFullYear(),
    },
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(
      `Email sent to ${to} using template ${templateName} with layout.`
    );
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
  }
};

const OTP_EXPIRY_MINUTES = 10;

const sendOtpEmail = async (email, userName, otp) => {
  const subject = 'PTIT Event Booking - Yêu Cầu Đặt Lại Mật Khẩu';
  await sendEmail(email, subject, 'resetPassword.template', {
    title: 'Đặt Lại Mật Khẩu',
    userName,
    otp,
    otpExpiryMinutes: OTP_EXPIRY_MINUTES,
    email,
    resetPasswordPageUrl: `${process.env.FRONTEND_URL}/reset-password`,
  });
};

const sendWelcomeEmail = async (
  email,
  userName,
  loginName,
  initialPassword
) => {
  const subject = 'Chào mừng bạn đến với Hệ thống Quản lý Sự kiện PTITHCM!';
  await sendEmail(email, subject, 'welcome.template', {
    title: 'Chào Mừng Thành Viên Mới',
    userName,
    loginName,
    initialPassword,
    loginPageUrl: `${process.env.FRONTEND_URL}/login`,
  });
};

/**
 * [MỚI] Gửi email mời tham gia sự kiện.
 * @param {string} email - Email người nhận
 * @param {object} nguoiDuocMoi - { hoTen }
 * @param {object} suKien - { tenSK, donViChuTri: { tenDonVi }, thoiGianBatDau, thoiGianKetThuc, diaDiem }
 * @param {object} loiMoi - { vaiTroDuKienSK, ghiChuMoi }
 * @returns {Promise<void>}
 */
const sendEventInvitationEmail = async (
  email,
  nguoiDuocMoi,
  suKien,
  loiMoi
) => {
  const subject = `PTIT Event Booking - Thư Mời Tham Gia Sự Kiện: ${suKien.tenSK}`;
  const context = {
    title: 'Thư Mời Tham Gia Sự Kiện',
    nguoiDuocMoi,
    suKien,
    ...loiMoi, // vaiTroDuKienSK, ghiChuMoi
    // Link để người dùng có thể xem và phản hồi lời mời
    phanHoiMoiUrl: `${process.env.FRONTEND_URL}/my-invitations`, // Ví dụ
  };
  await sendEmail(email, subject, 'eventInvitation.template', context);
};

export default {
  sendEmail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendEventInvitationEmail,
};
