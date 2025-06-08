// src/utils/pick.util.js
/**
 * Tạo một object mới chỉ chứa các thuộc tính được chọn từ object gốc.
 * Đầu vào: object (object), keys (mảng string)
 * Đầu ra: object mới chỉ chứa các key được chọn
 */
const pick = (object, keys) => {
  return keys.reduce((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      obj[key] = object[key];
    }
    return obj;
  }, {});
};

export default pick;
