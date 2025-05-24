// src/services/email.service.js
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
    partialsDir: path.join(__dirname, '../templates/email/partials'), // Đúng đường dẫn
    layoutsDir: path.join(__dirname, '../templates/email/layouts'), // Đúng đường dẫn
    defaultLayout: 'main', // Chỉ định layout mặc định là 'main.hbs'
  },
  viewPath: path.join(__dirname, '../templates/email'), // Thư mục chứa các view chính (resetPassword.hbs, welcome.hbs)
  extName: '.hbs',
};

transporter.use('compile', hbs(handlebarOptions));

const sendEmail = async (to, subject, templateName, context) => {
  const mailOptions = {
    from: `"PTIT Event Booking" <${
      process.env.EMAIL_FROM || process.env.EMAIL_USER
    }>`,
    to: to,
    subject: subject,
    template: templateName, // Tên file template (không có .hbs)
    context: {
      ...context,
      // Truyền các biến dùng chung cho layout và partials vào đây
      logoUrl:
        process.env.LOGO_URL ||
        'https://ptit.edu.vn/wp-content/uploads/2024/08/logo-PTIT-1240x1536.jpg', // Lấy từ .env
      ptitHomepageUrl:
        process.env.PTIT_HOMEPAGE_URL || 'https://ptithcm.edu.vn',
      supportPageUrl: process.env.SUPPORT_PAGE_URL || '#', // Link trang hỗ trợ
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
    title: 'Đặt Lại Mật Khẩu', // Tiêu đề cho thẻ <title> trong layout
    userName: userName,
    otp: otp,
    otpExpiryMinutes: OTP_EXPIRY_MINUTES,
    email: email,
    resetPasswordPageUrl: `${process.env.FRONTEND_URL}/reset-password`, // Ví dụ
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
    title: 'Chào Mừng Thành Viên Mới', // Tiêu đề cho thẻ <title>
    userName: userName,
    loginName: loginName,
    initialPassword: initialPassword,
    loginPageUrl: `${process.env.FRONTEND_URL}/login`,
  });
};

export default {
  sendEmail,
  sendOtpEmail,
  sendWelcomeEmail,
};
