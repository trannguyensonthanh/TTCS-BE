![image.png](attachment:2e419796-d9eb-45f4-ba60-0245af126816:image.png)

---

**I. QUẢN LÝ NGƯỜI DÙNG, VAI TRÒ, TÀI KHOẢN, HỌC VỤ (Phiên bản cuối cùng)**

**1. Bảng NguoiDung (Users - Thông tin cá nhân cốt lõi)**

| **Tên cột** | **Kiểu dữ liệu** | **Ràng buộc/Ghi chú**                          |
| ----------- | ---------------- | ---------------------------------------------- |
| NguoiDungID | INT              | PRIMARY KEY, IDENTITY(1,1)                     |
| MaDinhDanh  | VARCHAR(50)      | UNIQUE, NULL (Mã nhân sự/SV chung nếu có)      |
| HoTen       | NVARCHAR(150)    | NOT NULL                                       |
| Email       | VARCHAR(150)     | UNIQUE, NOT NULL                               |
| SoDienThoai | VARCHAR(20)      | UNIQUE, NULL                                   |
| AnhDaiDien  | VARCHAR(500)     | NULL (URL ảnh)                                 |
| NgayTao     | DATETIME         | DEFAULT GETDATE()                              |
| IsActive    | BIT              | DEFAULT 1 (Tài khoản người dùng còn hoạt động) |

**2. Bảng TaiKhoan (Accounts - Thông tin đăng nhập)**

| **Tên cột**     | **Kiểu dữ liệu** | **Ràng buộc/Ghi chú**                                                             |
| --------------- | ---------------- | --------------------------------------------------------------------------------- |
| TaiKhoanID      | INT              | PRIMARY KEY, IDENTITY(1,1)                                                        |
| NguoiDungID     | INT              | NOT NULL, UNIQUE, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID) ON DELETE CASCADE |
| TenDangNhap     | VARCHAR(100)     | NOT NULL, UNIQUE                                                                  |
| MatKhauHash     | VARCHAR(255)     | NOT NULL                                                                          |
| Salt            | VARCHAR(100)     | NOT NULL                                                                          |
| LanDangNhapCuoi | DATETIME         | NULL                                                                              |
| TrangThaiTk     | VARCHAR(50)      | NOT NULL, DEFAULT 'Active' (VD: 'Active', 'Locked', 'Disabled')                   |
| NgayTaoTk       | DATETIME         | DEFAULT GETDATE()                                                                 |

**3. Bảng DonVi (Departments/Units - Khoa, Phòng, Ban, CLB, Bộ môn...)**

| **Tên cột** | **Kiểu dữ liệu** | **Ràng buộc/Ghi chú**                                               |
| ----------- | ---------------- | ------------------------------------------------------------------- |
| DonViID     | INT              | PRIMARY KEY, IDENTITY(1,1)                                          |
| TenDonVi    | NVARCHAR(200)    | NOT NULL, UNIQUE                                                    |
| MaDonVi     | VARCHAR(50)      | UNIQUE, NULL                                                        |
| LoaiDonVi   | NVARCHAR(100)    | NOT NULL (VD: 'KHOA', 'PHONG', 'BAN', 'TRUNG_TAM', 'BO_MON', 'CLB') |
| DonViChaID  | INT              | NULL, FOREIGN KEY REFERENCES DonVi(DonViID)                         |
| MoTaDv      | NVARCHAR(500)    | NULL                                                                |

**4. Bảng NganhHoc (Academic Programs/Majors)**

| **Tên cột**   | **Kiểu dữ liệu** | **Ràng buộc/Ghi chú**                           |
| ------------- | ---------------- | ----------------------------------------------- |
| NganhHocID    | INT              | PRIMARY KEY, IDENTITY(1,1)                      |
| TenNganhHoc   | NVARCHAR(200)    | NOT NULL, UNIQUE                                |
| MaNganhHoc    | VARCHAR(50)      | UNIQUE, NULL                                    |
| KhoaQuanLyID  | INT              | NOT NULL, FOREIGN KEY REFERENCES DonVi(DonViID) |
| MoTaNH        | NVARCHAR(MAX)    | NULL                                            |
| CoChuyenNganh | BIT              | NOT NULL, DEFAULT 0                             |

**5. Bảng ChuyenNganh (Specializations)**

| **Tên cột**    | **Kiểu dữ liệu** | **Ràng buộc/Ghi chú**                                 |
| -------------- | ---------------- | ----------------------------------------------------- |
| ChuyenNganhID  | INT              | PRIMARY KEY, IDENTITY(1,1)                            |
| TenChuyenNganh | NVARCHAR(200)    | NOT NULL                                              |
| MaChuyenNganh  | VARCHAR(50)      | UNIQUE, NULL                                          |
| NganhHocID     | INT              | NOT NULL, FOREIGN KEY REFERENCES NganhHoc(NganhHocID) |
| MoTaCN         | NVARCHAR(MAX)    | NULL                                                  |
|                |                  | UNIQUE (NganhHocID, TenChuyenNganh)                   |

**6. Bảng LopHoc (Classes)**

| **Tên cột**   | **Kiểu dữ liệu** | **Ràng buộc/Ghi chú**                                   |
| ------------- | ---------------- | ------------------------------------------------------- |
| LopID         | INT              | PRIMARY KEY, IDENTITY(1,1)                              |
| TenLop        | NVARCHAR(100)    | NOT NULL, UNIQUE                                        |
| MaLop         | VARCHAR(50)      | UNIQUE, NULL                                            |
| NganhHocID    | INT              | NOT NULL, FOREIGN KEY REFERENCES NganhHoc(NganhHocID)   |
| ChuyenNganhID | INT              | NULL, FOREIGN KEY REFERENCES ChuyenNganh(ChuyenNganhID) |
| NienKhoa      | VARCHAR(50)      | NULL                                                    |

**7. Bảng ThongTinSinhVien (Student Profile Information)**

| **Tên cột**     | **Kiểu dữ liệu** | **Ràng buộc/Ghi chú**                                                        |
| --------------- | ---------------- | ---------------------------------------------------------------------------- |
| NguoiDungID     | INT              | PRIMARY KEY, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID) ON DELETE CASCADE |
| MaSinhVien      | VARCHAR(50)      | NOT NULL, UNIQUE                                                             |
| LopID           | INT              | NOT NULL, FOREIGN KEY REFERENCES LopHoc(LopID)                               |
| KhoaHoc         | VARCHAR(50)      | NULL (VD: 'K2020')                                                           |
| HeDaoTao        | NVARCHAR(100)    | NULL (VD: 'Chính quy', 'Chất lượng cao')                                     |
| NgayNhapHoc     | DATE             | NULL                                                                         |
| TrangThaiHocTap | NVARCHAR(50)     | NULL (VD: 'Đang học', 'Tốt nghiệp', 'Bảo lưu')                               |

**8. Bảng ThongTinGiangVien (Lecturer Profile Information)**

| **Tên cột**    | **Kiểu dữ liệu** | **Ràng buộc/Ghi chú**                                                        |
| -------------- | ---------------- | ---------------------------------------------------------------------------- |
| NguoiDungID    | INT              | PRIMARY KEY, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID) ON DELETE CASCADE |
| MaGiangVien    | VARCHAR(50)      | NOT NULL, UNIQUE                                                             |
| DonViCongTacID | INT              | NOT NULL, FOREIGN KEY REFERENCES DonVi(DonViID) (Khoa/Bộ môn chính)          |
| HocVi          | NVARCHAR(100)    | NULL                                                                         |
| HocHam         | NVARCHAR(100)    | NULL (GS, PGS)                                                               |
| ChucDanhGD     | NVARCHAR(100)    | NULL (Giảng viên, GVC)                                                       |
| ChuyenMonChinh | NVARCHAR(255)    | NULL                                                                         |

**9. Bảng VaiTroHeThong (System Functional Roles - Chỉ chứa các chức vụ/quyền hạn)**

| **Tên cột** | **Kiểu dữ liệu** | **Ràng buộc/Ghi chú**                                                                                                                              |
| ----------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| VaiTroID    | INT              | PRIMARY KEY, IDENTITY(1,1)                                                                                                                         |
| MaVaiTro    | VARCHAR(50)      | NOT NULL, UNIQUE (VD: 'TRUONG_KHOA', 'QUAN_LY_CSVC', 'BGH_DUYET_SK_TRUONG', 'CB_TO_CHUC_SU_KIEN', 'TRUONG_CLB', 'GV_CO_VAN_CLB', 'ADMIN_HE_THONG') |
| TenVaiTro   | NVARCHAR(150)    | NOT NULL                                                                                                                                           |
| MoTaVT      | NVARCHAR(500)    | NULL                                                                                                                                               |

**10. Bảng NguoiDung_VaiTro (User Functional Role Assignments)**

| **Tên cột** | **Kiểu dữ liệu** | **Ràng buộc/Ghi chú**                                                          |
| ----------- | ---------------- | ------------------------------------------------------------------------------ |
| GanVaiTroID | INT              | PRIMARY KEY, IDENTITY(1,1)                                                     |
| NguoiDungID | INT              | NOT NULL, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID)                        |
| VaiTroID    | INT              | NOT NULL, FOREIGN KEY REFERENCES VaiTroHeThong(VaiTroID)                       |
| DonViID     | INT              | NULL, FOREIGN KEY REFERENCES DonVi(DonViID) (Đơn vị nơi vai trò được thực thi) |
| NgayBatDau  | DATE             | NOT NULL, DEFAULT GETDATE()                                                    |
| NgayKetThuc | DATE             | NULL                                                                           |
| GhiChuGanVT | NVARCHAR(500)    | NULL                                                                           |
|             |                  | UNIQUE (NguoiDungID, VaiTroID, DonViID, NgayBatDau)                            |

**II. QUẢN LÝ SỰ KIỆN**

**11. Bảng TrangThaiSK**

| Tên cột       | Kiểu dữ liệu  | Ràng buộc/Ghi chú          |
| ------------- | ------------- | -------------------------- |
| TrangThaiSkID | INT           | PRIMARY KEY, IDENTITY(1,1) |
| MaTrangThai   | VARCHAR(50)   | NOT NULL, UNIQUE           |
| TenTrangThai  | NVARCHAR(150) | NOT NULL                   |
| MoTa          | NVARCHAR(500) | NULL                       |

**12. Bảng SuKien**

| Tên cột             | Kiểu dữ liệu  | Ràng buộc/Ghi chú                                                                             |
| ------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| SuKienID            | INT           | PRIMARY KEY, IDENTITY(1,1)                                                                    |
| TenSK               | NVARCHAR(300) | NOT NULL                                                                                      |
| TgBatDauDK          | DATETIME      | NOT NULL                                                                                      |
| TgKetThucDK         | DATETIME      | NOT NULL                                                                                      |
| NguoiChuTriID       | INT           | NULL, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID)                                           |
| TenChuTriNgoai      | NVARCHAR(150) | NULL                                                                                          |
| DonViChuTriNgoai    | NVARCHAR(200) | NULL                                                                                          |
| DonViChuTriID       | INT           | NOT NULL, FOREIGN KEY REFERENCES DonVi(DonViID)                                               |
| SlThamDuDK          | INT           | NULL                                                                                          |
| MoTaChiTiet         | NVARCHAR(MAX) | NULL                                                                                          |
| TrangThaiSkID       | INT           | NOT NULL, FOREIGN KEY REFERENCES TrangThaiSK(TrangThaiSkID)                                   |
| NguoiTaoID          | INT           | NOT NULL, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID)                                       |
| NgayTaoSK           | DATETIME      | DEFAULT GETDATE()                                                                             |
| NguoiDuyetBGHID     | INT           | NULL, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID)                                           |
| NgayDuyetBGH        | DATETIME      | NULL                                                                                          |
| LyDoTuChoiBGH       | NVARCHAR(MAX) | NULL                                                                                          |
| LyDoHuyNguoiTao     | NVARCHAR(MAX) | NULL                                                                                          |
| IsCongKhaiNoiBo     | BIT           | DEFAULT 0                                                                                     |
| KhachMoiNgoaiGhiChu | NVARCHAR(MAX) | NULL                                                                                          |
|                     |               | CONSTRAINT CK_SK_CoChuTri CHECK ((NguoiChuTriID IS NOT NULL) OR (TenChuTriNgoai IS NOT NULL)) |
| LoaiSuKienID        |               |                                                                                               |

**Bảng LoaiSuKien**

| **Tên cột**  | **Kiểu dữ liệu** | **Ràng buộc/Ghi chú**                                  |
| ------------ | ---------------- | ------------------------------------------------------ |
| LoaiSuKienID | INT              | PRIMARY KEY, IDENTITY(1,1)                             |
| MaLoaiSK     | VARCHAR(50)      | NOT NULL, UNIQUE (VD: 'HOI_THAO_KH', 'VAN_NGHE')       |
| TenLoaiSK    | NVARCHAR(150)    | NOT NULL (VD: 'Hội thảo Khoa học', 'Văn nghệ')         |
| MoTaLoaiSK   | NVARCHAR(500)    | NULL                                                   |
| IsActive     | BIT              | DEFAULT 1 (Loại sự kiện này có còn được sử dụng không) |

**13. Bảng SK_DonViThamGia**

| Tên cột       | Kiểu dữ liệu  | Ràng buộc/Ghi chú                                                   |
| ------------- | ------------- | ------------------------------------------------------------------- |
| SuKienID      | INT           | NOT NULL, FOREIGN KEY REFERENCES SuKien(SuKienID) ON DELETE CASCADE |
| DonViID       | INT           | NOT NULL, FOREIGN KEY REFERENCES DonVi(DonViID)                     |
| VaiTroDonViSK | NVARCHAR(500) | NULL                                                                |
|               |               | PRIMARY KEY (SuKienID, DonViID)                                     |

**14. Bảng SK_MoiThamGia**

| Tên cột        | Kiểu dữ liệu  | Ràng buộc/Ghi chú                                                   |
| -------------- | ------------- | ------------------------------------------------------------------- |
| MoiThamGiaID   | BIGINT        | PRIMARY KEY, IDENTITY(1,1)                                          |
| SuKienID       | INT           | NOT NULL, FOREIGN KEY REFERENCES SuKien(SuKienID) ON DELETE CASCADE |
| NguoiDuocMoiID | INT           | NOT NULL, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID)             |
| VaiTroDuKienSK | NVARCHAR(200) | NULL                                                                |
| IsChapNhanMoi  | BIT           | NULL                                                                |
| TgPhanHoiMoi   | DATETIME      | NULL                                                                |
| GhiChuMoi      | NVARCHAR(500) | NULL                                                                |

---

**III. QUẢN LÝ PHÒNG VÀ YÊU CẦU MƯỢN PHÒNG**

**15. Bảng LoaiPhong**

| Tên cột      | Kiểu dữ liệu  | Ràng buộc/Ghi chú          |
| ------------ | ------------- | -------------------------- |
| LoaiPhongID  | INT           | PRIMARY KEY, IDENTITY(1,1) |
| TenLoaiPhong | NVARCHAR(100) | NOT NULL, UNIQUE           |
| MoTa         | NVARCHAR(255) | NULL                       |

**16. Bảng TrangThaiPhong**

| Tên cột          | Kiểu dữ liệu  | Ràng buộc/Ghi chú          |
| ---------------- | ------------- | -------------------------- |
| TrangThaiPhongID | INT           | PRIMARY KEY, IDENTITY(1,1) |
| TenTrangThai     | NVARCHAR(100) | NOT NULL, UNIQUE           |
| MoTa             | NVARCHAR(255) | NULL                       |

**17. Bảng Phong**

| Tên cột          | Kiểu dữ liệu  | Ràng buộc/Ghi chú                                                 |
| ---------------- | ------------- | ----------------------------------------------------------------- |
| PhongID          | INT           | PRIMARY KEY, IDENTITY(1,1)                                        |
| TenPhong         | NVARCHAR(100) | NOT NULL                                                          |
| MaPhong          | VARCHAR(50)   | UNIQUE, NULL                                                      |
| LoaiPhongID      | INT           | NOT NULL, FOREIGN KEY REFERENCES LoaiPhong(LoaiPhongID)           |
| SucChua          | INT           | NULL                                                              |
| ViTri            | NVARCHAR(255) | NULL                                                              |
| TrangThaiPhongID | INT           | NOT NULL, FOREIGN KEY REFERENCES TrangThaiPhong(TrangThaiPhongID) |
| MoTaChiTietPhong | NVARCHAR(MAX) | NULL                                                              |
| AnhMinhHoa       | VARCHAR(500)  | NULL                                                              |

**18. Bảng TrangThietBi**

| Tên cột    | Kiểu dữ liệu  | Ràng buộc/Ghi chú          |
| ---------- | ------------- | -------------------------- |
| ThietBiID  | INT           | PRIMARY KEY, IDENTITY(1,1) |
| TenThietBi | NVARCHAR(150) | NOT NULL, UNIQUE           |
| MoTa       | NVARCHAR(500) | NULL                       |

**19. Bảng Phong_ThietBi**

| Tên cột   | Kiểu dữ liệu  | Ràng buộc/Ghi chú                                        |
| --------- | ------------- | -------------------------------------------------------- |
| PhongID   | INT           | NOT NULL, FOREIGN KEY REFERENCES Phong(PhongID)          |
| ThietBiID | INT           | NOT NULL, FOREIGN KEY REFERENCES TrangThietBi(ThietBiID) |
| SoLuong   | INT           | DEFAULT 1                                                |
| TinhTrang | NVARCHAR(200) | NULL                                                     |
|           |               | PRIMARY KEY (PhongID, ThietBiID)                         |

**20. Bảng TrangThaiYeuCauPhong**

| Tên cột        | Kiểu dữ liệu  | Ràng buộc/Ghi chú              |
| -------------- | ------------- | ------------------------------ |
| TrangThaiYcpID | INT           | PRIMARY KEY, IDENTITY(1,1)     |
| MaTrangThai    | VARCHAR(50)   | NOT NULL, UNIQUE               |
| TenTrangThai   | NVARCHAR(150) | NOT NULL                       |
| LoaiApDung     | VARCHAR(20)   | NOT NULL ('CHUNG', 'CHI_TIET') |
| MoTa           | NVARCHAR(500) | NULL                           |

**21. Bảng YeuCauMuonPhong (Header)**

| Tên cột              | Kiểu dữ liệu  | Ràng buộc/Ghi chú                                                     |
| -------------------- | ------------- | --------------------------------------------------------------------- |
| YcMuonPhongID        | INT           | PRIMARY KEY, IDENTITY(1,1)                                            |
| SuKienID             | INT           | NOT NULL, FOREIGN KEY REFERENCES SuKien(SuKienID)                     |
| NguoiYeuCauID        | INT           | NOT NULL, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID)               |
| NgayYeuCau           | DATETIME      | DEFAULT GETDATE()                                                     |
| TrangThaiChungID     | INT           | NOT NULL, FOREIGN KEY REFERENCES TrangThaiYeuCauPhong(TrangThaiYcpID) |
| NguoiDuyetTongCSVCID | INT           | NULL, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID)                   |
| NgayDuyetTongCSVC    | DATETIME      | NULL                                                                  |
| GhiChuChungYc        | NVARCHAR(MAX) | NULL                                                                  |

**22. Bảng YcMuonPhongChiTiet (Detail)**

| Tên cột         | Kiểu dữ liệu  | Ràng buộc/Ghi chú                                                                 |
| --------------- | ------------- | --------------------------------------------------------------------------------- |
| YcMuonPhongCtID | INT           | PRIMARY KEY, IDENTITY(1,1)                                                        |
| YcMuonPhongID   | INT           | NOT NULL, FOREIGN KEY REFERENCES YeuCauMuonPhong(YcMuonPhongID) ON DELETE CASCADE |
| MoTaNhomPhong   | NVARCHAR(200) | NULL                                                                              |
| SlPhongNhomNay  | INT           | NOT NULL, DEFAULT 1                                                               |
| LoaiPhongYcID   | INT           | NULL, FOREIGN KEY REFERENCES LoaiPhong(LoaiPhongID)                               |
| SucChuaYc       | INT           | NULL                                                                              |
| ThietBiThemYc   | NVARCHAR(MAX) | NULL                                                                              |
| TgMuonDk        | DATETIME      | NOT NULL                                                                          |
| TgTraDk         | DATETIME      | NOT NULL                                                                          |
| TrangThaiCtID   | INT           | NOT NULL, FOREIGN KEY REFERENCES TrangThaiYeuCauPhong(TrangThaiYcpID)             |
| GhiChuCtCSVC    | NVARCHAR(MAX) | NULL                                                                              |

**23. Bảng ChiTietDatPhong**

| Tên cột         | Kiểu dữ liệu  | Ràng buộc/Ghi chú                                                    |
| --------------- | ------------- | -------------------------------------------------------------------- |
| DatPhongID      | INT           | PRIMARY KEY, IDENTITY(1,1)                                           |
| YcMuonPhongCtID | INT           | NOT NULL, FOREIGN KEY REFERENCES YcMuonPhongChiTiet(YcMuonPhongCtID) |
| PhongID         | INT           | NOT NULL, FOREIGN KEY REFERENCES Phong(PhongID)                      |
| TgNhanPhongTT   | DATETIME      | NULL                                                                 |
| TgTraPhongTT    | DATETIME      | NULL                                                                 |
| GhiChuDatPhong  | NVARCHAR(MAX) | NULL                                                                 |
|                 |               | UNIQUE (YcMuonPhongCtID, PhongID)                                    |

---

**IV. QUẢN LÝ CÁC YÊU CẦU HỦY/ĐỔI**

**24. Bảng TrangThaiYeuCauHuySK**

| Tên cột            | Kiểu dữ liệu  | Ràng buộc/Ghi chú          |
| ------------------ | ------------- | -------------------------- |
| TrangThaiYcHuySkID | INT           | PRIMARY KEY, IDENTITY(1,1) |
| MaTrangThai        | VARCHAR(50)   | NOT NULL, UNIQUE           |
| TenTrangThai       | NVARCHAR(150) | NOT NULL                   |
| MoTa               | NVARCHAR(500) | NULL                       |

**25. Bảng YeuCauHuySK**

| Tên cột            | Kiểu dữ liệu  | Ràng buộc/Ghi chú                                                         |
| ------------------ | ------------- | ------------------------------------------------------------------------- |
| YcHuySkID          | INT           | PRIMARY KEY, IDENTITY(1,1)                                                |
| SuKienID           | INT           | NOT NULL, FOREIGN KEY REFERENCES SuKien(SuKienID)                         |
| NguoiYeuCauID      | INT           | NOT NULL, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID)                   |
| NgayYeuCauHuy      | DATETIME      | DEFAULT GETDATE()                                                         |
| LyDoHuy            | NVARCHAR(MAX) | NOT NULL                                                                  |
| TrangThaiYcHuySkID | INT           | NOT NULL, FOREIGN KEY REFERENCES TrangThaiYeuCauHuySK(TrangThaiYcHuySkID) |
| NguoiDuyetHuyBGHID | INT           | NULL, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID)                       |
| NgayDuyetHuyBGH    | DATETIME      | NULL                                                                      |
| LyDoTuChoiHuyBGH   | NVARCHAR(MAX) | NULL                                                                      |

**26. Bảng TrangThaiYeuCauDoiPhong**

| Tên cột           | Kiểu dữ liệu  | Ràng buộc/Ghi chú          |
| ----------------- | ------------- | -------------------------- |
| TrangThaiYcDoiPID | INT           | PRIMARY KEY, IDENTITY(1,1) |
| MaTrangThai       | VARCHAR(50)   | NOT NULL, UNIQUE           |
| TenTrangThai      | NVARCHAR(150) | NOT NULL                   |
| MoTa              | NVARCHAR(500) | NULL                       |

**27. Bảng YeuCauDoiPhong**

| Tên cột             | Kiểu dữ liệu  | Ràng buộc/Ghi chú                                                           |
| ------------------- | ------------- | --------------------------------------------------------------------------- |
| YcDoiPhongID        | INT           | PRIMARY KEY, IDENTITY(1,1)                                                  |
| YcMuonPhongCtID     | INT           | NOT NULL, FOREIGN KEY REFERENCES YcMuonPhongChiTiet(YcMuonPhongCtID)        |
| DatPhongID_Cu       | INT           | NOT NULL, FOREIGN KEY REFERENCES ChiTietDatPhong(DatPhongID)                |
| NguoiYeuCauID       | INT           | NOT NULL, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID)                     |
| NgayYeuCauDoi       | DATETIME      | DEFAULT GETDATE()                                                           |
| LyDoDoiPhong        | NVARCHAR(MAX) | NOT NULL                                                                    |
| YcPhongMoi_LoaiID   | INT           | NULL, FOREIGN KEY REFERENCES LoaiPhong(LoaiPhongID)                         |
| YcPhongMoi_SucChua  | INT           | NULL                                                                        |
| YcPhongMoi_ThietBi  | NVARCHAR(MAX) | NULL                                                                        |
| TrangThaiYcDoiPID   | INT           | NOT NULL, FOREIGN KEY REFERENCES TrangThaiYeuCauDoiPhong(TrangThaiYcDoiPID) |
| NguoiDuyetDoiCSVCID | INT           | NULL, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID)                         |
| NgayDuyetDoiCSVC    | DATETIME      | NULL                                                                        |
| DatPhongID_Moi      | INT           | NULL, FOREIGN KEY REFERENCES ChiTietDatPhong(DatPhongID)                    |
| LyDoTuChoiDoiCSVC   | NVARCHAR(MAX) | NULL                                                                        |

---

**V. TIỆN ÍCH VÀ HỖ TRỢ KHÁC**

**28. Bảng LoaiTaiLieuSK**

| Tên cột       | Kiểu dữ liệu  | Ràng buộc/Ghi chú          |
| ------------- | ------------- | -------------------------- |
| LoaiTaiLieuID | INT           | PRIMARY KEY, IDENTITY(1,1) |
| TenLoaiTL     | NVARCHAR(100) | NOT NULL, UNIQUE           |

**29. Bảng TaiLieuSK**

| Tên cột       | Kiểu dữ liệu  | Ràng buộc/Ghi chú                                                   |
| ------------- | ------------- | ------------------------------------------------------------------- |
| TaiLieuSkID   | BIGINT        | PRIMARY KEY, IDENTITY(1,1)                                          |
| SuKienID      | INT           | NOT NULL, FOREIGN KEY REFERENCES SuKien(SuKienID) ON DELETE CASCADE |
| LoaiTaiLieuID | INT           | NOT NULL, FOREIGN KEY REFERENCES LoaiTaiLieuSK(LoaiTaiLieuID)       |
| TenHienThiTL  | NVARCHAR(255) | NOT NULL                                                            |
| DuongDanFile  | VARCHAR(500)  | NOT NULL                                                            |
| MoTaTL        | NVARCHAR(MAX) | NULL                                                                |
| NguoiTaiLenID | INT           | NOT NULL, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID)             |
| NgayTaiLen    | DATETIME      | DEFAULT GETDATE()                                                   |
| IsCongKhaiTL  | BIT           | DEFAULT 0                                                           |

**30. Bảng DanhGiaSK**

| Tên cột        | Kiểu dữ liệu  | Ràng buộc/Ghi chú                                       |
| -------------- | ------------- | ------------------------------------------------------- |
| DanhGiaSkID    | BIGINT        | PRIMARY KEY, IDENTITY(1,1)                              |
| SuKienID       | INT           | NOT NULL, FOREIGN KEY REFERENCES SuKien(SuKienID)       |
| NguoiDanhGiaID | INT           | NOT NULL, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID) |
| DiemNoiDung    | TINYINT       | NULL, CHECK (DiemNoiDung BETWEEN 1 AND 5)               |
| DiemToChuc     | TINYINT       | NULL, CHECK (DiemToChuc BETWEEN 1 AND 5)                |
| DiemDiaDiem    | TINYINT       | NULL, CHECK (DiemDiaDiem BETWEEN 1 AND 5)               |
| YKienDongGop   | NVARCHAR(MAX) | NULL                                                    |
| TgDanhGia      | DATETIME      | DEFAULT GETDATE()                                       |
|                |               | UNIQUE(SuKienID, NguoiDanhGiaID)                        |

**31. Bảng ThongBao**

| Tên cột        | Kiểu dữ liệu  | Ràng buộc/Ghi chú                                   |
| -------------- | ------------- | --------------------------------------------------- |
| ThongBaoID     | BIGINT        | PRIMARY KEY, IDENTITY(1,1)                          |
| NguoiNhanID    | INT           | NULL, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID) |
| DonViNhanID    | INT           | NULL, FOREIGN KEY REFERENCES DonVi(DonViID)         |
| SkLienQuanID   | INT           | NULL, FOREIGN KEY REFERENCES SuKien(SuKienID)       |
| YcLienQuanID   | INT           | NULL                                                |
| LoaiYcLienQuan | VARCHAR(50)   | NULL                                                |
| NoiDungTB      | NVARCHAR(MAX) | NOT NULL                                            |
| DuongDanTB     | VARCHAR(500)  | NULL                                                |
| NgayTaoTB      | DATETIME      | DEFAULT GETDATE()                                   |
| DaDocTB        | BIT           | DEFAULT 0                                           |
| NgayDocTB      | DATETIME      | NULL                                                |

1. **ThanhVienCLB (Club Membership)**

| **Tên cột**    | **Kiểu dữ liệu** | **Ràng buộc/Ghi chú**                                                                                                                                   |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ThanhVienClbID | INT              | PRIMARY KEY, IDENTITY(1,1)                                                                                                                              |
| NguoiDungID    | INT              | NOT NULL, FOREIGN KEY REFERENCES NguoiDung(NguoiDungID)                                                                                                 |
| DonViID_CLB    | INT              | NOT NULL, FOREIGN KEY REFERENCES DonVi(DonViID) (Ràng buộc DonVi.LoaiDonVi phải là 'CLB')                                                               |
| ChucVuTrongCLB | NVARCHAR(100)    | NULL (VD: 'Thành viên', 'Phó Ban Kỹ thuật', 'Trưởng Ban Nội dung'. Nếu là Trưởng CLB, có thể vẫn lưu ở đây hoặc ưu tiên vai trò trong NguoiDung_VaiTro) |
| NgayGiaNhap    | DATE             | DEFAULT GETDATE()                                                                                                                                       |
| NgayRoiCLB     | DATE             | NULL                                                                                                                                                    |
| IsActiveInCLB  | BIT              | DEFAULT 1 (Còn là thành viên tích cực không)                                                                                                            |
|                |                  | UNIQUE (NguoiDungID, DonViID_CLB) (Mỗi người chỉ là thành viên của một CLB một lần tại một thời điểm)                                                   |

**PHẦN I: QUẢN LÝ NGƯỜI DÙNG, VAI TRÒ, TÀI KHOẢN, HỌC VỤ**

**1. Bảng DonVi**

| **DonViID (PK)** | **TenDonVi**               | **MaDonVi** | **LoaiDonVi**   | **DonViChaID (FK)** | **MoTaDv**                                 |
| ---------------- | -------------------------- | ----------- | --------------- | ------------------- | ------------------------------------------ |
| 1                | Học viện Công nghệ BCVT    | PTIT        | TRUONG_DAI_HOC  | NULL                | Đơn vị cấp cao nhất                        |
| 2                | Khoa Công nghệ Thông tin 1 | CNTT1       | KHOA            | 1                   | Khoa đào tạo về CNTT                       |
| 3                | Khoa An toàn Thông tin     | ATTT        | KHOA            | 1                   | Khoa đào tạo về An toàn thông tin          |
| 4                | Phòng Đào tạo              | PĐT         | PHONG           | 1                   | Phòng quản lý công tác đào tạo             |
| 5                | Phòng Công tác Sinh viên   | PCTSV       | PHONG           | 1                   | Phòng hỗ trợ sinh viên                     |
| 6                | Phòng Cơ sở Vật chất       | PCSVC       | PHONG           | 1                   | Phòng quản lý cơ sở vật chất               |
| 7                | Ban Giám hiệu              | BGH         | BAN             | 1                   | Ban lãnh đạo trường                        |
| 8                | Bộ môn Hệ thống Thông tin  | BM_HTTT     | BO_MON          | 2                   | Bộ môn thuộc Khoa CNTT1                    |
| 9                | Đoàn Thanh niên Học viện   | ĐTN_HV      | DOAN_THANH_NIEN | 1                   | Tổ chức Đoàn Thanh niên cấp Học viện       |
| 10               | CLB Lập trình PTIT         | IT_CLUB     | CLB             | 9                   | CLB dành cho sinh viên yêu thích lập trình |
| 11               | Trung tâm Tin học          | TTTH        | TRUNG_TAM       | 1                   | Trung tâm đào tạo tin học ứng dụng         |

**2. Bảng NganhHoc**

| **NganhHocID (PK)** | **TenNganhHoc**             | **MaNganhHoc** | **KhoaQuanLyID (FK to DonVi)** | **MoTaNH**                 | **CoChuyenNganh** |
| ------------------- | --------------------------- | -------------- | ------------------------------ | -------------------------- | ----------------- |
| 1                   | Công nghệ Thông tin         | 7480201        | 2                              | Đào tạo kỹ sư CNTT         | 1                 |
| 2                   | An toàn Thông tin           | 7480202        | 3                              | Đào tạo kỹ sư ATTT         | 0                 |
| 3                   | Kỹ thuật Điện tử Viễn thông | 7520207        | 2                              | Đào tạo kỹ sư ĐTVT (ví dụ) | 1                 |

**3. Bảng ChuyenNganh**

| **ChuyenNganhID (PK)** | **TenChuyenNganh** | **MaChuyenNganh** | **NganhHocID (FK to NganhHoc)** | **MoTaCN**                   |
| ---------------------- | ------------------ | ----------------- | ------------------------------- | ---------------------------- |
| 1                      | Hệ thống Thông tin | CNHSTT            | 1                               | Chuyên sâu về HTTT           |
| 2                      | Mạng Máy tính      | CNMMT             | 1                               | Chuyên sâu về MMT            |
| 3                      | Công nghệ Phần mềm | CNPM              | 1                               | Chuyên sâu về CNPM           |
| 4                      | Truyền số liệu     | CNTDSL            | 3                               | Chuyên sâu về truyền số liệu |

**4. Bảng LopHoc**

| **LopID (PK)** | **TenLop**  | **MaLop** | **NganhHocID (FK)** | **ChuyenNganhID (FK)** | **NienKhoa** |
| -------------- | ----------- | --------- | ------------------- | ---------------------- | ------------ |
| 1              | D20CNTT01-N | D20CNTT01 | 1                   | NULL                   | 2020-2025    |
| 2              | D20ATTT01-N | D20ATTT01 | 2                   | NULL                   | 2020-2025    |
| 3              | E21CNPM01   | E21CNPM01 | 1                   | 3                      | 2021-2026    |
| 4              | D21DTVT01   | D21DTVT01 | 3                   | NULL                   | 2021-2026    |

**5. Bảng NguoiDung**

| **NguoiDungID (PK)** | **MaDinhDanh** | **HoTen**      | **Email**                                                                                       | **SoDienThoai** | **AnhDaiDien** | **NgayTao**         | **IsActive** |
| -------------------- | -------------- | -------------- | ----------------------------------------------------------------------------------------------- | --------------- | -------------- | ------------------- | ------------ |
| 1                    | B20DCCN001     | Nguyễn Văn An  | [**an.nv.b20@ptit.edu.vn**](https://www.google.com/url?sa=E&q=mailto%3Aan.nv.b20%40ptit.edu.vn) | 0912345678      | NULL           | 2023-01-10 08:00:00 | 1            |
| 2                    | GV001          | Trần Thị Bình  | [**binhtt@ptit.edu.vn**](https://www.google.com/url?sa=E&q=mailto%3Abinhtt%40ptit.edu.vn)       | 0987654321      | NULL           | 2023-01-10 08:05:00 | 1            |
| 3                    | CB001          | Lê Văn Cường   | [**cuonglv@ptit.edu.vn**](https://www.google.com/url?sa=E&q=mailto%3Acuonglv%40ptit.edu.vn)     | 0905123789      | NULL           | 2023-01-10 08:10:00 | 1            |
| 4                    | GV002          | Phạm Hùng Dũng | [**dungph@ptit.edu.vn**](https://www.google.com/url?sa=E&q=mailto%3Adungph%40ptit.edu.vn)       | 0918273645      | NULL           | 2023-01-11 09:00:00 | 1            |
| 5                    | B21DCCN002     | Hoàng Thị Em   | [**em.ht.b21@ptit.edu.vn**](https://www.google.com/url?sa=E&q=mailto%3Aem.ht.b21%40ptit.edu.vn) | 0934567890      | NULL           | 2023-01-11 09:05:00 | 1            |
| 6                    | CB002          | Vũ Thị Giang   | [**giangvt@ptit.edu.vn**](https://www.google.com/url?sa=E&q=mailto%3Agiangvt%40ptit.edu.vn)     | 0977112233      | NULL           | 2023-01-11 09:10:00 | 1            |
| 7                    | GV003          | Đỗ Văn Hiếu    | [**hieudv@ptit.edu.vn**](https://www.google.com/url?sa=E&q=mailto%3Ahieudv%40ptit.edu.vn)       | 0911223344      | NULL           | 2023-01-12 10:00:00 | 1            |

**6. Bảng TaiKhoan**

_(Giả sử OtpValue và OtpExpiry được thêm vào đây)_

| **TaiKhoanID (PK)** | **NguoiDungID (FK)** | **TenDangNhap** | **MatKhauHash**       | **Salt**       | **LanDangNhapCuoi** | **TrangThaiTk** | **NgayTaoTk**       | **OtpValue** | **OtpExpiry**       |
| ------------------- | -------------------- | --------------- | --------------------- | -------------- | ------------------- | --------------- | ------------------- | ------------ | ------------------- |
| 1                   | 1                    | an.nv.b20       | hashed_password_an    | salt_for_an    | 2023-10-26 10:00:00 | Active          | 2023-01-10 08:00:00 | NULL         | NULL                |
| 2                   | 2                    | binhtt          | hashed_password_binh  | salt_for_binh  | 2023-10-25 14:30:00 | Active          | 2023-01-10 08:05:00 | NULL         | NULL                |
| 3                   | 3                    | cuonglv         | hashed_password_cuong | salt_for_cuong | 2023-10-26 09:15:00 | Active          | 2023-01-10 08:10:00 | 123456       | 2023-10-27 10:05:00 |
| 4                   | 4                    | dungph          | hashed_password_dung  | salt_for_dung  | 2023-10-24 11:00:00 | Active          | 2023-01-11 09:00:00 | NULL         | NULL                |
| 5                   | 5                    | em.ht.b21       | hashed_password_em    | salt_for_em    | 2023-10-23 16:45:00 | Locked          | 2023-01-11 09:05:00 | NULL         | NULL                |
| 6                   | 6                    | giangvt         | hashed_password_giang | salt_for_giang | 2023-10-26 11:30:00 | Active          | 2023-01-11 09:10:00 | NULL         | NULL                |
| 7                   | 7                    | hieudv          | hashed_password_hieu  | salt_for_hieu  | 2023-10-20 08:00:00 | Active          | 2023-01-12 10:00:00 | NULL         | NULL                |

**7. Bảng ThongTinSinhVien**

| **NguoiDungID (PK, FK)** | **MaSinhVien** | **LopID (FK)** | **NganhHocID (FK)** | **ChuyenNganhID (FK)** | **KhoaHoc** | **HeDaoTao**   | **NgayNhapHoc** | **TrangThaiHocTap** |
| ------------------------ | -------------- | -------------- | ------------------- | ---------------------- | ----------- | -------------- | --------------- | ------------------- |
| 1                        | B20DCCN001     | 1              | 1                   | NULL                   | K2020       | Chính quy      | 2020-09-05      | Đang học            |
| 5                        | B21DCCN002     | 3              | 1                   | 3                      | K2021       | Chất lượng cao | 2021-09-06      | Đang học            |

**8. Bảng ThongTinGiangVien**

| **NguoiDungID (PK, FK)** | **MaGiangVien** | **DonViCongTacID (FK to DonVi)** | **HocVi** | **HocHam** | **ChucDanhGD**     | **ChuyenMonChinh** |
| ------------------------ | --------------- | -------------------------------- | --------- | ---------- | ------------------ | ------------------ |
| 2                        | GV001           | 2                                | Tiến sĩ   | PGS        | Giảng viên chính   | Hệ thống Thông tin |
| 4                        | GV002           | 3                                | Thạc sĩ   | NULL       | Giảng viên         | An toàn Mạng       |
| 7                        | GV003           | 2                                | Tiến sĩ   | GS         | Giảng viên cao cấp | Mạng Máy tính      |

**9. Bảng VaiTroHeThong**

| **VaiTroID (PK)** | **MaVaiTro**        | **TenVaiTro**               | **MoTaVT**                                |
| ----------------- | ------------------- | --------------------------- | ----------------------------------------- |
| 1                 | ADMIN_HE_THONG      | Quản trị viên Hệ thống      | Quyền cao nhất                            |
| 2                 | CB_TO_CHUC_SU_KIEN  | Cán bộ Tổ chức Sự kiện      | Người tạo và quản lý sự kiện từ Phòng/Ban |
| 3                 | BGH_DUYET_SK_TRUONG | Ban Giám hiệu Duyệt sự kiện | Duyệt sự kiện cấp Trường                  |
| 4                 | QUAN_LY_CSVC        | Quản lý Cơ sở Vật chất      | Duyệt yêu cầu phòng, quản lý phòng        |
| 5                 | TRUONG_KHOA         | Trưởng Khoa                 | Quản lý hoạt động của Khoa                |
| 6                 | TRUONG_CLB          | Trưởng Câu lạc bộ           | Quản lý hoạt động của CLB                 |
| 7                 | BI_THU_DOAN         | Bí thư Đoàn các cấp         | Quản lý hoạt động của đơn vị Đoàn         |

**10. Bảng NguoiDung_VaiTro**

| **GanVaiTroID (PK)** | **NguoiDungID (FK)** | **VaiTroID (FK)** | **DonViID (FK to DonVi)** | **NgayBatDau** | **NgayKetThuc** | **GhiChuGanVT**                   |
| -------------------- | -------------------- | ----------------- | ------------------------- | -------------- | --------------- | --------------------------------- |
| 1                    | 2                    | 5                 | 2                         | 2022-08-01     | NULL            | GV Bình làm Trưởng Khoa CNTT1     |
| 2                    | 3                    | 2                 | 4                         | 2023-01-10     | NULL            | CB Cường thuộc Phòng Đào tạo      |
| 3                    | 4                    | 3                 | 7                         | 2023-01-11     | NULL            | GV Dũng thuộc Ban Giám Hiệu       |
| 4                    | 1                    | 6                 | 10                        | 2023-03-01     | 2024-03-01      | SV An làm Trưởng CLB Lập trình    |
| 5                    | 6                    | 4                 | 6                         | 2023-01-11     | NULL            | CB Giang làm ở Phòng CSVC         |
| 6                    | 7                    | 1                 | NULL                      | 2023-01-01     | NULL            | GV Hiếu là Admin hệ thống         |
| 7                    | 2                    | 8                 | 2                         | 2022-08-01     | NULL            | TK Bình xem báo cáo Khoa CNTT1    |
| 8                    | 1                    | 8                 | 10                        | 2023-03-01     | 2024-03-01      | TCLB An xem báo cáo CLB Lập trình |

**PHẦN II: QUẢN LÝ SỰ KIỆN**

**11. Bảng TrangThaiSK**

| **TrangThaiSkID (PK)** | **MaTrangThai**      | **TenTrangThai**            | **MoTa**                                   |
| ---------------------- | -------------------- | --------------------------- | ------------------------------------------ |
| 1                      | CHO_DUYET_BGH        | Chờ Ban Giám hiệu duyệt     | Sự kiện mới tạo, chờ BGH xem xét           |
| 2                      | DA_DUYET_BGH         | Đã được Ban Giám hiệu duyệt | BGH đã đồng ý tổ chức                      |
| 3                      | TU_CHOI_BGH          | Bị Ban Giám hiệu từ chối    | BGH không đồng ý, có lý do                 |
| 4                      | CHO_DUYET_PHONG      | Chờ duyệt phòng             | Đã được BGH duyệt, đang chờ CSVC xếp phòng |
| 5                      | DA_XAC_NHAN_PHONG    | Đã xác nhận phòng           | CSVC đã xếp phòng thành công               |
| 6                      | CHO_DUYET_HUY_BGH    | Chờ BGH duyệt hủy sự kiện   | Yêu cầu hủy sự kiện đang chờ BGH           |
| 7                      | DA_HUY               | Đã hủy sự kiện              | Sự kiện đã bị hủy (do người tạo hoặc BGH)  |
| 8                      | HOAN_THANH           | Đã hoàn thành               | Sự kiện đã diễn ra thành công              |
| 9                      | DA_HUY_BOI_NGUOI_TAO | Đã hủy bởi người tạo        | Người tạo tự hủy trước khi BGH duyệt       |

**12. Bảng SuKien**

| **SuKienID (PK)** | **TenSK**                         | **TgBatDauDK**      | **TgKetThucDK**     | **NguoiChuTriID (FK to NguoiDung)** | **TenChuTriNgoai** | **DonViChuTriNgoai** | **DonViChuTriID (FK to DonVi)** | **SlThamDuDK** | **MoTaChiTiet**                                   | **TrangThaiSkID (FK)** | **NguoiTaoID (FK to NguoiDung)** | **NgayTaoSK**       | **NguoiDuyetBGHID (FK)** | **NgayDuyetBGH**    | **LyDoTuChoiBGH** | **LyDoHuyNguoiTao** | **IsCongKhaiNoiBo** | **KhachMoiNgoaiGhiChu** |
| ----------------- | --------------------------------- | ------------------- | ------------------- | ----------------------------------- | ------------------ | -------------------- | ------------------------------- | -------------- | ------------------------------------------------- | ---------------------- | -------------------------------- | ------------------- | ------------------------ | ------------------- | ----------------- | ------------------- | ------------------- | ----------------------- |
| 1                 | Hội thảo Blockchain và Ứng dụng   | 2023-11-15 08:00:00 | 2023-11-15 17:00:00 | 2 (GV Bình)                         | NULL               | NULL                 | 2 (Khoa CNTT1)                  | 200            | Giới thiệu công nghệ Blockchain và ứng dụng...    | 2                      | 3 (CB Cường)                     | 2023-10-01 10:00:00 | 4 (GV Dũng - BGH)        | 2023-10-05 14:00:00 | NULL              | NULL                | 1                   | NULL                    |
| 2                 | Ngày hội việc làm PTIT 2023       | 2023-12-01 08:00:00 | 2023-12-01 17:00:00 | NULL                                | Ông John Doe       | Google Inc.          | 5 (Phòng CTSV)                  | 1000           | Kết nối sinh viên với doanh nghiệp...             | 1                      | 3 (CB Cường)                     | 2023-10-10 15:30:00 | NULL                     | NULL                | NULL              | NULL                | 1                   | FPT, Viettel, VNPT      |
| 3                 | Cuộc thi PTIT Code Challenge 2023 | 2023-11-25 07:30:00 | 2023-11-26 18:00:00 | 7 (GV Hiếu)                         | NULL               | NULL                 | 10 (CLB Lập trình)              | 150            | Sân chơi lập trình cho sinh viên PTIT...          | 3                      | 1 (SV An - Trưởng CLB)           | 2023-10-15 09:00:00 | 4 (GV Dũng - BGH)        | 2023-10-18 11:00:00 | Trùng lịch        | NULL                | 1                   | NULL                    |
| 4                 | Lễ Khai giảng năm học 2023-2024   | 2023-09-05 08:00:00 | 2023-09-05 11:00:00 | 4 (GV Dũng - BGH)                   | NULL               | NULL                 | 7 (Ban Giám hiệu)               | 500            | Chào đón tân sinh viên và khai giảng năm học mới. | 5                      | 3 (CB Cường)                     | 2023-08-01 14:00:00 | 4 (GV Dũng - BGH)        | 2023-08-05 10:00:00 | NULL              | NULL                | 1                   | Đại diện Bộ TTTT        |

**13. Bảng SK_DonViThamGia**

| **SuKienID (FK)** | **DonViID (FK to DonVi)** | **VaiTroDonViSK**                |
| ----------------- | ------------------------- | -------------------------------- |
| 1                 | 3 (Khoa ATTT)             | Đồng tổ chức, tham gia gian hàng |
| 1                 | 10 (CLB Lập trình)        | Hỗ trợ kỹ thuật                  |
| 2                 | 2 (Khoa CNTT1)            | Cử sinh viên tham gia            |
| 2                 | 3 (Khoa ATTT)             | Cử sinh viên tham gia            |
| 4                 | 2 (Khoa CNTT1)            | Tham dự                          |
| 4                 | 3 (Khoa ATTT)             | Tham dự                          |
| 4                 | 9 (Đoàn Thanh niên)       | Hỗ trợ tổ chức                   |

**14. Bảng SK_MoiThamGia**

| **MoiThamGiaID (PK)** | **SuKienID (FK)** | **NguoiDuocMoiID (FK to NguoiDung)** | **VaiTroDuKienSK** | **IsChapNhanMoi** | **TgPhanHoiMoi**    | **GhiChuMoi**     |
| --------------------- | ----------------- | ------------------------------------ | ------------------ | ----------------- | ------------------- | ----------------- |
| 1                     | 1                 | 7 (GV Hiếu)                          | Diễn giả chính     | 1                 | 2023-10-10 10:00:00 | Xác nhận tham gia |
| 2                     | 4                 | 2 (GV Bình - Trưởng Khoa CNTT1)      | Khách mời VIP      | 1                 | 2023-08-10 09:00:00 |                   |

---

**PHẦN III: QUẢN LÝ PHÒNG VÀ YÊU CẦU MƯỢN PHÒNG**

**15. Bảng LoaiPhong**

| **LoaiPhongID (PK)** | **TenLoaiPhong** | **MoTa**                             |
| -------------------- | ---------------- | ------------------------------------ |
| 1                    | Hội trường lớn   | Sức chứa trên 200 người, có sân khấu |
| 2                    | Phòng Hội thảo   | Sức chứa 50-100 người, có máy chiếu  |
| 3                    | Phòng Học        | Sức chứa 30-50 người, có bảng        |
| 4                    | Phòng Lab        | Có máy tính, thiết bị chuyên dụng    |

**16. Bảng TrangThaiPhong**

| **TrangThaiPhongID (PK)** | **TenTrangThai** | **MoTa**                          |
| ------------------------- | ---------------- | --------------------------------- |
| 1                         | Sẵn sàng         | Phòng trống, có thể sử dụng ngay  |
| 2                         | Đang sử dụng     | Có sự kiện/lớp học đang diễn ra   |
| 3                         | Bảo trì          | Đang sửa chữa, không sử dụng được |
| 4                         | Đã được đặt      | Đã có lịch đặt, chờ sử dụng       |

**17. Bảng Phong**

| **PhongID (PK)** | **TenPhong**        | **MaPhong** | **LoaiPhongID (FK)** | **SucChua** | **ViTri**          | **TrangThaiPhongID (FK)** | **MoTaChiTietPhong**      | **AnhMinhHoa** |
| ---------------- | ------------------- | ----------- | -------------------- | ----------- | ------------------ | ------------------------- | ------------------------- | -------------- |
| 1                | Hội trường 700      | HT700       | 1                    | 700         | Tòa nhà A1, Tầng 1 | 1                         | Âm thanh, ánh sáng đầy đủ | NULL           |
| 2                | Phòng Hội thảo A201 | A201        | 2                    | 80          | Tòa nhà A2, Tầng 2 | 1                         | Máy chiếu, màn chiếu      | NULL           |
| 3                | Phòng học B305      | B305        | 3                    | 40          | Tòa nhà B1, Tầng 3 | 1                         | Bảng, phấn                | NULL           |
| 4                | Lab Thực hành Mạng  | LAB_MANG    | 4                    | 30          | Tòa nhà C1, Tầng 2 | 1                         | Switch, Router, Dây mạng  | NULL           |

**18. Bảng TrangThietBi**

| **ThietBiID (PK)** | **TenThietBi**  | **MoTa**                            |
| ------------------ | --------------- | ----------------------------------- |
| 1                  | Máy chiếu       | Máy chiếu đa năng, độ phân giải cao |
| 2                  | Micro không dây | Bộ 2 micro không dây, sóng ổn định  |
| 3                  | Bảng tương tác  | Bảng trắng có khả năng tương tác    |
| 4                  | Loa di động     | Loa công suất lớn, dễ di chuyển     |

**19. Bảng Phong_ThietBi**

| **PhongID (FK)** | **ThietBiID (FK)** | **SoLuong** | **TinhTrang** |
| ---------------- | ------------------ | ----------- | ------------- |
| 1                | 1                  | 2           | Hoạt động tốt |
| 1                | 2                  | 1           | Hoạt động tốt |
| 2                | 1                  | 1           | Hoạt động tốt |
| 4                | 3                  | 1           | Mới lắp đặt   |

**20. Bảng TrangThaiYeuCauPhong**

| **TrangThaiYcpID (PK)** | **MaTrangThai**      | **TenTrangThai**                | **LoaiApDung** | **MoTa**                              |
| ----------------------- | -------------------- | ------------------------------- | -------------- | ------------------------------------- |
| 1                       | YCCP_CHO_XU_LY       | YCCP - Chờ xử lý                | CHUNG          | Yêu cầu mượn phòng tổng thể chờ CSVC  |
| 2                       | YCCP_DA_XEP_PHONG    | YCCP - Đã xếp phòng             | CHUNG          | Tất cả chi tiết đã được xếp phòng     |
| 3                       | YCCP_TU_CHOI_TP      | YCCP - Từ chối một phần         | CHUNG          | Một số chi tiết bị từ chối            |
| 4                       | YCCPCT_CHO_DUYET     | YCCPCT - Chờ duyệt chi tiết     | CHI_TIET       | Chi tiết yêu cầu chờ CSVC duyệt       |
| 5                       | YCCPCT_DA_XEP        | YCCPCT - Đã xếp phòng           | CHI_TIET       | Chi tiết đã được xếp phòng            |
| 6                       | YCCPCT_KHONG_PHU_HOP | YCCPCT - Không có phòng phù hợp | CHI_TIET       | Không tìm được phòng cho chi tiết này |

**21. Bảng YeuCauMuonPhong (Header)**

| **YcMuonPhongID (PK)** | **SuKienID (FK)** | **NguoiYeuCauID (FK to NguoiDung)** | **NgayYeuCau**      | **TrangThaiChungID (FK)** | **NguoiDuyetTongCSVCID (FK)** | **NgayDuyetTongCSVC** | **GhiChuChungYc**             |
| ---------------------- | ----------------- | ----------------------------------- | ------------------- | ------------------------- | ----------------------------- | --------------------- | ----------------------------- |
| 1                      | 1                 | 3 (CB Cường)                        | 2023-10-06 09:00:00 | 2                         | 6 (CB Giang - CSVC)           | 2023-10-07 16:00:00   | Xin hỗ trợ setup âm thanh     |
| 2                      | 4                 | 3 (CB Cường)                        | 2023-08-06 10:00:00 | 2                         | 6 (CB Giang - CSVC)           | 2023-08-07 11:00:00   | Ưu tiên phòng có điều hòa tốt |

**22. Bảng YcMuonPhongChiTiet (Detail)**

| **YcMuonPhongCtID (PK)** | **YcMuonPhongID (FK)** | **MoTaNhomPhong** | **SlPhongNhomNay** | **LoaiPhongYcID (FK)** | **SucChuaYc** | **ThietBiThemYc**                  | **TgMuonDk**        | **TgTraDk**         | **TrangThaiCtID (FK)** | **GhiChuCtCSVC**       |
| ------------------------ | ---------------------- | ----------------- | ------------------ | ---------------------- | ------------- | ---------------------------------- | ------------------- | ------------------- | ---------------------- | ---------------------- |
| 1                        | 1                      | Hội trường chính  | 1                  | 1                      | 250           | 02 Micro không dây, Bục phát biểu  | 2023-11-15 07:30:00 | 2023-11-15 17:30:00 | 5                      | Đã xếp phòng HT700     |
| 2                        | 1                      | Phòng chờ VIP     | 1                  | 2                      | 20            | Nước uống, Bàn ghế sofa            | 2023-11-15 07:00:00 | 2023-11-15 18:00:00 | 6                      | Hết phòng hội thảo nhỏ |
| 3                        | 2                      | Sân khấu chính    | 1                  | 1                      | 500           | Màn hình LED lớn, Âm thanh sự kiện | 2023-09-05 07:00:00 | 2023-09-05 12:00:00 | 5                      | OK, đã xếp HT700       |

**23. Bảng ChiTietDatPhong**

| **DatPhongID (PK)** | **YcMuonPhongCtID (FK)** | **PhongID (FK)** | **TgNhanPhongTT**   | **TgTraPhongTT**    | **GhiChuDatPhong**   |
| ------------------- | ------------------------ | ---------------- | ------------------- | ------------------- | -------------------- |
| 1                   | 1                        | 1 (HT700)        | 2023-11-15 07:30:00 | 2023-11-15 17:30:00 |                      |
| 2                   | 3                        | 1 (HT700)        | 2023-09-05 07:00:00 | 2023-09-05 12:00:00 | Sắp xếp theo yêu cầu |

**PHẦN IV: QUẢN LÝ CÁC YÊU CẦU HỦY/ĐỔI**

**24. Bảng TrangThaiYeuCauHuySK**

| **TrangThaiYcHuySkID (PK)** | **MaTrangThai**     | **TenTrangThai**     | **MoTa**                            |
| --------------------------- | ------------------- | -------------------- | ----------------------------------- |
| 1                           | YCHSK_CHO_DUYET_BGH | Chờ BGH duyệt hủy    | Yêu cầu hủy đang chờ BGH quyết định |
| 2                           | YCHSK_DA_DUYET_HUY  | Đã duyệt hủy bởi BGH | BGH đồng ý hủy sự kiện              |
| 3                           | YCHSK_TU_CHOI_HUY   | Bị BGH từ chối hủy   | BGH không đồng ý hủy sự kiện        |

**25. Bảng YeuCauHuySK**

_(Giả sử Sự kiện ID=1 "Hội thảo Blockchain" ban đầu được duyệt, sau đó có yêu cầu hủy)_

| **YcHuySkID (PK)**        | **SuKienID (FK)** | **NguoiYeuCauID (FK to NguoiDung)** | **NgayYeuCauHuy**   | **LyDoHuy**                                                     | **TrangThaiYcHuySkID (FK)** | **NguoiDuyetHuyBGHID (FK)** | **NgayDuyetHuyBGH** | **LyDoTuChoiHuyBGH** |
| ------------------------- | ----------------- | ----------------------------------- | ------------------- | --------------------------------------------------------------- | --------------------------- | --------------------------- | ------------------- | -------------------- |
| 1                         | 1                 | 3 (CB Cường)                        | 2023-10-20 10:00:00 | Diễn giả chính báo bận đột xuất, không tìm được người thay thế. | 1                           | NULL                        | NULL                | NULL                 |
| _(Sau khi BGH duyệt hủy)_ |                   |                                     |                     |                                                                 |                             |                             |                     |                      |
| 1                         | 1                 | 3 (CB Cường)                        | 2023-10-20 10:00:00 | Diễn giả chính báo bận đột xuất, không tìm được người thay thế. | 2                           | 4 (GV Dũng - BGH)           | 2023-10-21 14:00:00 | NULL                 |

**26. Bảng TrangThaiYeuCauDoiPhong**

| **TrangThaiYcDoiPID (PK)** | **MaTrangThai**     | **TenTrangThai**            | **MoTa**                            |
| -------------------------- | ------------------- | --------------------------- | ----------------------------------- |
| 1                          | YCDP_CHO_DUYET_CSVC | Chờ CSVC duyệt đổi phòng    | Yêu cầu đổi phòng đang chờ CSVC     |
| 2                          | YCDP_DA_DUYET_DOI   | Đã duyệt đổi phòng bởi CSVC | CSVC đồng ý đổi, đã xếp phòng mới   |
| 3                          | YCDP_TU_CHOI_DOI    | Bị CSVC từ chối đổi phòng   | CSVC không đồng ý đổi, giữ phòng cũ |

**27. Bảng YeuCauDoiPhong**

_(Giả sử Sự kiện ID=4 "Lễ Khai giảng", chi tiết yêu cầu phòng YcMuonPhongCtID=3 đã được đặt phòng DatPhongID=2 là HT700. Nay có yêu cầu đổi sang phòng nhỏ hơn)_

| **YcDoiPhongID (PK)**                                                                                                                                   | **YcMuonPhongCtID (FK)** | **DatPhongID_Cu (FK)** | **NguoiYeuCauID (FK)** | **NgayYeuCauDoi**   | **LyDoDoiPhong**                                             | **YcPhongMoi_LoaiID (FK)** | **YcPhongMoi_SucChua** | **YcPhongMoi_ThietBi** | **TrangThaiYcDoiPID (FK)** | **NguoiDuyetDoiCSVCID (FK)** | **NgayDuyetDoiCSVC** | **DatPhongID_Moi (FK)** | **LyDoTuChoiDoiCSVC** |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ---------------------- | ---------------------- | ------------------- | ------------------------------------------------------------ | -------------------------- | ---------------------- | ---------------------- | -------------------------- | ---------------------------- | -------------------- | ----------------------- | --------------------- |
| 1                                                                                                                                                       | 3                        | 2                      | 3 (CB Cường)           | 2023-08-15 11:00:00 | Số lượng khách mời VIP giảm, cần phòng nhỏ hơn, ấm cúng hơn. | 2 (Phòng Hội thảo)         | 100                    | NULL                   | 1                          | NULL                         | NULL                 | NULL                    | NULL                  |
| _(Sau khi CSVC duyệt đổi và xếp phòng mới là A201 (giả sử DatPhongID=3 là A201 đã được tạo trong ChiTietDatPhong cho YcMuonPhongCtID này sau khi đổi))_ |                          |                        |                        |                     |                                                              |                            |                        |                        |                            |                              |                      |                         |                       |
| 1                                                                                                                                                       | 3                        | 2                      | 3 (CB Cường)           | 2023-08-15 11:00:00 | Số lượng khách mời VIP giảm, cần phòng nhỏ hơn, ấm cúng hơn. | 2 (Phòng Hội thảo)         | 100                    | NULL                   | 2                          | 6 (CB Giang - CSVC)          | 2023-08-16 09:30:00  | 3                       | NULL                  |

---

**PHẦN V: TIỆN ÍCH VÀ HỖ TRỢ KHÁC**

**28. Bảng LoaiTaiLieuSK**

| **LoaiTaiLieuID (PK)** | **TenLoaiTL**    |
| ---------------------- | ---------------- |
| 1                      | Kế hoạch Tổ chức |
| 2                      | Slide Trình bày  |
| 3                      | Hình ảnh Sự kiện |
| 4                      | Video Sự kiện    |
| 5                      | Agenda chi tiết  |

**29. Bảng TaiLieuSK**

| **TaiLieuSkID (PK)** | **SuKienID (FK)** | **LoaiTaiLieuID (FK)** | **TenHienThiTL**               | **DuongDanFile**                        | **MoTaTL**                          | **NguoiTaiLenID (FK to NguoiDung)** | **NgayTaiLen**      | **IsCongKhaiTL** |
| -------------------- | ----------------- | ---------------------- | ------------------------------ | --------------------------------------- | ----------------------------------- | ----------------------------------- | ------------------- | ---------------- |
| 1                    | 1                 | 1                      | KeHoach_HoiThao_Blockchain.pdf | /uploads/sukien/1/KH_Blockchain.pdf     | Kế hoạch chi tiết cho hội thảo      | 3 (CB Cường)                        | 2023-10-02 10:00:00 | 0                |
| 2                    | 1                 | 2                      | Slide_GS_Hieu_Blockchain.pptx  | /uploads/sukien/1/Slide_GS_Hieu.pptx    | Slide của diễn giả chính            | 7 (GV Hiếu)                         | 2023-11-14 15:00:00 | 1                |
| 3                    | 4                 | 5                      | Agenda_LeKhaiGiang_2023.docx   | /uploads/sukien/4/Agenda_KhaiGiang.docx | Chương trình chi tiết Lễ Khai giảng | 3 (CB Cường)                        | 2023-08-20 11:30:00 | 1                |

**30. Bảng DanhGiaSK**

_(Giả sử người dùng ID=1 (SV An) và ID=2 (GV Bình) đánh giá Sự kiện ID=4 "Lễ Khai giảng")_

| **DanhGiaSkID (PK)** | **SuKienID (FK)** | **NguoiDanhGiaID (FK to NguoiDung)** | **DiemNoiDung** | **DiemToChuc** | **DiemDiaDiem** | **YKienDongGop**                         | **TgDanhGia**       |
| -------------------- | ----------------- | ------------------------------------ | --------------- | -------------- | --------------- | ---------------------------------------- | ------------------- |
| 1                    | 4                 | 1 (SV An)                            | 5               | 4              | 5               | Chương trình ý nghĩa, mong có nhiều hơn. | 2023-09-06 10:00:00 |
| 2                    | 4                 | 2 (GV Bình)                          | 4               | 5              | 4               | Tổ chức chuyên nghiệp, âm thanh tốt.     | 2023-09-06 14:30:00 |

**31. Bảng ThongBao**

| **ThongBaoID (PK)** | **NguoiNhanID (FK to NguoiDung)** | **DonViNhanID (FK to DonVi)** | **SkLienQuanID (FK)** | **YcLienQuanID** | **LoaiYcLienQuan** | **NoiDungTB**                                                                      | **DuongDanTB**        | **NgayTaoTB**       | **DaDocTB** | **NgayDocTB**       |
| ------------------- | --------------------------------- | ----------------------------- | --------------------- | ---------------- | ------------------ | ---------------------------------------------------------------------------------- | --------------------- | ------------------- | ----------- | ------------------- |
| 1                   | 4 (GV Dũng - BGH)                 | NULL                          | 1                     | NULL             | NULL               | Yêu cầu duyệt sự kiện "Hội thảo Blockchain và Ứng dụng" đã được tạo.               | /admin/sukien/duyet/1 | 2023-10-01 10:05:00 | 1           | 2023-10-01 11:00:00 |
| 2                   | NULL                              | 2 (Khoa CNTT1)                | 1                     | NULL             | NULL               | Sự kiện "Hội thảo Blockchain và Ứng dụng" do Khoa CNTT1 chủ trì đã được BGH duyệt. | /sukien/chitiet/1     | 2023-10-05 14:05:00 | 0           | NULL                |
| 3                   | 6 (CB Giang - CSVC)               | NULL                          | 1                     | 1                | YEUCAUMUONPHONG    | Có yêu cầu mượn phòng mới cho sự kiện "Hội thảo Blockchain và Ứng dụng".           | /admin/phong/duyet/1  | 2023-10-06 09:05:00 | 0           | NULL                |
| 4                   | 3 (CB Cường)                      | NULL                          | 1                     | 1                | YEUCAUHUYSK        | Yêu cầu hủy sự kiện "Hội thảo Blockchain..." của bạn đã được BGH chấp thuận.       | /sukien/quanly/1      | 2023-10-21 14:05:00 | 1           | 2023-10-21 15:00:00 |

---
