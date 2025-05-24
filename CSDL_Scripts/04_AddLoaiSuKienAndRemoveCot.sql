-- Sử dụng database cụ thể
USE [PTIT_EventRoomBooking];
GO

-- ====================================================================================
-- 1. SỬA ĐỔI BẢNG ThongTinSinhVien: XÓA NganhHocID VÀ ChuyenNganhID
-- ====================================================================================
PRINT '1. Modifying table ThongTinSinhVien...';

-- Xóa Foreign Key Constraint của ChuyenNganhID (nếu có)
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ThongTinSinhVien_ChuyenNganh' AND parent_object_id = OBJECT_ID('dbo.ThongTinSinhVien')) -- Thay FK_ThongTinSinhVien_ChuyenNganh bằng tên FK thực tế nếu khác
BEGIN
    ALTER TABLE dbo.ThongTinSinhVien DROP CONSTRAINT FK_ThongTinSinhVien_ChuyenNganh;
    PRINT 'Foreign key constraint for ChuyenNganhID in ThongTinSinhVien dropped.';
END

-- Xóa Foreign Key Constraint của NganhHocID (nếu có)
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ThongTinSinhVien_NganhHoc' AND parent_object_id = OBJECT_ID('dbo.ThongTinSinhVien')) -- Thay FK_ThongTinSinhVien_NganhHoc bằng tên FK thực tế nếu khác
BEGIN
    ALTER TABLE dbo.ThongTinSinhVien DROP CONSTRAINT FK_ThongTinSinhVien_NganhHoc;
    PRINT 'Foreign key constraint for NganhHocID in ThongTinSinhVien dropped.';
END

-- Xóa cột ChuyenNganhID
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.ThongTinSinhVien') AND name = 'ChuyenNganhID')
BEGIN
    ALTER TABLE dbo.ThongTinSinhVien DROP COLUMN ChuyenNganhID;
    PRINT 'Column ChuyenNganhID dropped from ThongTinSinhVien.';
END
ELSE
    PRINT 'Column ChuyenNganhID does not exist in ThongTinSinhVien.';

-- Xóa cột NganhHocID
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.ThongTinSinhVien') AND name = 'NganhHocID')
BEGIN
    ALTER TABLE dbo.ThongTinSinhVien DROP COLUMN NganhHocID;
    PRINT 'Column NganhHocID dropped from ThongTinSinhVien.';
END
ELSE
    PRINT 'Column NganhHocID does not exist in ThongTinSinhVien.';

PRINT 'Table ThongTinSinhVien modified successfully.';
GO

-- ====================================================================================
-- 2. TẠO BẢNG MỚI: LoaiSuKien
-- ====================================================================================
PRINT '2. Creating table LoaiSuKien...';
IF OBJECT_ID('dbo.LoaiSuKien', 'U') IS NOT NULL
BEGIN
    PRINT 'Table LoaiSuKien already exists. Skipping creation.';
END
ELSE
BEGIN
    CREATE TABLE dbo.LoaiSuKien (
        LoaiSuKienID INT PRIMARY KEY IDENTITY(1,1),
        MaLoaiSK VARCHAR(50) NOT NULL UNIQUE,       -- VD: 'HOI_THAO_KH', 'VAN_NGHE', 'THE_THAO'
        TenLoaiSK NVARCHAR(150) NOT NULL,           -- VD: 'Hội thảo Khoa học', 'Văn nghệ Chào tân Sinh viên'
        MoTaLoaiSK NVARCHAR(500) NULL,
        IsActive BIT NOT NULL DEFAULT 1             -- Loại sự kiện này có còn được sử dụng không
    );
    PRINT 'Table LoaiSuKien created successfully.';
END
GO

-- ====================================================================================
-- 3. SỬA ĐỔI BẢNG SuKien: THÊM LoaiSuKienID
-- ====================================================================================
PRINT '3. Modifying table SuKien to add LoaiSuKienID column...';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.SuKien') AND name = 'LoaiSuKienID')
BEGIN
    ALTER TABLE dbo.SuKien
    ADD LoaiSuKienID INT NULL; -- Có thể NULL nếu một số sự kiện không bắt buộc phải có loại

    ALTER TABLE dbo.SuKien
    ADD CONSTRAINT FK_SuKien_LoaiSuKien FOREIGN KEY (LoaiSuKienID) REFERENCES dbo.LoaiSuKien(LoaiSuKienID);

    PRINT 'Column LoaiSuKienID added to SuKien and foreign key created.';
END
ELSE
BEGIN
    PRINT 'Column LoaiSuKienID already exists in SuKien.';
    -- Nếu cột đã tồn tại nhưng chưa có FK, bạn có thể thêm FK riêng ở đây
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_SuKien_LoaiSuKien' AND parent_object_id = OBJECT_ID('dbo.SuKien'))
    BEGIN
        ALTER TABLE dbo.SuKien
        ADD CONSTRAINT FK_SuKien_LoaiSuKien FOREIGN KEY (LoaiSuKienID) REFERENCES dbo.LoaiSuKien(LoaiSuKienID);
        PRINT 'Foreign key FK_SuKien_LoaiSuKien created for existing LoaiSuKienID column.';
    END
END
GO

PRINT 'Database structure update completed.';
GO

-- ====================================================================================
-- 4. (TÙY CHỌN) THÊM DỮ LIỆU MẪU CHO LoaiSuKien
-- ====================================================================================
PRINT '4. Seeding LoaiSuKien table (optional)...';
IF NOT EXISTS (SELECT 1 FROM dbo.LoaiSuKien WHERE MaLoaiSK = 'HOI_THAO')
    INSERT INTO dbo.LoaiSuKien (MaLoaiSK, TenLoaiSK, MoTaLoaiSK) VALUES ('HOI_THAO', N'Hội thảo / Hội nghị', N'Các sự kiện học thuật, chia sẻ kiến thức');
IF NOT EXISTS (SELECT 1 FROM dbo.LoaiSuKien WHERE MaLoaiSK = 'VAN_NGHE')
    INSERT INTO dbo.LoaiSuKien (MaLoaiSK, TenLoaiSK, MoTaLoaiSK) VALUES ('VAN_NGHE', N'Văn hóa - Văn nghệ', N'Các chương trình biểu diễn nghệ thuật, giao lưu văn hóa');
IF NOT EXISTS (SELECT 1 FROM dbo.LoaiSuKien WHERE MaLoaiSK = 'THE_THAO')
    INSERT INTO dbo.LoaiSuKien (MaLoaiSK, TenLoaiSK, MoTaLoaiSK) VALUES ('THE_THAO', N'Thể dục - Thể thao', N'Các giải đấu, hoạt động thể chất');
IF NOT EXISTS (SELECT 1 FROM dbo.LoaiSuKien WHERE MaLoaiSK = 'TUYEN_DUNG')
    INSERT INTO dbo.LoaiSuKien (MaLoaiSK, TenLoaiSK, MoTaLoaiSK) VALUES ('TUYEN_DUNG', N'Ngày hội Tuyển dụng', N'Sự kiện kết nối doanh nghiệp và sinh viên');
IF NOT EXISTS (SELECT 1 FROM dbo.LoaiSuKien WHERE MaLoaiSK = 'WORKSHOP')
    INSERT INTO dbo.LoaiSuKien (MaLoaiSK, TenLoaiSK, MoTaLoaiSK) VALUES ('WORKSHOP', N'Workshop / Tập huấn', N'Buổi thực hành, đào tạo kỹ năng');
IF NOT EXISTS (SELECT 1 FROM dbo.LoaiSuKien WHERE MaLoaiSK = 'KHAC')
    INSERT INTO dbo.LoaiSuKien (MaLoaiSK, TenLoaiSK, MoTaLoaiSK) VALUES ('KHAC', N'Sự kiện Khác', N'Các loại sự kiện không thuộc nhóm trên');
PRINT 'LoaiSuKien seeding completed.';
GO