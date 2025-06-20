// src/modules/phongCRUD/phongCRUD.repository.js
import sql from 'mssql';
import { executeQuery, getPool } from '../../utils/database.js';
import { suKienRepository } from '../suKien/suKien.repository.js';

const SELECT_PHONG_FIELDS_FOR_LIST = `
    p.PhongID, p.TenPhong, p.MaPhong, p.SucChua, p.SoThuTuPhong, p.AnhMinhHoa,
    lp.LoaiPhongID AS Phong_LoaiPhongID, lp.TenLoaiPhong AS Phong_TenLoaiPhong,
    ttp.TrangThaiPhongID AS Phong_TrangThaiPhongID, ttp.TenTrangThai AS Phong_TenTrangThaiPhong,
    tnt.ToaNhaTangID AS Phong_ToaNhaTangID,
    tn.ToaNhaID AS Phong_ToaNhaID, tn.TenToaNha AS Phong_TenToaNha, tn.MaToaNha AS Phong_MaToaNha,
    lt.LoaiTangID AS Phong_LoaiTangID, lt.TenLoaiTang AS Phong_TenLoaiTang, lt.MaLoaiTang AS Phong_MaLoaiTang,
    cs.DonViID AS Phong_CoSoID, cs.TenDonVi AS Phong_TenCoSo, cs.MaDonVi AS Phong_MaCoSo
`;

const FROM_JOIN_PHONG_FOR_LIST = `
    FROM Phong p
    JOIN LoaiPhong lp ON p.LoaiPhongID = lp.LoaiPhongID
    JOIN TrangThaiPhong ttp ON p.TrangThaiPhongID = ttp.TrangThaiPhongID
    LEFT JOIN ToaNha_Tang tnt ON p.ToaNhaTangID = tnt.ToaNhaTangID
    LEFT JOIN ToaNha tn ON tnt.ToaNhaID = tn.ToaNhaID
    LEFT JOIN LoaiTang lt ON tnt.LoaiTangID = lt.LoaiTangID
    LEFT JOIN DonVi cs ON tn.CoSoID = cs.DonViID AND cs.LoaiDonVi = 'CO_SO'
`;

/**
 * Lấy danh sách Phòng với phân trang và bộ lọc
 * @param {Object} params - Tham số lọc và phân trang
 * @param {string} [params.searchTerm] - Từ khóa tìm kiếm
 * @param {number} [params.loaiPhongID] - Lọc theo loại phòng
 * @param {number} [params.trangThaiPhongID] - Lọc theo trạng thái phòng
 * @param {number} [params.toaNhaID] - Lọc theo tòa nhà
 * @param {number} [params.toaNhaTangID] - Lọc theo tầng
 * @param {number} [params.sucChuaTu] - Sức chứa từ
 * @param {number} [params.sucChuaDen] - Sức chứa đến
 * @param {number} [params.page=1] - Trang hiện tại
 * @param {number} [params.limit=10] - Số lượng mỗi trang
 * @param {string} [params.sortBy] - Trường sắp xếp
 * @param {string} [params.sortOrder] - Thứ tự sắp xếp
 * @returns {Promise<{items: object[], totalItems: number}>} Danh sách phòng và tổng số bản ghi
 */
const getPhongListWithPagination = async (params) => {
  const {
    searchTerm,
    loaiPhongID,
    trangThaiPhongID,
    toaNhaID,
    toaNhaTangID,
    sucChuaTu,
    sucChuaDen,
    page = 1,
    limit = 10,
    sortBy = 'p.TenPhong',
    sortOrder = 'ASC',
  } = params;

  let whereClause = ` WHERE 1=1 `;
  const queryParams = [];

  if (searchTerm) {
    whereClause += ` AND (p.TenPhong LIKE @SearchTerm OR p.MaPhong LIKE @SearchTerm OR p.SoThuTuPhong LIKE @SearchTerm) `;
    queryParams.push({
      name: 'SearchTerm',
      type: sql.NVarChar,
      value: `%${searchTerm}%`,
    });
  }
  if (loaiPhongID) {
    whereClause += ` AND p.LoaiPhongID = @LoaiPhongID `;
    queryParams.push({
      name: 'LoaiPhongID',
      type: sql.Int,
      value: loaiPhongID,
    });
  }
  if (trangThaiPhongID) {
    whereClause += ` AND p.TrangThaiPhongID = @TrangThaiPhongID `;
    queryParams.push({
      name: 'TrangThaiPhongID',
      type: sql.Int,
      value: trangThaiPhongID,
    });
  }
  if (toaNhaID) {
    whereClause += ` AND tnt.ToaNhaID = @ToaNhaID `;
    queryParams.push({ name: 'ToaNhaID', type: sql.Int, value: toaNhaID });
  }
  if (toaNhaTangID) {
    whereClause += ` AND p.ToaNhaTangID = @ToaNhaTangID `;
    queryParams.push({
      name: 'ToaNhaTangID',
      type: sql.Int,
      value: toaNhaTangID,
    });
  }
  if (sucChuaTu) {
    whereClause += ` AND p.SucChua >= @SucChuaTu `;
    queryParams.push({ name: 'SucChuaTu', type: sql.Int, value: sucChuaTu });
  }
  if (sucChuaDen) {
    whereClause += ` AND p.SucChua <= @SucChuaDen `;
    queryParams.push({ name: 'SucChuaDen', type: sql.Int, value: sucChuaDen });
  }

  const countQuery = `SELECT COUNT(DISTINCT p.PhongID) AS TotalItems ${FROM_JOIN_PHONG_FOR_LIST} ${whereClause}`;
  const countResult = await executeQuery(countQuery, queryParams);
  const totalItems = countResult.recordset[0].TotalItems;

  const allowedSortBy = [
    'p.TenPhong',
    'p.MaPhong',
    'p.SucChua',
    'lp.TenLoaiPhong',
    'tn.TenToaNha',
    'lt.TenLoaiTang',
  ];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'p.TenPhong';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const itemsQuery = `
        SELECT ${SELECT_PHONG_FIELDS_FOR_LIST}
        ${FROM_JOIN_PHONG_FOR_LIST}
        ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}, p.PhongID ${safeSortOrder}
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
    `;
  const itemsResult = await executeQuery(itemsQuery, queryParams);
  const items = itemsResult.recordset.map((row) => ({
    phongID: row.PhongID,
    tenPhong: row.TenPhong,
    maPhong: row.MaPhong,

    loaiPhong: {
      loaiPhongID: row.Phong_LoaiPhongID,
      tenLoaiPhong: row.Phong_TenLoaiPhong,
    },
    sucChua: row.SucChua,
    trangThaiPhong: {
      trangThaiPhongID: row.Phong_TrangThaiPhongID,
      tenTrangThai: row.Phong_TenTrangThaiPhong,
    },
    toaNhaTang: row.Phong_ToaNhaTangID
      ? {
          toaNhaTangID: row.Phong_ToaNhaTangID,
          toaNha: {
            toaNhaID: row.Phong_ToaNhaID,
            tenToaNha: row.Phong_TenToaNha,
            maToaNha: row.Phong_MaToaNha,
            coSo: row.Phong_CoSoID
              ? {
                  donViID: row.Phong_CoSoID,
                  tenDonVi: row.Phong_TenCoSo,
                  maDonVi: row.Phong_MaCoSo,
                  loaiDonVi: 'CO_SO',
                }
              : null,
          },
          loaiTang: {
            loaiTangID: row.Phong_LoaiTangID,
            tenLoaiTang: row.Phong_TenLoaiTang,
            maLoaiTang: row.Phong_MaLoaiTang,
          },
          moTa: null,
        }
      : null,
    soThuTuPhong: row.SoThuTuPhong,
    anhMinhHoa: row.AnhMinhHoa,
  }));
  return { items, totalItems };
};

/**
 * Lấy chi tiết của một Phòng theo ID
 * @param {number} phongID - ID của phòng
 * @returns {Promise<object|null>} Thông tin chi tiết phòng hoặc null nếu không tìm thấy
 */
const getPhongDetailById = async (phongID) => {
  const phongQuery = `
    SELECT ${SELECT_PHONG_FIELDS_FOR_LIST},
           p.MoTaChiTietPhong, p.AnhMinhHoa
           -- Thêm các cột khác từ bảng Phong nếu cần cho detail
    ${FROM_JOIN_PHONG_FOR_LIST}
    WHERE p.PhongID = @PhongID;
  `;
  const phongParams = [{ name: 'PhongID', type: sql.Int, value: phongID }];
  const phongResult = await executeQuery(phongQuery, phongParams);
  if (phongResult.recordset.length === 0) return null;
  const phongData = phongResult.recordset[0];

  // Lấy danh sách thiết bị trong phòng
  const thietBiQuery = `
    SELECT tb.ThietBiID, tb.TenThietBi, ptb.SoLuong, ptb.TinhTrang
    FROM Phong_ThietBi ptb
    JOIN TrangThietBi tb ON ptb.ThietBiID = tb.ThietBiID
    WHERE ptb.PhongID = @PhongID;
  `;

  const thietBiResult = await executeQuery(thietBiQuery, phongParams);
  const thietBiTrongPhong = thietBiResult.recordset.map((tb) => ({
    thietBi: {
      thietBiID: tb.ThietBiID,
      tenThietBi: tb.TenThietBi,
    },
    soLuong: tb.SoLuong,
    tinhTrang: tb.TinhTrang,
  }));

  return {
    phongID: phongData.PhongID,
    tenPhong: phongData.TenPhong,
    maPhong: phongData.MaPhong,
    loaiPhong: {
      loaiPhongID: phongData.Phong_LoaiPhongID,
      tenLoaiPhong: phongData.Phong_TenLoaiPhong,
    },
    sucChua: phongData.SucChua,
    trangThaiPhong: {
      trangThaiPhongID: phongData.Phong_TrangThaiPhongID,
      tenTrangThai: phongData.Phong_TenTrangThaiPhong,
    },
    toaNhaTang: phongData.Phong_ToaNhaTangID
      ? {
          toaNhaTangID: phongData.Phong_ToaNhaTangID,
          toaNha: {
            toaNhaID: phongData.Phong_ToaNhaID,
            tenToaNha: phongData.Phong_TenToaNha,
            maToaNha: phongData.Phong_MaToaNha,
            coSo: phongData.Phong_CoSoID
              ? {
                  donViID: phongData.Phong_CoSoID,
                  tenDonVi: phongData.Phong_TenCoSo,
                  maDonVi: phongData.Phong_MaCoSo,
                  loaiDonVi: 'CO_SO',
                }
              : null,
          },
          loaiTang: {
            loaiTangID: phongData.Phong_LoaiTangID,
            tenLoaiTang: phongData.Phong_TenLoaiTang,
            maLoaiTang: phongData.Phong_MaLoaiTang,
          },
          moTa: null,
        }
      : null,
    soThuTuPhong: phongData.SoThuTuPhong,
    moTaChiTietPhong: phongData.MoTaChiTietPhong,
    anhMinhHoa: phongData.AnhMinhHoa,
    thietBiTrongPhong,
  };
};

/**
 * Kiểm tra MaPhong đã tồn tại trong bảng Phong chưa
 * @param {string} maPhong - Mã phòng cần kiểm tra
 * @param {number|null} [excludePhongID=null] - Bỏ qua phòng có ID này (khi update)
 * @param {sql.Transaction|null} [transaction=null] - Transaction nếu có
 * @returns {Promise<boolean>} True nếu đã tồn tại
 */
const checkMaPhongExists = async (
  maPhong,
  excludePhongID = null,
  transaction = null
) => {
  if (!maPhong) return false;
  let query = `SELECT COUNT(*) as count FROM Phong WHERE MaPhong = @MaPhong`;
  const params = [{ name: 'MaPhong', type: sql.VarChar(50), value: maPhong }];
  if (excludePhongID) {
    query += ` AND PhongID <> @ExcludePhongID`;
    params.push({
      name: 'ExcludePhongID',
      type: sql.Int,
      value: excludePhongID,
    });
  }
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset[0].count > 0;
};

/**
 * Tạo một bản ghi Phòng mới
 * @param {object} phongData - Dữ liệu phòng
 * @param {sql.Transaction} transaction - Transaction
 * @returns {Promise<number>} ID của phòng vừa tạo
 */
const createPhongRecord = async (phongData, transaction) => {
  const {
    tenPhong,
    maPhong,
    loaiPhongID,
    sucChua,
    trangThaiPhongID,
    moTaChiTietPhong,
    anhMinhHoa,
    toaNhaTangID,
    soThuTuPhong,
  } = phongData;

  const query = `
    INSERT INTO Phong (
        TenPhong, MaPhong, LoaiPhongID, SucChua, TrangThaiPhongID,
        MoTaChiTietPhong, AnhMinhHoa, ToaNhaTangID, SoThuTuPhong
    )
    OUTPUT inserted.PhongID -- Chỉ cần ID để lấy lại chi tiết đầy đủ
    VALUES (
        @TenPhong, @MaPhong, @LoaiPhongID, @SucChua, @TrangThaiPhongID,
        @MoTaChiTietPhong, @AnhMinhHoa, @ToaNhaTangID, @SoThuTuPhong
    );
  `;
  const params = [
    { name: 'TenPhong', type: sql.NVarChar(150), value: tenPhong },
    { name: 'MaPhong', type: sql.VarChar(50), value: maPhong },
    { name: 'LoaiPhongID', type: sql.Int, value: loaiPhongID },
    { name: 'SucChua', type: sql.Int, value: sucChua },
    { name: 'TrangThaiPhongID', type: sql.Int, value: trangThaiPhongID },
    {
      name: 'MoTaChiTietPhong',
      type: sql.NVarChar(sql.MAX),
      value: moTaChiTietPhong,
    },
    { name: 'AnhMinhHoa', type: sql.VarChar(500), value: anhMinhHoa },
    { name: 'ToaNhaTangID', type: sql.Int, value: toaNhaTangID },
    { name: 'SoThuTuPhong', type: sql.NVarChar(20), value: soThuTuPhong },
  ];
  const request = transaction.request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset[0].PhongID;
};

/**
 * Thêm một thiết bị vào phòng
 * @param {number} phongID - ID phòng
 * @param {object} thietBiInput - Thông tin thiết bị { thietBiID, soLuong, tinhTrang }
 * @param {sql.Transaction} transaction - Transaction
 * @returns {Promise<void>}
 */
const addThietBiToPhong = async (phongID, thietBiInput, transaction) => {
  // thietBiInput: { thietBiID, soLuong, tinhTrang }
  const query = `
    INSERT INTO Phong_ThietBi (PhongID, ThietBiID, SoLuong, TinhTrang)
    VALUES (@PhongID, @ThietBiID, @SoLuong, @TinhTrang);
  `;
  const params = [
    { name: 'PhongID', type: sql.Int, value: phongID },
    { name: 'ThietBiID', type: sql.Int, value: thietBiInput.thietBiID },
    { name: 'SoLuong', type: sql.Int, value: thietBiInput.soLuong },
    {
      name: 'TinhTrang',
      type: sql.NVarChar(200),
      value: thietBiInput.tinhTrang,
    },
  ];
  const request = transaction.request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  await request.query(query);
};

/**
 * Xóa tất cả thiết bị của phòng (dùng khi cập nhật)
 * @param {number} phongID - ID phòng
 * @param {sql.Transaction} transaction - Transaction
 * @returns {Promise<void>}
 */
const clearThietBiFromPhong = async (phongID, transaction) => {
  const query = `DELETE FROM Phong_ThietBi WHERE PhongID = @PhongID;`;
  const params = [{ name: 'PhongID', type: sql.Int, value: phongID }];
  const request = transaction.request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  await request.query(query);
};

/**
 * Cập nhật thông tin một Phòng
 * @param {number} phongID - ID phòng
 * @param {object} updateData - Dữ liệu cập nhật
 * @param {sql.Transaction} transaction - Transaction
 * @returns {Promise<object|null>} Bản ghi phòng đã cập nhật hoặc chỉ ID
 */
const updatePhongRecordById = async (phongID, updateData, transaction) => {
  const setClauses = [];
  const params = [{ name: 'PhongID', type: sql.Int, value: phongID }];

  // Helper để thêm vào SET và params
  const addUpdateField = (dbField, paramName, paramType, value) => {
    if (value !== undefined) {
      setClauses.push(`${dbField} = @${paramName}`);
      params.push({
        name: paramName,
        type: paramType,
        value: value === null ? null : value,
      });
    }
  };

  addUpdateField(
    'TenPhong',
    'TenPhong',
    sql.NVarChar(150),
    updateData.tenPhong
  );
  addUpdateField('MaPhong', 'MaPhong', sql.VarChar(50), updateData.maPhong);
  addUpdateField('LoaiPhongID', 'LoaiPhongID', sql.Int, updateData.loaiPhongID);
  addUpdateField('SucChua', 'SucChua', sql.Int, updateData.sucChua);
  addUpdateField(
    'TrangThaiPhongID',
    'TrangThaiPhongID',
    sql.Int,
    updateData.trangThaiPhongID
  );
  addUpdateField(
    'MoTaChiTietPhong',
    'MoTaChiTietPhong',
    sql.NVarChar(sql.MAX),
    updateData.moTaChiTietPhong
  );
  addUpdateField(
    'AnhMinhHoa',
    'AnhMinhHoa',
    sql.VarChar(500),
    updateData.anhMinhHoa
  );
  addUpdateField(
    'ToaNhaTangID',
    'ToaNhaTangID',
    sql.Int,
    updateData.toaNhaTangID
  );
  addUpdateField(
    'SoThuTuPhong',
    'SoThuTuPhong',
    sql.NVarChar(20),
    updateData.soThuTuPhong
  );

  if (setClauses.length === 0) {
    return { PhongID: phongID };
  }

  const query = `
    UPDATE Phong
    SET ${setClauses.join(', ')}
    OUTPUT inserted.PhongID
    WHERE PhongID = @PhongID;
  `;

  const request = transaction.request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(query);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Kiểm tra phòng có tồn tại không (tối giản)
 * @param {number} phongID - ID phòng
 * @param {sql.Transaction|null} [transaction=null] - Transaction nếu có
 * @returns {Promise<object|null>} Thông tin phòng hoặc null
 */
const findPhongByIdMinimal = async (phongID, transaction = null) => {
  const query = `SELECT PhongID FROM Phong WHERE PhongID = @PhongID;`;
  const params = [{ name: 'PhongID', type: sql.Int, value: phongID }];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset.length > 0 ? result.recordset[0] : null;
};

/**
 * Kiểm tra phòng có đang được sử dụng trong ChiTietDatPhong không
 * @param {number} phongID - ID phòng
 * @param {sql.Transaction|null} [transaction=null] - Transaction nếu có
 * @returns {Promise<boolean>} True nếu đang được sử dụng
 */
const checkPhongUsageInChiTietDatPhong = async (
  phongID,
  transaction = null
) => {
  const query = ` 
    SELECT COUNT(*) AS UsageCount
    FROM ChiTietDatPhong cdp
    JOIN YcMuonPhongChiTiet yct ON cdp.YcMuonPhongCtID = yct.YcMuonPhongCtID
    JOIN TrangThaiYeuCauPhong tt_yct ON yct.TrangThaiCtID = tt_yct.TrangThaiYcpID
    WHERE cdp.PhongID = @PhongID
      -- Chỉ coi là đang sử dụng nếu chi tiết đặt phòng đó không phải là đã hủy hoặc yêu cầu gốc không phải đã hủy/từ chối toàn bộ
      -- AND tt_yct.MaTrangThai NOT LIKE '%HUY%' 
      -- AND tt_yct.MaTrangThai NOT LIKE '%TU_CHOI%' 
      -- Logic này có thể phức tạp hơn, ví dụ: chỉ tính các đặt phòng cho sự kiện chưa diễn ra hoặc đang diễn ra
      -- Tạm thời, chỉ cần có bản ghi là coi như đang có khả năng được sử dụng.
      -- Hoặc, chỉ kiểm tra các bản ghi ChiTietDatPhong mà sự kiện liên quan chưa "HOAN_THANH" hoặc "DA_HUY"
  `; // Hàm này sẽ phát triển sau
  // Để đơn giản và an toàn nhất, nếu có bất kỳ tham chiếu nào trong ChiTietDatPhong, không cho xóa.
  // Nếu muốn phức tạp hơn, cần JOIN thêm SuKien và YeuCauMuonPhong để kiểm tra trạng thái của chúng.
  const simpleCheckQuery = `SELECT COUNT(*) AS UsageCount FROM ChiTietDatPhong WHERE PhongID = @PhongID;`;
  const params = [{ name: 'PhongID', type: sql.Int, value: phongID }];
  const request = transaction
    ? transaction.request()
    : (await getPool()).request();
  params.forEach((param) => request.input(param.name, param.type, param.value));
  const result = await request.query(simpleCheckQuery);
  return result.recordset[0].UsageCount > 0;
};

/**
 * Xóa một Phòng và các bản ghi liên quan trong Phong_ThietBi
 * @param {number} phongID - ID phòng
 * @param {sql.Transaction} transaction - Transaction
 * @returns {Promise<number>} Số dòng bị ảnh hưởng (thường là 1 nếu xóa thành công)
 */
const deletePhongRecordById = async (phongID, transaction) => {
  const deleteThietBiQuery = `DELETE FROM Phong_ThietBi WHERE PhongID = @PhongID;`;
  const paramsPhongID = [{ name: 'PhongID', type: sql.Int, value: phongID }];
  let request = transaction.request();
  paramsPhongID.forEach((param) =>
    request.input(param.name, param.type, param.value)
  );
  await request.query(deleteThietBiQuery);

  const deletePhongQuery = `DELETE FROM Phong WHERE PhongID = @PhongID;`;
  request = transaction.request();
  paramsPhongID.forEach((param) =>
    request.input(param.name, param.type, param.value)
  );
  const result = await request.query(deletePhongQuery);
  return result.rowsAffected[0];
};

/**
 * Lấy danh sách các PhongID đã được đặt cho một SuKienID
 * @param {number} suKienID - ID sự kiện
 * @param {sql.Transaction} transaction - Transaction
 * @returns {Promise<number[]>} Mảng các PhongID
 */
const getPhongIDsBookedForSuKien = async (suKienID, transaction) => {
  const query = `
    SELECT DISTINCT cdp.PhongID
    FROM ChiTietDatPhong cdp
    JOIN YcMuonPhongChiTiet yct ON cdp.YcMuonPhongCtID = yct.YcMuonPhongCtID
    JOIN YeuCauMuonPhong yc ON yct.YcMuonPhongID = yc.YcMuonPhongID
    WHERE yc.SuKienID = @SuKienID;
  `;
  const params = [{ name: 'SuKienID', type: sql.Int, value: suKienID }];
  const request = transaction.request();
  params.forEach((p) => request.input(p.name, p.type, p.value));
  const result = await request.query(query);
  return result.recordset.map((row) => row.PhongID);
};

/**
 * Cập nhật trạng thái cho nhiều phòng
 * @param {number[]} phongIDs - Danh sách ID phòng
 * @param {number} trangThaiPhongIDMoi - ID trạng thái mới
 * @param {sql.Transaction} transaction - Transaction
 * @returns {Promise<void>}
 */
const updateTrangThaiNhieuPhong = async (
  phongIDs,
  trangThaiPhongIDMoi,
  transaction
) => {
  if (!phongIDs || phongIDs.length === 0) {
    return;
  }
  for (const phongID of phongIDs) {
    const query = `
      UPDATE Phong
      SET TrangThaiPhongID = @TrangThaiPhongIDMoi
      WHERE PhongID = @PhongID;
    `;
    const request = transaction.request();
    request.input('TrangThaiPhongIDMoi', sql.Int, trangThaiPhongIDMoi);
    request.input('PhongID', sql.Int, phongID);
    await request.query(query);
  }
};

// // Hàm lấy ID trạng thái phòng từ mã (cần tạo nếu chưa có, hoặc dùng hàm generic)
const getTrangThaiPhongIDByMa = async (maTrangThai, transaction = null) => {
  return suKienRepository.getTrangThaiIDByMaGeneric(
    maTrangThai,
    'TrangThaiPhong',
    'TrangThaiPhongID',
    'MaTrangThai',
    transaction
  );
};

export const phongCRUDRepository = {
  getPhongListWithPagination,
  getPhongDetailById,
  checkMaPhongExists,
  createPhongRecord,
  addThietBiToPhong,
  clearThietBiFromPhong,
  updatePhongRecordById,
  findPhongByIdMinimal,
  checkPhongUsageInChiTietDatPhong,
  deletePhongRecordById,
  getPhongIDsBookedForSuKien,
  updateTrangThaiNhieuPhong,
  getTrangThaiPhongIDByMa,
};
