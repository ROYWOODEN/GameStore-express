export class AppError extends Error {
  constructor(message, name = 'AppError', userMessage = null, status = 500) {
    super(message);
    this.name = name;
    this.status = status;
    this.userMessage = userMessage;
  }
}
