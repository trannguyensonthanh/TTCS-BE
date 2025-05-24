// src/modules/nguoiDung/nguoiDung.repository.js
import { executeQuery } from '../../utils/database.js';
import sql from 'mssql';

const getAllNguoiDungWithPagination = async (params) => {
  const {
    searchTerm,
    maVaiTro,
    donViID,
    page = 1,
    limit = 20,
    sortBy = 'nd.HoTen',
    sortOrder = 'ASC',
  } = params;

  let selectClause = `SELECT DISTINCT nd.NguoiDungID, nd.HoTen, nd.Email, nd.MaDinhDanh, nd.AnhDaiDien `;
  let fromClause = `FROM NguoiDung nd `;
  let whereClause = `WHERE nd.IsActive = 1 `; // Chỉ lấy người dùng active
  const queryParams = [];

  if (maVaiTro) {
    // Nếu lọc theo vaiTroMa, cần join với NguoiDung_VaiTro và VaiTroHeThong
    // Đây là cách xử lý cho trường hợp người dùng có thể là GV hoặc SV (có bảng riêng)
    // và đồng thời có vai trò chức năng
    // Nếu maVaiTro là 'GIANG_VIEN' hoặc 'SINH_VIEN', ta sẽ kiểm tra sự tồn tại trong bảng tương ứng
    // Nếu maVaiTro là vai trò chức năng, kiểm tra trong NguoiDung_VaiTro
    if (maVaiTro.toUpperCase() === 'GIANG_VIEN') {
      fromClause += ` JOIN ThongTinGiangVien tgv ON nd.NguoiDungID = tgv.NguoiDungID `;
      if (donViID) {
        // Nếu lọc theo đơn vị công tác của giảng viên
        fromClause += ` AND tgv.DonViCongTacID = @DonViID `;
        queryParams.push({ name: 'DonViID', type: sql.Int, value: donViID });
      }
    } else if (maVaiTro.toUpperCase() === 'SINH_VIEN') {
      fromClause += ` JOIN ThongTinSinhVien tsv ON nd.NguoiDungID = tsv.NguoiDungID `;
      if (donViID) {
        // Nếu lọc theo Lớp hoặc Khoa của sinh viên (cần logic phức tạp hơn nếu donViID là Khoa)
        fromClause += ` JOIN LopHoc lh ON tsv.LopID = lh.LopID `;
        fromClause += ` JOIN NganhHoc nh ON lh.NganhHocID = nh.NganhHocID AND nh.KhoaQuanLyID = @DonViID `; // Giả sử donViID là Khoa
        queryParams.push({ name: 'DonViID', type: sql.Int, value: donViID });
      }
    } else {
      // Các vai trò chức năng khác
      fromClause += ` JOIN NguoiDung_VaiTro ndvt ON nd.NguoiDungID = ndvt.NguoiDungID
                            JOIN VaiTroHeThong vt ON ndvt.VaiTroID = vt.VaiTroID `;
      whereClause += ` AND vt.MaVaiTro = @maVaiTro AND (ndvt.NgayKetThuc IS NULL OR ndvt.NgayKetThuc >= GETDATE()) `;
      queryParams.push({
        name: 'maVaiTro',
        type: sql.VarChar(50),
        value: maVaiTro,
      });
      if (donViID) {
        whereClause += ` AND ndvt.DonViID = @DonViID `;
        queryParams.push({ name: 'DonViID', type: sql.Int, value: donViID });
      }
    }
  } else if (donViID) {
    // Lọc chung theo đơn vị nếu không có maVaiTro cụ thể
    // Logic này có thể phức tạp: người dùng có thể thuộc đơn vị với tư cách GV, SV hoặc vai trò chức năng
    // Tạm thời bỏ qua lọc này nếu không có maVaiTro để đơn giản
    // fromClause += ` LEFT JOIN ThongTinGiangVien tgv_dv ON nd.NguoiDungID = tgv_dv.NguoiDungID
    //                 LEFT JOIN ThongTinSinhVien tsv_dv ON nd.NguoiDungID = tsv_dv.NguoiDungID
    //                 LEFT JOIN LopHoc lh_dv ON tsv_dv.LopID = lh_dv.LopID
    //                 LEFT JOIN NganhHoc nh_dv ON lh_dv.NganhHocID = nh_dv.NganhHocID
    //                 LEFT JOIN NguoiDung_VaiTro ndvt_dv ON nd.NguoiDungID = ndvt_dv.NguoiDungID `;
    // whereClause += ` AND (tgv_dv.DonViCongTacID = @DonViID OR nh_dv.KhoaQuanLyID = @DonViID OR ndvt_dv.DonViID = @DonViID) `;
    // queryParams.push({ name: 'DonViID', type: sql.Int, value: donViID });
    // => khó nên vì có thể có nhiều đơn vị khác nhau nên là méo làm
    console.warn(
      'Lọc theo donViID mà không có maVaiTro cụ thể chưa được triển khai chi tiết.'
    );
  }

  if (searchTerm) {
    whereClause += ` AND (nd.HoTen LIKE @SearchTerm OR nd.Email LIKE @SearchTerm OR nd.MaDinhDanh LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }

  const countQuery = `SELECT COUNT(DISTINCT nd.NguoiDungID) AS TotalItems ${fromClause} ${whereClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = [
    'nd.NguoiDungID',
    'nd.HoTen',
    'nd.Email',
    'nd.MaDinhDanh',
  ];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'nd.HoTen';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        ${selectClause}
        ${fromClause}
        ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
    `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);
  return {
    items: itemsResult.recordset.map((u) => ({
      nguoiDungID: u.NguoiDungID,
      hoTen: u.HoTen,
      email: u.Email,
      // maDinhDanh: u.MaDinhDanh, // Có thể thêm nếu cần
      // anhDaiDien: u.AnhDaiDien,
    })),
    totalItems,
  };
};

export const nguoiDungRepository = {
  getAllNguoiDungWithPagination,
};
