export class AppError extends Error {
  constructor({
    debug = 'Unexpected error',
    type = 'AppError',
    message = 'errors.internal',
    statusCode = 500,
    details = null,
  }) {
    super(debug);

    this.name = 'AppError'; // маркер, что это наша ошибка
    this.debug = debug; // для логов
    this.type = type; // ValidationError, AuthError и т.п.
    this.message = message; // КЛЮЧ для фронта
    this.statusCode = statusCode;
    this.details = details;
  }
}
