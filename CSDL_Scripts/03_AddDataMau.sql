-- Sử dụng database cụ thể
USE [PTIT_EventRoomBooking];
GO

-- ====================================================================================
-- PHẦN 0: THÊM DỮ LIỆU MẪU CHO CÁC BẢNG THAM CHIẾU (NẾU CHƯA CÓ)
-- (Giữ nguyên như script trước, đảm bảo DonVi và VaiTroHeThong đã có dữ liệu)
-- ====================================================================================
PRINT '0. Ensuring reference data exists (DonVi, VaiTroHeThong, NganhHoc, LopHoc)...';
-- (Script seeding cho DonVi, VaiTroHeThong, NganhHoc, LopHoc giữ nguyên như trước)
-- ... (Copy phần 0 từ script trước vào đây nếu bạn chạy script này độc lập) ...
-- Để ngắn gọn, tôi sẽ không lặp lại phần 0 ở đây.
GO

-- ====================================================================================
-- PHẦN 1: TẠO DỮ LIỆU MẪU CHO NGƯỜI DÙNG, TÀI KHOẢN VÀ GÁN VAI TRÒ
-- Mật khẩu cho tất cả: Password123@
-- Đăng nhập bằng Email.
-- ====================================================================================
PRINT '1. Seeding NguoiDung, TaiKhoan, and NguoiDung_VaiTro tables (Login via Email)...';

DECLARE @AdminEmail_Final_V2 VARCHAR(150) = 'sonthanhit35@gmail.com';
DECLARE @BiThuDoanEmail_Final_V2 VARCHAR(150) = 'sonthanh12345678910@gmail.com';
DECLARE @QuanLyCsvcEmail_Final_V2 VARCHAR(150) = 'sonthanh1234567891011@gmail.com';
DECLARE @BghEmail_Final_V2 VARCHAR(150) = 'sonthanh123456789101112@gmail.com';
DECLARE @CbToChucSkEmail_Final_V2 VARCHAR(150) = 'sonthanh030504@gmail.com';


DECLARE @TestSalt_Final_V2 VARCHAR(100) = '$2a$10$cccccccccccccccccccccc'; -- Sử dụng salt mới để phân biệt
DECLARE @TestMatKhauHash_Final_V2 VARCHAR(255) = '$2a$10$ccccccccccccccccccccccuB1j3XTBz0G2w1eFq9s0.5D.V0C/Lq6'; -- Hash của 'Password123@' với salt trên

-- Biến lưu NguoiDungID
DECLARE @NguoiDungID_Admin_Final_V2 INT;
DECLARE @NguoiDungID_BiThuDoan_Final_V2 INT;
DECLARE @NguoiDungID_QuanLyCsvc_Final_V2 INT;
DECLARE @NguoiDungID_Bgh_Final_V2 INT;
DECLARE @NguoiDungID_CbToChucSk_Final_V2 INT;

-- Biến lưu VaiTroID
DECLARE @VaiTroID_Admin_Final_V2 INT = (SELECT VaiTroID FROM dbo.VaiTroHeThong WHERE MaVaiTro = 'ADMIN_HE_THONG');
DECLARE @VaiTroID_Bgh_Final_V2 INT = (SELECT VaiTroID FROM dbo.VaiTroHeThong WHERE MaVaiTro = 'BGH_DUYET_SK_TRUONG');
DECLARE @VaiTroID_QuanLyCsvc_Final_V2 INT = (SELECT VaiTroID FROM dbo.VaiTroHeThong WHERE MaVaiTro = 'QUAN_LY_CSVC');
DECLARE @VaiTroID_BiThuDoan_Final_V2 INT = (SELECT VaiTroID FROM dbo.VaiTroHeThong WHERE MaVaiTro = 'BI_THU_DOAN');
DECLARE @VaiTroID_CbToChucSk_Final_V2 INT = (SELECT VaiTroID FROM dbo.VaiTroHeThong WHERE MaVaiTro = 'CB_TO_CHUC_SU_KIEN');


-- Biến lưu DonViID
DECLARE @DonViID_Bgh_Final_V2 INT = (SELECT DonViID FROM dbo.DonVi WHERE MaDonVi = 'BGH_PTIT');
DECLARE @DonViID_Csvc_Final_V2 INT = (SELECT DonViID FROM dbo.DonVi WHERE MaDonVi = 'P_CSVC');
DECLARE @DonViID_DoanTruong_Final_V2 INT = (SELECT DonViID FROM dbo.DonVi WHERE MaDonVi = 'DOAN_TRUONG');
DECLARE @DonViID_KhoaCntt_Final_V2 INT = (SELECT DonViID FROM dbo.DonVi WHERE MaDonVi = 'K_CNTT');
DECLARE @DonViID_Pctsv_Final_V2 INT = (SELECT DonViID FROM dbo.DonVi WHERE MaDonVi = 'P_CTSK');


-- 1. Tài khoản ADMIN_HE_THONG
IF NOT EXISTS (SELECT 1 FROM dbo.NguoiDung WHERE Email = @AdminEmail_Final_V2)
BEGIN
    INSERT INTO dbo.NguoiDung (MaDinhDanh, HoTen, Email, SoDienThoai, IsActive)
    VALUES ('ADMIN001F2', N'Quản Trị Viên Chính V2', @AdminEmail_Final_V2, '0912345011', 1);
    SET @NguoiDungID_Admin_Final_V2 = SCOPE_IDENTITY();

    INSERT INTO dbo.TaiKhoan (NguoiDungID, MatKhauHash, Salt, TrangThaiTk) -- Không còn TenDangNhap
    VALUES (@NguoiDungID_Admin_Final_V2, @TestMatKhauHash_Final_V2, @TestSalt_Final_V2, 'Active');

    IF @VaiTroID_Admin_Final_V2 IS NOT NULL
        INSERT INTO dbo.NguoiDung_VaiTro (NguoiDungID, VaiTroID, DonViID, NgayBatDau)
        VALUES (@NguoiDungID_Admin_Final_V2, @VaiTroID_Admin_Final_V2, NULL, GETDATE());
    PRINT 'Admin user V2 created.';
END
ELSE
BEGIN
    SET @NguoiDungID_Admin_Final_V2 = (SELECT NguoiDungID FROM dbo.NguoiDung WHERE Email = @AdminEmail_Final_V2);
    PRINT 'Admin user V2 already exists.';
END

-- 2. Tài khoản BI_THU_DOAN (Giảng viên kiêm Bí thư Đoàn Trường)
IF NOT EXISTS (SELECT 1 FROM dbo.NguoiDung WHERE Email = @BiThuDoanEmail_Final_V2)
BEGIN
    INSERT INTO dbo.NguoiDung (MaDinhDanh, HoTen, Email, SoDienThoai, IsActive)
    VALUES ('GVBTD001F2', N'Nguyễn Thanh Đoàn V2', @BiThuDoanEmail_Final_V2, '0912345012', 1);
    SET @NguoiDungID_BiThuDoan_Final_V2 = SCOPE_IDENTITY();

    INSERT INTO dbo.TaiKhoan (NguoiDungID, MatKhauHash, Salt, TrangThaiTk) -- Không còn TenDangNhap
    VALUES (@NguoiDungID_BiThuDoan_Final_V2, @TestMatKhauHash_Final_V2, @TestSalt_Final_V2, 'Active');

    -- Thêm thông tin giảng viên
    IF @DonViID_KhoaCntt_Final_V2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.ThongTinGiangVien WHERE NguoiDungID = @NguoiDungID_BiThuDoan_Final_V2)
        INSERT INTO dbo.ThongTinGiangVien (NguoiDungID, MaGiangVien, DonViCongTacID, HocVi, ChucDanhGD)
        VALUES (@NguoiDungID_BiThuDoan_Final_V2, 'GVBTD001F2', @DonViID_KhoaCntt_Final_V2, N'Thạc sĩ', N'Giảng viên');

    -- Gán vai trò chức năng Bí thư Đoàn Trường
    IF @VaiTroID_BiThuDoan_Final_V2 IS NOT NULL AND @DonViID_DoanTruong_Final_V2 IS NOT NULL
        INSERT INTO dbo.NguoiDung_VaiTro (NguoiDungID, VaiTroID, DonViID, NgayBatDau)
        VALUES (@NguoiDungID_BiThuDoan_Final_V2, @VaiTroID_BiThuDoan_Final_V2, @DonViID_DoanTruong_Final_V2, GETDATE());
    PRINT 'Bi Thu Doan (Lecturer) V2 user created and functional role assigned.';
END
ELSE
BEGIN
    SET @NguoiDungID_BiThuDoan_Final_V2 = (SELECT NguoiDungID FROM dbo.NguoiDung WHERE Email = @BiThuDoanEmail_Final_V2);
    PRINT 'Bi Thu Doan (Lecturer) V2 user already exists.';
END


-- 3. Tài khoản QUAN_LY_CSVC (Nhân viên Phòng CSVC)
IF NOT EXISTS (SELECT 1 FROM dbo.NguoiDung WHERE Email = @QuanLyCsvcEmail_Final_V2)
BEGIN
    INSERT INTO dbo.NguoiDung (MaDinhDanh, HoTen, Email, SoDienThoai, IsActive)
    VALUES ('CSVC001F2', N'Trần Thị Vật Chất V2', @QuanLyCsvcEmail_Final_V2, '0912345013', 1);
    SET @NguoiDungID_QuanLyCsvc_Final_V2 = SCOPE_IDENTITY();

    INSERT INTO dbo.TaiKhoan (NguoiDungID, MatKhauHash, Salt, TrangThaiTk) -- Không còn TenDangNhap
    VALUES (@NguoiDungID_QuanLyCsvc_Final_V2, @TestMatKhauHash_Final_V2, @TestSalt_Final_V2, 'Active');

    -- Gán vai trò chức năng Quản lý CSVC
    IF @VaiTroID_QuanLyCsvc_Final_V2 IS NOT NULL AND @DonViID_Csvc_Final_V2 IS NOT NULL
        INSERT INTO dbo.NguoiDung_VaiTro (NguoiDungID, VaiTroID, DonViID, NgayBatDau)
        VALUES (@NguoiDungID_QuanLyCsvc_Final_V2, @VaiTroID_QuanLyCsvc_Final_V2, @DonViID_Csvc_Final_V2, GETDATE());
    PRINT 'Quan Ly CSVC (Staff) V2 user created and functional role assigned.';
END
ELSE
BEGIN
    SET @NguoiDungID_QuanLyCsvc_Final_V2 = (SELECT NguoiDungID FROM dbo.NguoiDung WHERE Email = @QuanLyCsvcEmail_Final_V2);
    PRINT 'Quan Ly CSVC (Staff) V2 user already exists.';
END

-- 4. Tài khoản BGH_DUYET_SK_TRUONG (Giảng viên trong BGH)
IF NOT EXISTS (SELECT 1 FROM dbo.NguoiDung WHERE Email = @BghEmail_Final_V2)
BEGIN
    INSERT INTO dbo.NguoiDung (MaDinhDanh, HoTen, Email, SoDienThoai, IsActive)
    VALUES ('GVBGH001F2', N'Lê Ban Giám Hiệu V2', @BghEmail_Final_V2, '0912345014', 1);
    SET @NguoiDungID_Bgh_Final_V2 = SCOPE_IDENTITY();

    INSERT INTO dbo.TaiKhoan (NguoiDungID, MatKhauHash, Salt, TrangThaiTk) -- Không còn TenDangNhap
    VALUES (@NguoiDungID_Bgh_Final_V2, @TestMatKhauHash_Final_V2, @TestSalt_Final_V2, 'Active');

    -- Thêm thông tin giảng viên
     IF @DonViID_KhoaCntt_Final_V2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.ThongTinGiangVien WHERE NguoiDungID = @NguoiDungID_Bgh_Final_V2)
        INSERT INTO dbo.ThongTinGiangVien (NguoiDungID, MaGiangVien, DonViCongTacID, HocVi, HocHam, ChucDanhGD)
        VALUES (@NguoiDungID_Bgh_Final_V2, 'GVBGH001F2', @DonViID_KhoaCntt_Final_V2, N'Tiến sĩ', N'Phó Giáo sư', N'Giảng viên Cao cấp');

    -- Gán vai trò chức năng BGH duyệt SK
    IF @VaiTroID_Bgh_Final_V2 IS NOT NULL AND @DonViID_Bgh_Final_V2 IS NOT NULL
        INSERT INTO dbo.NguoiDung_VaiTro (NguoiDungID, VaiTroID, DonViID, NgayBatDau)
        VALUES (@NguoiDungID_Bgh_Final_V2, @VaiTroID_Bgh_Final_V2, @DonViID_Bgh_Final_V2, GETDATE());
    PRINT 'BGH user (Lecturer) V2 created and functional role assigned.';
END
ELSE
BEGIN
    SET @NguoiDungID_Bgh_Final_V2 = (SELECT NguoiDungID FROM dbo.NguoiDung WHERE Email = @BghEmail_Final_V2);
    PRINT 'BGH user (Lecturer) V2 already exists.';
END

-- 5. Tài khoản CB_TO_CHUC_SU_KIEN (Nhân viên Phòng CTSV)
IF NOT EXISTS (SELECT 1 FROM dbo.NguoiDung WHERE Email = @CbToChucSkEmail_Final_V2)
BEGIN
    INSERT INTO dbo.NguoiDung (MaDinhDanh, HoTen, Email, SoDienThoai, IsActive)
    VALUES ('CBCTSV001F2', N'Phạm Thị Kế Hoạch V2', @CbToChucSkEmail_Final_V2, '0912345015', 1);
    SET @NguoiDungID_CbToChucSk_Final_V2 = SCOPE_IDENTITY();

    INSERT INTO dbo.TaiKhoan (NguoiDungID, MatKhauHash, Salt, TrangThaiTk) -- Không còn TenDangNhap
    VALUES (@NguoiDungID_CbToChucSk_Final_V2, @TestMatKhauHash_Final_V2, @TestSalt_Final_V2, 'Active');

    -- Gán vai trò chức năng Cán bộ Tổ chức Sự kiện cho Phòng CTSV
    IF @VaiTroID_CbToChucSk_Final_V2 IS NOT NULL AND @DonViID_Pctsv_Final_V2 IS NOT NULL
    BEGIN
        INSERT INTO dbo.NguoiDung_VaiTro (NguoiDungID, VaiTroID, DonViID, NgayBatDau)
        VALUES (@NguoiDungID_CbToChucSk_Final_V2, @VaiTroID_CbToChucSk_Final_V2, @DonViID_Pctsv_Final_V2, GETDATE());
        PRINT 'CB_TO_CHUC_SU_KIEN user (Staff of P_CTSV) V2 created and functional role assigned.';
    END
    ELSE
    BEGIN
        PRINT 'CB_TO_CHUC_SU_KIEN user V2 created, but CB_TO_CHUC_SU_KIEN role or P_CTSV unit not found. Role not assigned.';
    END
END
ELSE
BEGIN
    SET @NguoiDungID_CbToChucSk_Final_V2 = (SELECT NguoiDungID FROM dbo.NguoiDung WHERE Email = @CbToChucSkEmail_Final_V2);
    -- Kiểm tra và gán vai trò nếu người dùng đã tồn tại nhưng chưa có vai trò này
    IF @VaiTroID_CbToChucSk_Final_V2 IS NOT NULL AND @DonViID_Pctsv_Final_V2 IS NOT NULL AND
       NOT EXISTS (SELECT 1 FROM dbo.NguoiDung_VaiTro
                   WHERE NguoiDungID = @NguoiDungID_CbToChucSk_Final_V2
                     AND VaiTroID = @VaiTroID_CbToChucSk_Final_V2
                     AND DonViID = @DonViID_Pctsv_Final_V2)
    BEGIN
        INSERT INTO dbo.NguoiDung_VaiTro (NguoiDungID, VaiTroID, DonViID, NgayBatDau)
        VALUES (@NguoiDungID_CbToChucSk_Final_V2, @VaiTroID_CbToChucSk_Final_V2, @DonViID_Pctsv_Final_V2, GETDATE());
        PRINT 'CB_TO_CHUC_SU_KIEN role assigned to existing V2 user (Staff of P_CTSV).';
    END
    ELSE
    BEGIN
         PRINT 'CB_TO_CHUC_SU_KIEN user (Staff of P_CTSV) V2 already exists, and role might already be assigned or dependencies missing.';
    END
END

GO
PRINT 'User, Account, Profile Info, and Functional Role Assignment V2 seeding completed.';
GO