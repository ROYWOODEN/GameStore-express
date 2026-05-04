import crypto from 'node:crypto';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { AppError } from '#src/utils/errors/app-error.js';

const YOOKASSA_API_BASE_URL = 'https://api.yookassa.ru/v3';

const isPlaceholderValue = (value) => {
  return !value || value.startsWith('your_') || value.includes('<') || value.includes('...');
};

const getYooKassaConfig = () => {
  const shopId = String(process.env.YOOKASSA_SHOP_ID ?? '').trim();
  const secretKey = String(process.env.YOOKASSA_SECRET_KEY ?? '').trim();
  const returnUrl = String(process.env.YOOKASSA_RETURN_URL ?? '').trim();

  if (
    isPlaceholderValue(shopId) ||
    isPlaceholderValue(secretKey) ||
    isPlaceholderValue(returnUrl)
  ) {
    throw new AppError({
      debug:
        'YooKassa is not configured. YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY and YOOKASSA_RETURN_URL are required.',
      type: ERROR_TYPES.INTERNAL,
      message: ERROR_MESSAGES.PAYMENT_PROVIDER_NOT_CONFIGURED,
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
    });
  }

  return {
    shopId,
    secretKey,
    returnUrl,
  };
};

const buildYooKassaAuthHeader = ({ shopId, secretKey }) => {
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString('base64')}`;
};

const callYooKassaApi = async ({ method, path, body = null, idempotenceKey = null }) => {
  const config = getYooKassaConfig();
  const headers = {
    Authorization: buildYooKassaAuthHeader(config),
    Accept: 'application/json',
  };

  if (body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  if (idempotenceKey) {
    headers['Idempotence-Key'] = idempotenceKey;
  }

  const response = await fetch(`${YOOKASSA_API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === null ? null : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  const text = await response.text();
  const data = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      })()
    : null;

  if (!response.ok) {
    throw new AppError({
      debug: `YooKassa API request failed (${response.status}): ${text || 'empty_response'}`,
      type: ERROR_TYPES.DB,
      message: ERROR_MESSAGES.PAYMENT_CREATE_FAILED,
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
      details: data,
    });
  }

  return data;
};

export const createYooKassaPayment = async ({ orderId, paymentId, amount, currency }) => {
  const { returnUrl } = getYooKassaConfig();
  const idempotenceKey = crypto.randomUUID();

  const payload = {
    amount: {
      value: amount,
      currency,
    },
    capture: true,
    confirmation: {
      type: 'redirect',
      return_url: returnUrl,
    },
    description: `Order #${orderId}`,
    metadata: {
      order_id: String(orderId),
      payment_id: String(paymentId),
    },
    save_payment_method: false,
  };

  const payment = await callYooKassaApi({
    method: 'POST',
    path: '/payments',
    body: payload,
    idempotenceKey,
  });

  return {
    payment,
    idempotenceKey,
  };
};

export const getYooKassaPayment = async (externalPaymentId) => {
  getYooKassaConfig();

  return callYooKassaApi({
    method: 'GET',
    path: `/payments/${externalPaymentId}`,
  });
};

export { getYooKassaConfig };
