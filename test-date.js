const now = new Date();

// In ra giờ local theo máy m (thường là giờ Việt Nam)
console.log('🕒 Giờ local (máy m):        ', now.toString());

// In ra giờ UTC chuẩn bên trong của Date object
console.log('🌍 Giờ UTC:                  ', now.toUTCString());

// In ra định dạng ISO (chuẩn để lưu vào DB) → luôn là UTC
console.log('📦 ISO (UTC lưu vào DB):     ', now.toISOString());

// Lấy timestamp (số mili giây từ 1970 UTC)
console.log('⏱️ Timestamp (UTC gốc):      ', now.getTime());
