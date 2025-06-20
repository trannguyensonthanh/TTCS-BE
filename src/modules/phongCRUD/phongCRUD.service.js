// src/modules/phongCRUD/phongCRUD.service.js
import { phongCRUDRepository } from './phongCRUD.repository.js';
import ApiError from '../../utils/ApiError.util.js';
import httpStatus from '../../constants/httpStatus.js';
import xlsx from 'xlsx'; // Thư viện đọc file Excel
import fs from 'fs'; // Để xóa file tạm nếu dùng diskStorage
import sql from 'mssql';
import { toaNhaTangRepository } from '../toaNhaTang/toaNhaTang.repository.js'; // Để validate
import logger from '../../utils/logger.util.js';
import { getPool } from '../../utils/database.js';
import { loaiPhongRepository } from '../danhMuc/loaiPhong.repository.js';
import { trangThaiPhongRepository } from '../trangThaiPhong/trangThaiPhong.repository.js';
import { trangThietBiRepository } from '../trangThietBi/trangThietBi.repository.js';

/**
 * Lấy danh sách phòng với phân trang và bộ lọc.
 * @param {object} params - Tham số lọc, phân trang, sắp xếp.
 * @returns {Promise<{items: object[], totalPages: number, currentPage: number, totalItems: number, pageSize: number}>}
 */
const getPhongs = async (params) => {
  const { items, totalItems } =
    await phongCRUDRepository.getPhongListWithPagination(params);
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 10;
  const totalPages = Math.ceil(totalItems / limit);
  return { items, totalPages, currentPage: page, totalItems, pageSize: limit };
};

/**
 * Lấy chi tiết một phòng theo ID.
 * @param {number} phongID - ID phòng.
 * @returns {Promise<object>} Thông tin chi tiết phòng.
 * @throws {ApiError} Nếu phòng không tồn tại.
 */
const getPhongDetail = async (phongID) => {
  const phong = await phongCRUDRepository.getPhongDetailById(phongID);
  if (!phong) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Phòng không tồn tại.');
  }
  return phong;
};

/**
 * Tạo mới một phòng và các thiết bị liên quan.
 * @param {object} phongBody - Thông tin phòng và thiết bị (CreatePhongPayload).
 * @returns {Promise<object>} Thông tin phòng vừa tạo.
 * @throws {ApiError} Nếu mã phòng đã tồn tại hoặc dữ liệu không hợp lệ.
 */
const createPhong = async (phongBody) => {
  const { thietBiTrongPhong, ...phongData } = phongBody;

  // 1. Validate các FKs
  if (
    phongData.maPhong &&
    (await phongCRUDRepository.checkMaPhongExists(phongData.maPhong))
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Mã phòng "${phongData.maPhong}" đã tồn tại.`
    );
  }
  const loaiPhong = await loaiPhongRepository.getLoaiPhongById(
    phongData.loaiPhongID
  );
  if (!loaiPhong)
    throw new ApiError(httpStatus.BAD_REQUEST, 'Loại phòng không hợp lệ.');
  const trangThaiPhong = await trangThaiPhongRepository.getTrangThaiPhongById(
    phongData.trangThaiPhongID
  );
  if (!trangThaiPhong)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Trạng thái phòng không hợp lệ.'
    );
  const toaNhaTang = await toaNhaTangRepository.getToaNhaTangById(
    phongData.toaNhaTangID
  );
  if (!toaNhaTang)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Tầng của tòa nhà không hợp lệ.'
    );

  logger.info(
    'TODO: Implement full FK validation for LoaiPhong, TrangThaiPhong, ToaNhaTang in createPhong service.'
  );

  // 2. Validate ThietBiID trong thietBiTrongPhong
  if (thietBiTrongPhong && thietBiTrongPhong.length > 0) {
    for (const tb of thietBiTrongPhong) {
      const thietBi = await trangThietBiRepository.getTrangThietBiById(
        tb.thietBiID
      );
      if (!thietBi)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Thiết bị ID ${tb.thietBiID} không hợp lệ.`
        );
      logger.info(`TODO: Validate ThietBiID ${tb.thietBiID} if it exists.`);
    }
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    logger.debug('Transaction started for creating Phong');

    const newPhongID = await phongCRUDRepository.createPhongRecord(
      phongData,
      transaction
    );
    logger.debug(`Phong created with ID: ${newPhongID}`);

    if (thietBiTrongPhong && thietBiTrongPhong.length > 0) {
      for (const tbInput of thietBiTrongPhong) {
        await phongCRUDRepository.addThietBiToPhong(
          newPhongID,
          tbInput,
          transaction
        );
      }
      logger.debug(`ThietBiTrongPhong added for PhongID: ${newPhongID}`);
    }

    await transaction.commit();
    logger.info(`Transaction committed for creating PhongID: ${newPhongID}`);

    return phongCRUDRepository.getPhongDetailById(newPhongID);
  } catch (error) {
    logger.error(
      'Error during Phong creation transaction, rolling back...',
      error
    );
    if (transaction) {
      try {
        await transaction.rollback();
        logger.info('Transaction rolled back.');
      } catch (rbError) {
        logger.error('Error during transaction rollback:', rbError);
      }
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Tạo phòng thất bại do lỗi hệ thống.'
    );
  }
};

/**
 * Cập nhật thông tin một phòng và danh sách thiết bị của nó.
 * @param {number} phongID - ID phòng cần cập nhật.
 * @param {object} updateBody - Thông tin cập nhật (UpdatePhongPayload).
 * @returns {Promise<object>} Thông tin phòng đã cập nhật.
 * @throws {ApiError} Nếu phòng không tồn tại hoặc dữ liệu không hợp lệ.
 */
const updatePhong = async (phongID, updateBody) => {
  const { thietBiTrongPhong, ...phongUpdateData } = updateBody;

  // 1. Kiểm tra Phòng có tồn tại không
  const existingPhong = await phongCRUDRepository.findPhongByIdMinimal(phongID);
  if (!existingPhong) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Phòng không tồn tại.');
  }

  // 2. Validate các FKs nếu chúng được cập nhật
  if (
    phongUpdateData.maPhong &&
    phongUpdateData.maPhong !== existingPhong.MaPhong
  ) {
    if (
      await phongCRUDRepository.checkMaPhongExists(
        phongUpdateData.maPhong,
        phongID
      )
    ) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Mã phòng "${phongUpdateData.maPhong}" đã tồn tại.`
      );
    }
  }
  if (phongUpdateData.loaiPhongID) {
    const loaiPhong = await loaiPhongRepository.getLoaiPhongById(
      phongUpdateData.loaiPhongID
    );
    if (!loaiPhong)
      throw new ApiError(httpStatus.BAD_REQUEST, 'Loại phòng không hợp lệ.');
    logger.info(
      `TODO: Validate LoaiPhongID ${phongUpdateData.loaiPhongID} on update.`
    );
  }
  if (phongUpdateData.trangThaiPhongID) {
    // const trangThaiPhong = await trangThaiPhongRepository.getTrangThaiPhongById(phongUpdateData.trangThaiPhongID);
    // if (!trangThaiPhong) throw new ApiError(httpStatus.BAD_REQUEST, 'Trạng thái phòng không hợp lệ.');
    logger.info(
      `TODO: Validate TrangThaiPhongID ${phongUpdateData.trangThaiPhongID} on update.`
    );
  }
  if (phongUpdateData.toaNhaTangID) {
    const toaNhaTang = await toaNhaTangRepository.getToaNhaTangById(
      phongUpdateData.toaNhaTangID
    );
    if (!toaNhaTang)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Tầng của tòa nhà không hợp lệ.'
      );
    logger.info(
      `TODO: Validate ToaNhaTangID ${phongUpdateData.toaNhaTangID} on update.`
    );
  }

  // 3. Validate ThietBiID trong thietBiTrongPhong
  if (thietBiTrongPhong && thietBiTrongPhong.length > 0) {
    for (const tb of thietBiTrongPhong) {
      const thietBi = await trangThietBiRepository.getTrangThietBiById(
        tb.thietBiID
      );
      if (!thietBi)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Thiết bị ID ${tb.thietBiID} không hợp lệ.`
        );
      logger.info(
        `TODO: Validate ThietBiID ${tb.thietBiID} in thietBiTrongPhong on update.`
      );
    }
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    logger.debug(`Transaction started for updating PhongID: ${phongID}`);

    // 4. Cập nhật thông tin cơ bản của Phòng
    if (Object.keys(phongUpdateData).length > 0) {
      await phongCRUDRepository.updatePhongRecordById(
        phongID,
        phongUpdateData,
        transaction
      );
      logger.debug(`Phong record updated for ID: ${phongID}`);
    }

    // 5. Xử lý thietBiTrongPhong: Ghi đè toàn bộ
    if (thietBiTrongPhong !== undefined) {
      await phongCRUDRepository.clearThietBiFromPhong(phongID, transaction);
      logger.debug(
        `Cleared existing ThietBiTrongPhong for PhongID: ${phongID}`
      );
      if (thietBiTrongPhong.length > 0) {
        for (const tbInput of thietBiTrongPhong) {
          await phongCRUDRepository.addThietBiToPhong(
            phongID,
            tbInput,
            transaction
          );
        }
        logger.debug(`Added new ThietBiTrongPhong for PhongID: ${phongID}`);
      }
    }

    await transaction.commit();
    logger.info(`Transaction committed for updating PhongID: ${phongID}`);

    return phongCRUDRepository.getPhongDetailById(phongID);
  } catch (error) {
    logger.error(
      `Error during Phong update transaction for ID: ${phongID}, rolling back...`,
      error
    );
    if (transaction) {
      try {
        await transaction.rollback();
        logger.info('Transaction rolled back.');
      } catch (rbError) {
        logger.error('Error during transaction rollback:', rbError);
      }
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Cập nhật phòng thất bại do lỗi hệ thống.'
    );
  }
};

/**
 * Xóa một phòng theo ID.
 * @param {number} phongID - ID phòng cần xóa.
 * @returns {Promise<void>} Không trả về dữ liệu nếu xóa thành công.
 * @throws {ApiError} Nếu phòng không tồn tại hoặc đang được sử dụng.
 */
const deletePhong = async (phongID) => {
  // 1. Kiểm tra Phòng có tồn tại không
  const existingPhong = await phongCRUDRepository.findPhongByIdMinimal(phongID);
  if (!existingPhong) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Phòng không tồn tại.');
  }

  // 2. Kiểm tra ràng buộc: Phòng có đang được sử dụng không
  const isUsed =
    await phongCRUDRepository.checkPhongUsageInChiTietDatPhong(phongID);
  if (isUsed) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Phòng này đang được đặt cho một hoặc nhiều sự kiện và không thể xóa. Vui lòng hủy các đặt phòng liên quan trước.'
    );
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    logger.debug(`Transaction started for deleting PhongID: ${phongID}`);

    const rowsAffected = await phongCRUDRepository.deletePhongRecordById(
      phongID,
      transaction
    );

    if (rowsAffected === 0) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Xóa phòng thất bại, phòng không tìm thấy trong transaction.'
      );
    }

    await transaction.commit();
    logger.info(`Transaction committed for deleting PhongID: ${phongID}`);
  } catch (error) {
    logger.error(
      `Error during Phong deletion transaction for ID: ${phongID}, rolling back...`,
      error
    );
    if (transaction) {
      try {
        await transaction.rollback();
        logger.info('Transaction rolled back.');
      } catch (rbError) {
        logger.error('Error during transaction rollback:', rbError);
      }
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Xóa phòng thất bại do lỗi hệ thống.'
    );
  }
};

/**
 * Sinh mã phòng gợi ý và kiểm tra tính duy nhất.
 * @param {object} params - { toaNhaTangID, loaiPhongID, soThuTuPhong, phongID }
 * @returns {Promise<{ maPhongGoiY: string, isUnique: boolean, message: string }>} Thông tin mã phòng gợi ý.
 */
const generateMaPhong = async (params) => {
  const { toaNhaTangID, loaiPhongID, soThuTuPhong, phongID } = params;

  // 1. Lấy thông tin cần thiết từ DB
  const toaNhaTang = await toaNhaTangRepository.getToaNhaTangById(toaNhaTangID);
  if (!toaNhaTang) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tầng không hợp lệ.');
  }

  let loaiPhong = null;
  if (loaiPhongID) {
    loaiPhong = await loaiPhongRepository.getLoaiPhongById(loaiPhongID); // Cần tạo hàm này
  }

  // 2. Logic tạo mã dựa trên quy tắc của bạn
  let maPhongGoiY = '';
  const { toaNha, loaiTang } = toaNhaTang;

  // Logic lấy mã cơ sở (ví dụ)
  let maCoSo = 'CS';
  if (toaNha.coSo?.maDonVi?.includes('Q1')) maCoSo = '1';
  else if (toaNha.coSo?.maDonVi?.includes('Q9')) maCoSo = '2';

  const maToaNha = toaNha.maToaNha || '';
  const maLoaiTang = loaiTang.maLoaiTang || '';

  // Logic tạo mã
  // Ưu tiên cho các phòng học thông thường
  if (maToaNha && maLoaiTang && soThuTuPhong) {
    // Đảm bảo số thứ tự có 2 chữ số nếu là số
    const formattedSoThuTu = soThuTuPhong.match(/^\d+$/)
      ? soThuTuPhong.padStart(2, '0')
      : soThuTuPhong.toUpperCase();
    maPhongGoiY = `${maCoSo}${maToaNha}${maLoaiTang}${formattedSoThuTu}`;
  }
  // Logic cho các phòng đặc biệt (ví dụ: Hội trường, Phòng Lab)
  else if (maToaNha && loaiPhong) {
    let maLoaiPhongVietTat = loaiPhong.TenLoaiPhong.substring(
      0,
      2
    ).toUpperCase(); // Ví dụ: "Hội trường" -> "HỘ"
    if (loaiPhong.tenLoaiPhong.toLowerCase().includes('hội trường'))
      maLoaiPhongVietTat = 'HT';
    if (loaiPhong.tenLoaiPhong.toLowerCase().includes('lab'))
      maLoaiPhongVietTat = 'LAB';

    maPhongGoiY = `${maToaNha}-${maLoaiPhongVietTat}${soThuTuPhong || ''}`;
  }

  if (!maPhongGoiY) {
    return {
      maPhongGoiY: '',
      isUnique: false,
      message: 'Không đủ thông tin để tạo mã.',
    };
  }

  // 3. Kiểm tra tính duy nhất của mã vừa tạo
  const isMaPhongUsed = await phongCRUDRepository.checkMaPhongExists(
    maPhongGoiY,
    phongID
  );

  return {
    maPhongGoiY,
    isUnique: !isMaPhongUsed,
    message: isMaPhongUsed
      ? 'Mã phòng gợi ý đã được sử dụng.'
      : 'Tạo mã phòng gợi ý thành công.',
  };
};

/**
 * Import danh sách Phòng từ file Excel
 * @param {string} filePath - Đường dẫn đến file Excel đã upload
 * @returns {Promise<ImportPhongResponse>}
 */
const importPhongFromExcel = async (filePath) => {
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  let totalRowsInFile = 0;

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Giả sử dữ liệu ở sheet đầu tiên
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
    }); // header: 1 để lấy mảng các mảng

    if (jsonData.length <= 1) {
      // Dòng header + ít nhất 1 dòng dữ liệu
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'File Excel không có dữ liệu hoặc không đúng định dạng.'
      );
    }

    const headers = jsonData[0].map((h) => h.toString().trim()); // Lấy header và trim
    totalRowsInFile = jsonData.length - 1;

    // Định nghĩa các cột mong đợi và tên tương ứng trong CSDL/payload
    const expectedHeadersMap = {
      TenPhong: 'tenPhong',
      MaPhong: 'maPhong',
      LoaiPhongID: 'loaiPhongID',
      SucChua: 'sucChua',
      TrangThaiPhongID: 'trangThaiPhongID',
      ToaNhaTangID: 'toaNhaTangID',
      SoThuTuPhong: 'soThuTuPhong',
      MoTaChiTietPhong: 'moTaChiTietPhong',
      AnhMinhHoa: 'anhMinhHoa',
      ThietBiTrongPhong: 'thietBiTrongPhong', // Chuỗi JSON
    };
    const actualHeaders = Object.keys(expectedHeadersMap).filter((h) =>
      headers.includes(h)
    );

    for (let i = 1; i < jsonData.length; i++) {
      const rowDataArray = jsonData[i];
      const rowNumber = i + 1; // Số dòng trong Excel (bao gồm header)
      let phongPayload = {};
      let rowError = null;

      headers.forEach((header, index) => {
        if (expectedHeadersMap[header]) {
          phongPayload[expectedHeadersMap[header]] = rowDataArray[index];
        }
      });

      // Validate dữ liệu cơ bản của dòng
      if (
        !phongPayload.tenPhong ||
        !phongPayload.loaiPhongID ||
        !phongPayload.trangThaiPhongID ||
        !phongPayload.toaNhaTangID
      ) {
        rowError =
          'Thiếu thông tin bắt buộc: Tên phòng, Loại phòng ID, Trạng thái phòng ID, Tòa nhà tầng ID.';
      } else {
        // Parse và validate các trường số
        phongPayload.loaiPhongID = parseInt(phongPayload.loaiPhongID, 10);
        phongPayload.trangThaiPhongID = parseInt(
          phongPayload.trangThaiPhongID,
          10
        );
        phongPayload.toaNhaTangID = parseInt(phongPayload.toaNhaTangID, 10);
        if (
          isNaN(phongPayload.loaiPhongID) ||
          isNaN(phongPayload.trangThaiPhongID) ||
          isNaN(phongPayload.toaNhaTangID)
        ) {
          rowError =
            'ID Loại phòng, Trạng thái phòng, Tòa nhà tầng phải là số.';
        }
        if (phongPayload.sucChua) {
          phongPayload.sucChua = parseInt(phongPayload.sucChua, 10);
          if (isNaN(phongPayload.sucChua))
            rowError =
              (rowError ? rowError + '; ' : '') + 'Sức chứa phải là số.';
        }
        // Xử lý ThietBiTrongPhong (chuỗi JSON)
        if (
          phongPayload.thietBiTrongPhong &&
          typeof phongPayload.thietBiTrongPhong === 'string'
        ) {
          try {
            phongPayload.thietBiTrongPhong = JSON.parse(
              phongPayload.thietBiTrongPhong
            );
            if (!Array.isArray(phongPayload.thietBiTrongPhong))
              throw new Error();
            // TODO: Validate từng item trong mảng thietBiTrongPhong (thietBiID, soLuong)
          } catch (e) {
            rowError =
              (rowError ? rowError + '; ' : '') +
              'Cột ThietBiTrongPhong không phải là JSON array hợp lệ.';
          }
        } else if (phongPayload.thietBiTrongPhong) {
          // Nếu không phải string và không phải null/undefined
          rowError =
            (rowError ? rowError + '; ' : '') +
            'Cột ThietBiTrongPhong phải là chuỗi JSON.';
        } else {
          phongPayload.thietBiTrongPhong = []; // Mặc định là mảng rỗng nếu không có hoặc null
        }
      }

      if (rowError) {
        results.push({
          rowNumber,
          tenPhong: phongPayload.tenPhong || `Dòng ${rowNumber}`,
          maPhong: phongPayload.maPhong,
          status: 'error',
          message: rowError,
        });
        errorCount++;
        continue; // Bỏ qua dòng này
      }

      // Nếu không có lỗi cơ bản, tiến hành tạo trong transaction
      const pool = await getPool();
      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();

        // Validate FKs và unique constraints
        if (
          phongPayload.maPhong &&
          (await phongCRUDRepository.checkMaPhongExists(
            phongPayload.maPhong,
            null,
            transaction
          ))
        ) {
          throw new Error(`Mã phòng "${phongPayload.maPhong}" đã tồn tại.`);
        }
        const loaiPhong = await loaiPhongRepository.getLoaiPhongById(
          phongPayload.loaiPhongID,
          transaction
        );
        if (!loaiPhong)
          throw new Error(
            `Loại phòng ID ${phongPayload.loaiPhongID} không tồn tại.`
          );
        const trangThaiPhong =
          await trangThaiPhongRepository.getTrangThaiPhongById(
            phongPayload.trangThaiPhongID,
            transaction
          );
        if (!trangThaiPhong)
          throw new Error(
            `Trạng thái phòng ID ${phongPayload.trangThaiPhongID} không tồn tại.`
          );
        const toaNhaTang = await toaNhaTangRepository.getToaNhaTangById(
          phongPayload.toaNhaTangID,
          transaction
        );
        if (!toaNhaTang)
          throw new Error(
            `Tòa nhà tầng ID ${phongPayload.toaNhaTangID} không tồn tại.`
          );
        logger.info(
          `TODO: Full FK validation for Excel import row ${rowNumber}`
        );

        const newPhongID = await phongCRUDRepository.createPhongRecord(
          phongPayload,
          transaction
        );

        if (
          phongPayload.thietBiTrongPhong &&
          phongPayload.thietBiTrongPhong.length > 0
        ) {
          for (const tbInput of phongPayload.thietBiTrongPhong) {
            const thietBi = await trangThietBiRepository.getTrangThietBiById(
              tbInput.thietBiID,
              transaction
            );
            if (!thietBi)
              throw new Error(
                `Thiết bị ID ${tbInput.thietBiID} không hợp lệ trong danh sách thiết bị.`
              );
            await phongCRUDRepository.addThietBiToPhong(
              newPhongID,
              tbInput,
              transaction
            );
          }
        }

        await transaction.commit();
        results.push({
          rowNumber,
          tenPhong: phongPayload.tenPhong,
          maPhong: phongPayload.maPhong,
          status: 'success',
          phongID: newPhongID,
        });
        successCount++;
      } catch (err) {
        if (
          transaction &&
          transaction.rolledBack === false &&
          transaction.active
        ) {
          await transaction.rollback();
        }
        results.push({
          rowNumber,
          tenPhong: phongPayload.tenPhong,
          maPhong: phongPayload.maPhong,
          status: 'error',
          message: err.message,
        });
        errorCount++;
      }
    }
  } catch (err) {
    logger.error('Error processing Excel file for Phong import:', err);
    // Nếu lỗi xảy ra ở giai đoạn đọc file hoặc xử lý header
    return {
      totalRows: totalRowsInFile || 0,
      successCount: 0,
      errorCount: totalRowsInFile || 0,
      results: [
        {
          rowNumber: 0,
          status: 'error',
          message: `Lỗi xử lý file: ${err.message}`,
        },
      ],
      overallMessage: 'Xử lý file Excel thất bại.',
    };
  } finally {
    // Xóa file tạm sau khi xử lý (nếu dùng diskStorage)
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        logger.info(`Temporary Excel file deleted: ${filePath}`);
      } catch (e) {
        logger.error(`Error deleting temporary Excel file ${filePath}:`, e);
      }
    }
  }

  return {
    totalRows: totalRowsInFile,
    successCount,
    errorCount,
    results,
    overallMessage: `Import hoàn tất. Thành công: ${successCount}/${totalRowsInFile}. Lỗi: ${errorCount}/${totalRowsInFile}.`,
  };
};

export const phongCRUDService = {
  getPhongs,
  getPhongDetail,
  createPhong,
  updatePhong,
  deletePhong,
  generateMaPhong,
  importPhongFromExcel,
};
