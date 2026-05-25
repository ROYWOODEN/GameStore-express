// Error messages (for i18n)
export const ERROR_MESSAGES = {
  // Common
  INTERNAL: 'errors.internal',
  NOT_FOUND: 'errors.common.not_found',

  AUTH_UNAUTHORIZED: 'errors.auth.unauthorized', // Нет токена / вообще левый
  AUTH_EXPIRED: 'errors.auth.expired', // Access протух (сигнал для рефреша)
  AUTH_REFRESH_FAILED: 'errors.auth.refresh_failed', // Когда даже рефреш не помог
  AUTH_ALREADY_AUTHORIZED: 'errors.auth.already_authorized',
  AUTH_FORBIDDEN: 'errors.auth.forbidden',
  AUTH_INVALID_CREDENTIALS: 'errors.auth.invalid_credentials',
  AUTH_OAUTH_FAILED: 'errors.auth.oauth_failed',
  AUTH_OAUTH_NOT_CONFIGURED: 'errors.auth.oauth_not_configured',

  AUTH_VALIDATION: 'errors.auth.validation',
  AUTH_EMAIL_TAKEN: 'errors.auth.email_taken',
  BASKET_ALREADY_EXISTS: 'errors.basket.already_exists',
  CHECKOUT_EMPTY: 'errors.checkout.empty',
  CHECKOUT_ALREADY_OWNED: 'errors.checkout.already_owned',
  CHECKOUT_NOT_IN_BASKET: 'errors.checkout.not_in_basket',
  FAVORITE_ALREADY_EXISTS: 'errors.favorites.already_exists',
  GAME_TITLE_TAKEN: 'errors.games.title_taken',
  PAYMENT_CREATE_FAILED: 'errors.payments.create_failed',
  PAYMENT_PROVIDER_NOT_CONFIGURED: 'errors.payments.provider_not_configured',
  PAYMENT_WEBHOOK_INVALID: 'errors.payments.webhook_invalid',
  REVIEW_ALREADY_EXISTS: 'errors.reviews.already_exists',
  REVIEW_GAME_NOT_OWNED: 'errors.reviews.game_not_owned',
  USER_EMAIL_TAKEN: 'errors.users.email_taken',
  VALIDATION_FAILED: 'errors.validation.failed',
  FILES_REQUIRED: 'errors.validation.files_required',
  INVALID_FILE_TYPE: 'errors.validation.invalid_file_type',
  NO_FIELDS_TO_UPDATE: 'errors.validation.no_fields_to_update',
  NO_VALID_FIELDS_TO_UPDATE: 'errors.validation.no_valid_fields_to_update',
  UPLOAD_FILE_TOO_LARGE: 'errors.upload.file_too_large',
  UPLOAD_TOO_MANY_FILES: 'errors.upload.too_many_files',
  UPLOAD_UNKNOWN_TYPE: 'errors.upload.unknown_type',
  UPLOAD_UNEXPECTED_UPLOAD_ERROR: 'errors.upload.unexpected_upload_error',
  UPLOAD_FAILED: 'errors.upload.failed',
  DB_UNAVAILABLE: 'errors.db.unavailable',
};
