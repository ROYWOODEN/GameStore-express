export class AppError extends Error {
  constructor(message, name = 'AppError', userMessage = null, statusCode = 500) {
    super(message);
    this.name = name;
    this.statusCode = statusCode;
    this.userMessage = userMessage;
  }
}
