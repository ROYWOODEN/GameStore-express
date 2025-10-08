export class AppError extends Error {
  constructor(message, name = 'AppError') {
    super(message);
    this.name = name;
  }
}
