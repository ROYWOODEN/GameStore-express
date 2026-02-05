// utils/errorHandler.js
export function errorHandler(res, error) {
  console.error('❌ Error:', error);

  let status = error.status || error.statusCode || 500;

  let statusText = error.message || 'Internal Server Error';
  let userMessage = error.userMessage || 'Произошла ошибка сервера';

  //  корректируем статус
  switch (error.name) {
    case 'AppError':
      // всё уже есть
      break;

    case 'ValidationError':
      status = 400;
      break;

    case 'UnauthorizedError':
    case 'JsonWebTokenError':
      status = 401;
      statusText = 'Unauthorized';
      break;

    case 'ForbiddenError':
      status = 403;
      statusText = 'Access denied';
      break;

    case 'NotFoundError':
      status = 404;
      statusText = 'Not found';
      break;
    case 'LIMIT_FILE_COUNT':
      status = 413;
      break;

    case 'PrismaClientKnownRequestError':
    case 'DATABASE_ERROR':
      status = 503;
      statusText = 'Database error';
      userMessage = 'Ошибка базы данных, попробуйте позже';
      break;

    default:
      if (error.code === 'LIMIT_FILE_SIZE') {
        status = 413;
        statusText = 'File too large';
        userMessage = 'Файл слишком большой';
      }
      break;
  }

  res.status(status).json({
    success: false,
    error: {
      statusCode: status,
      statusText,
      message: userMessage,
    },
  });
}
