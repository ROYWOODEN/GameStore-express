function getStatusText(status) {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 413:
      return 'Payload Too Large';
    case 503:
      return 'Service Unavailable';
    default:
      return 'Internal Server Error';
  }
}

export function errorHandler(res, error) {
  // ЛОГИРУЕМ ВСЕГДА
  console.error('❌ Error:', error.debug || error.message || error);

  // 1️⃣ НАША ошибка — отдаем как есть
  if (error?.name === 'AppError') {
    const status = error.statusCode || 500;

    return res.status(status).json({
      success: false,
      error: {
        statusCode: status,
        statusText: getStatusText(status),
        type: error.type,
        message: error.message, // КЛЮЧ
        details: error.details,
      },
    });
  }

  // 2️⃣ ЧУЖИЕ ошибки — приводим к нашему формату
  let statusCode = 500;
  let type = 'InternalError';
  let message = 'errors.internal';

  // multer
  if (error?.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    type = 'UploadError';
    message = 'errors.upload.file_too_large';
  }

  if (error?.name === 'LIMIT_FILE_COUNT') {
    statusCode = 413;
    type = 'UploadError';
    message = 'errors.upload.too_many_files';
  }

  // jwt
  if (error?.name === 'JsonWebTokenError' || error?.name === 'UnauthorizedError') {
    statusCode = 401;
    type = 'AuthError';
    message = 'errors.auth.unauthorized';
  }

  // prisma
  if (error?.name === 'PrismaClientKnownRequestError') {
    statusCode = 503;
    type = 'DbError';
    message = 'errors.db.unavailable';
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      statusCode,
      statusText: getStatusText(statusCode),
      type,
      message,
      details: null,
    },
  });
}
