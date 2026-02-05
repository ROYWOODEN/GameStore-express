// utils/errorHandler.js
export function errorHandler(res, error) {
  console.error('❌ Error:', error.message || error);

  let status = error.status || 500;
  let message = error.message || 'Internal Server Error';
  let userMessage = error.userMessage || 'Произошла ошибка сервера';

  // Проверяем по типу ошибки
  switch (error.name) {
    case 'AppError':
      message = error.message;
      break;
    // Ошибка валидации данных (например Joi, Zod, Prisma)
    case 'ValidationError':
      status = 400;
      message = 'Validation Error';
      break;

    // Ошибка авторизации — битый или просроченный JWT токен
    case 'UnauthorizedError':
    case 'JsonWebTokenError':
      status = 401;
      message = 'Invalid or expired token';
      break;

    // Нет прав доступа
    case 'ForbiddenError':
      status = 403;
      message = 'Access denied';
      break;

    // Не найден ресурс
    case 'NotFoundError':
      status = 404;
      message = 'Resource not found';
      break;

    // Проблемы с базой данных (например Prisma)
    case 'PrismaClientKnownRequestError':
    case 'DATABASE_ERROR':
      status = 503;
      message = 'Database error. Try again later';
      break;

    // Ошибка сети (например не достучался до внешнего API)
    case 'FetchError':
      status = 502;
      message = 'Network error. Unable to connect to external service';
      break;

    default:
      // Проверка по системным кодам
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        status = 503;
        message = 'No internet connection or service unavailable';
      } else if (error.code === 'LIMIT_FILE_SIZE') {
        status = 413;
        message = 'Uploaded file is too large';
      } else if (error.statusCode) {
        status = error.statusCode;
        message = error.message || message;
      }
      break;
  }

  res.status(status).json({
    success: false,
    error: {
      statusCode: status,
      StatusText: message,
      message: userMessage,
    },
  });
}
