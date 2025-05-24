-- Sử dụng database cụ thể
USE [PTIT_EventRoomBooking];
GO

PRINT '====================================================================================';
PRINT 'Modifying table SuKien to add TgBatDauThucTe and TgKetThucThucTe columns...';
PRINT '====================================================================================';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.SuKien') AND name = 'TgBatDauThucTe')
BEGIN
    ALTER TABLE dbo.SuKien
    ADD TgBatDauThucTe DATETIME NULL;
    PRINT 'Column TgBatDauThucTe added to SuKien.';
END
ELSE
BEGIN
    PRINT 'Column TgBatDauThucTe already exists in SuKien.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.SuKien') AND name = 'TgKetThucThucTe')
BEGIN
    ALTER TABLE dbo.SuKien
    ADD TgKetThucThucTe DATETIME NULL;
    PRINT 'Column TgKetThucThucTe added to SuKien.';
END
ELSE
BEGIN
    PRINT 'Column TgKetThucThucTe already exists in SuKien.';
END
GO

PRINT 'SuKien table modification for actual times completed.';
GO