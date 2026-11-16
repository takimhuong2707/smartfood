export function notFound(req, res) {
  res.status(404).json({ message: 'Không tìm thấy đường dẫn' });
}

export function errorHandler(err, req, res, next) {
  if (err.code === 11000) return res.status(409).json({ message: 'Dữ liệu đã tồn tại' });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Mã không hợp lệ' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });

  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ message: status === 500 ? 'Lỗi máy chủ' : err.message });
}