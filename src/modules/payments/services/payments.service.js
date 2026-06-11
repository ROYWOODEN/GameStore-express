import { Prisma } from '@prisma/client';
import { ERROR_MESSAGES } from '#src/constants/error-messages.js';
import { ERROR_TYPES, HTTP_STATUS } from '#src/constants/http-statuses.js';
import { formatGameList } from '#src/modules/games/mappers/game.mappers.js';
import { attachGameRatingSummaries } from '#src/modules/games/repositories/games.repository.js';
import { AppError } from '#src/utils/errors/app-error.js';
import { mapZodIssues } from '#src/utils/zod/map-zod-issues.js';
import {
  createOrderItemsRecord,
  createOrderRecord,
  createPaymentRecord,
  createUserGamesRecord,
  createWebhookEventRecord,
  cancelOrdersWithPaymentsRecord,
  deleteBasketItemsByUserAndGameIdsRecord,
  findActiveUserGamesByUserAndGameIdsRecord,
  findBasketItemsByUserAndGameIdsRecord,
  findGamesByIdsRecord,
  findLibraryByUserIdRecord,
  findLibraryGameIdsByUserIdRecord,
  findOrderByIdAndUserIdRecord,
  findOrderItemsByOrderIdRecord,
  findOrdersByUserIdRecord,
  findPaymentByExternalPaymentIdRecord,
  findWaitingOrdersByUserAndGameIdsRecord,
  findWebhookEventRecord,
  markWebhookEventProcessedRecord,
  updateOrderByIdRecord,
  updatePaymentByIdRecord,
} from '../repositories/payments.repository.js';
import {
  createCheckoutPaymentSchema,
  yookassaWebhookSchema,
} from '../validators/payments.schemas.js';
import { createYooKassaPayment, getYooKassaConfig, getYooKassaPayment } from '../utils/yookassa.js';
import { prisma } from '#src/core/prisma.js';

const buildOrderNotFoundError = () =>
  new AppError({
    debug: 'Order not found',
    type: ERROR_TYPES.NOT_FOUND,
    message: ERROR_MESSAGES.NOT_FOUND,
    details: { resource: 'order' },
  });

const ORDER_STATUSES = new Set(['waiting_for_payment', 'paid', 'canceled', 'failed']);
const ORDER_SOURCES = new Set(['basket']);

const parseCheckoutGameIds = (values) => {
  const parsedIds = [];
  const seenIds = new Set();

  for (const value of values) {
    let gameId;
    try {
      gameId = BigInt(value);
    } catch {
      throw new AppError({
        debug: `Invalid gameId: ${value}`,
        type: ERROR_TYPES.VALIDATION,
        message: ERROR_MESSAGES.VALIDATION_FAILED,
        details: { fields: ['gameIds'] },
      });
    }

    const normalized = String(gameId);
    if (seenIds.has(normalized)) {
      throw new AppError({
        debug: `Duplicate gameId in checkout payload: ${normalized}`,
        type: ERROR_TYPES.VALIDATION,
        message: ERROR_MESSAGES.VALIDATION_FAILED,
        details: { fields: ['gameIds'] },
      });
    }

    seenIds.add(normalized);
    parsedIds.push(gameId);
  }

  return parsedIds;
};

const assertGamesFound = ({ gameIds, games }) => {
  const foundIds = new Set(games.map((game) => String(game.id)));
  const missingIds = gameIds.map(String).filter((id) => !foundIds.has(id));

  if (missingIds.length === 0) {
    return;
  }

  throw new AppError({
    debug: `Games not found for checkout: ${missingIds.join(', ')}`,
    type: ERROR_TYPES.NOT_FOUND,
    message: ERROR_MESSAGES.NOT_FOUND,
    details: {
      resource: 'game',
      ids: missingIds,
    },
  });
};

const assertGamesNotOwned = ({ ownedGames }) => {
  if (ownedGames.length === 0) {
    return;
  }

  throw new AppError({
    debug: `User already owns games: ${ownedGames.map((item) => String(item.game_id)).join(', ')}`,
    type: ERROR_TYPES.VALIDATION,
    message: ERROR_MESSAGES.CHECKOUT_ALREADY_OWNED,
    statusCode: HTTP_STATUS.CONFLICT,
    details: {
      gameIds: ownedGames.map((item) => item.game_id),
    },
  });
};

const assertBasketContainsSelectedGames = ({ requestedGameIds, basketItems }) => {
  const basketGameIds = new Set(basketItems.map((item) => String(item.game_id)));
  const missingIds = requestedGameIds.map(String).filter((id) => !basketGameIds.has(id));

  if (missingIds.length === 0) {
    return;
  }

  throw new AppError({
    debug: `Selected basket games were not found in basket: ${missingIds.join(', ')}`,
    type: ERROR_TYPES.VALIDATION,
    message: ERROR_MESSAGES.CHECKOUT_NOT_IN_BASKET,
    statusCode: HTTP_STATUS.BAD_REQUEST,
    details: {
      gameIds: missingIds,
    },
  });
};

const buildCheckoutAmount = (games) => {
  return games.reduce((sum, game) => sum.plus(game.price), new Prisma.Decimal(0));
};

const mapPaymentStatus = (status) => {
  switch (status) {
    case 'pending':
    case 'waiting_for_capture':
    case 'succeeded':
    case 'canceled':
      return status;
    default:
      return 'failed';
  }
};

const isTerminalPaymentStatus = (status) => {
  return status === 'succeeded' || status === 'canceled' || status === 'failed';
};

const parseBooleanFlag = (value, fallback) => {
  if (value === undefined) {
    return fallback;
  }

  if (value === true || value === 'true' || value === '1') {
    return true;
  }

  if (value === false || value === 'false' || value === '0') {
    return false;
  }

  throw new AppError({
    debug: `Invalid boolean flag: ${String(value)}`,
    type: ERROR_TYPES.VALIDATION,
    message: ERROR_MESSAGES.VALIDATION_FAILED,
  });
};

const parseOrdersLimit = (rawLimit) => {
  if (rawLimit === undefined) {
    return 20;
  }

  const limit = Number.parseInt(String(rawLimit), 10);

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new AppError({
      debug: `Invalid orders limit: ${String(rawLimit)}`,
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: { fields: ['limit'] },
    });
  }

  return limit;
};

const parseOrderStatusFilter = (rawStatus) => {
  if (rawStatus === undefined) {
    return null;
  }

  const status = String(rawStatus).trim();

  if (!ORDER_STATUSES.has(status)) {
    throw new AppError({
      debug: `Invalid order status filter: ${status}`,
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: { fields: ['status'] },
    });
  }

  return status;
};

const parseOrderSourceFilter = (rawSource) => {
  if (rawSource === undefined) {
    return null;
  }

  const source = String(rawSource).trim();

  if (!ORDER_SOURCES.has(source)) {
    throw new AppError({
      debug: `Invalid order source filter: ${source}`,
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: { fields: ['source'] },
    });
  }

  return source;
};

const formatOrderDetails = (order) => {
  return {
    id: order.id,
    status: order.status,
    source: order.source,
    currency: order.currency,
    total_amount: order.total_amount,
    paid_at: order.paid_at,
    canceled_at: order.canceled_at,
    created_at: order.created_at,
    items: order.order_items.map((item) => ({
      id: item.id,
      game_id: item.game_id,
      title_snapshot: item.title_snapshot,
      price_snapshot: item.price_snapshot,
    })),
    payment:
      order.payments[0] === undefined
        ? null
        : {
            id: order.payments[0].id,
            provider: order.payments[0].provider,
            status: order.payments[0].status,
            amount: order.payments[0].amount,
            currency: order.payments[0].currency,
            confirmation_url: order.payments[0].confirmation_url,
            paid_at: order.payments[0].paid_at,
            canceled_at: order.payments[0].canceled_at,
          },
  };
};

const syncPendingOrders = async (orders) => {
  const syncTargets = orders.filter((order) => {
    const latestPayment = order.payments[0] ?? null;

    return (
      latestPayment &&
      latestPayment.provider === 'yookassa' &&
      latestPayment.external_payment_id &&
      !isTerminalPaymentStatus(latestPayment.status)
    );
  });

  for (const order of syncTargets) {
    await syncPaymentStateFromProvider({
      externalPaymentId: order.payments[0].external_payment_id,
    });
  }
};

const syncPaymentStateFromProvider = async ({
  externalPaymentId,
  paymentState = null,
  webhookEventId = null,
}) => {
  const resolvedPaymentState = paymentState ?? (await getYooKassaPayment(externalPaymentId));
  const payment = await findPaymentByExternalPaymentIdRecord({ externalPaymentId });

  if (!payment) {
    if (webhookEventId !== null) {
      await markWebhookEventProcessedRecord({ webhookEventId });
    }

    return null;
  }

  const normalizedStatus = mapPaymentStatus(resolvedPaymentState.status);

  await prisma.$transaction(async (tx) => {
    const orderStatusBeforeSync = payment.orders.status;

    await updatePaymentByIdRecord(
      {
        paymentId: payment.id,
        data: {
          status: normalizedStatus,
          raw_payload: resolvedPaymentState,
          confirmation_url: resolvedPaymentState.confirmation?.confirmation_url ?? null,
          paid_at: normalizedStatus === 'succeeded' ? new Date() : payment.paid_at,
          canceled_at: normalizedStatus === 'canceled' ? new Date() : payment.canceled_at,
        },
      },
      tx,
    );

    if (normalizedStatus === 'succeeded') {
      if (orderStatusBeforeSync !== 'waiting_for_payment') {
        if (webhookEventId !== null) {
          await markWebhookEventProcessedRecord({ webhookEventId }, tx);
        }

        return;
      }

      await updateOrderByIdRecord(
        {
          orderId: payment.orders.id,
          data: {
            status: 'paid',
            paid_at: new Date(),
          },
        },
        tx,
      );

      await createUserGamesRecord(
        {
          userId: payment.orders.user_id,
          orderItems: payment.orders.order_items,
        },
        tx,
      );

      await deleteBasketItemsByUserAndGameIdsRecord(
        {
          userId: payment.orders.user_id,
          gameIds: payment.orders.order_items.map((item) => item.game_id),
        },
        tx,
      );
    }

    if (normalizedStatus === 'canceled' || normalizedStatus === 'failed') {
      await updateOrderByIdRecord(
        {
          orderId: payment.orders.id,
          data: {
            status: normalizedStatus === 'canceled' ? 'canceled' : 'failed',
            canceled_at: normalizedStatus === 'canceled' ? new Date() : payment.orders.canceled_at,
          },
        },
        tx,
      );
    }

    if (webhookEventId !== null) {
      await markWebhookEventProcessedRecord({ webhookEventId }, tx);
    }
  });

  return normalizedStatus;
};

export const createCheckoutPayment = async ({ userId, body }) => {
  const parsed = createCheckoutPaymentSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError({
      debug: 'Invalid checkout payload',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: mapZodIssues(parsed.error.issues),
    });
  }

  if (parsed.data.length === 0) {
    throw new AppError({
      debug: 'Checkout payload contains no games',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.CHECKOUT_EMPTY,
      details: { fields: ['gameIds'] },
    });
  }

  const gameIds = parseCheckoutGameIds(parsed.data);
  const source = 'basket';

  const draftOrder = await prisma.$transaction(async (tx) => {
    const games = await findGamesByIdsRecord({ gameIds }, tx);
    assertGamesFound({ gameIds, games });

    const ownedGames = await findActiveUserGamesByUserAndGameIdsRecord({ userId, gameIds }, tx);
    assertGamesNotOwned({ ownedGames });

    const basketItems = await findBasketItemsByUserAndGameIdsRecord({ userId, gameIds }, tx);
    assertBasketContainsSelectedGames({
      requestedGameIds: gameIds,
      basketItems,
    });

    const waitingOrders = await findWaitingOrdersByUserAndGameIdsRecord({ userId, gameIds }, tx);
    await cancelOrdersWithPaymentsRecord(
      {
        orderIds: waitingOrders.map((order) => order.id),
      },
      tx,
    );

    const totalAmount = buildCheckoutAmount(games);
    const paidAt = totalAmount.equals(0) ? new Date() : null;

    const order = await createOrderRecord(
      {
        userId,
        source,
        currency: 'RUB',
        totalAmount: totalAmount.toFixed(2),
        ...(paidAt === null ? {} : { status: 'paid', paidAt }),
      },
      tx,
    );

    await createOrderItemsRecord(
      {
        orderId: order.id,
        items: games.map((game) => ({
          gameId: game.id,
          titleSnapshot: game.title,
          priceSnapshot: game.price,
        })),
      },
      tx,
    );

    if (paidAt !== null) {
      const orderItems = await findOrderItemsByOrderIdRecord({ orderId: order.id }, tx);

      await createUserGamesRecord(
        {
          userId,
          orderItems,
        },
        tx,
      );

      await deleteBasketItemsByUserAndGameIdsRecord(
        {
          userId,
          gameIds,
        },
        tx,
      );

      return {
        orderId: order.id,
        paymentId: null,
        externalPaymentId: null,
        status: 'succeeded',
        confirmationUrl: null,
        amount: totalAmount.toFixed(2),
        currency: 'RUB',
      };
    }

    const payment = await createPaymentRecord(
      {
        orderId: order.id,
        amount: totalAmount.toFixed(2),
        currency: 'RUB',
      },
      tx,
    );

    return {
      orderId: order.id,
      paymentId: payment.id,
      amount: totalAmount.toFixed(2),
      currency: 'RUB',
    };
  });

  if (draftOrder.paymentId === null) {
    return draftOrder;
  }

  try {
    getYooKassaConfig();

    const { payment, idempotenceKey } = await createYooKassaPayment({
      orderId: draftOrder.orderId,
      paymentId: draftOrder.paymentId,
      amount: draftOrder.amount,
      currency: draftOrder.currency,
    });

    await updatePaymentByIdRecord({
      paymentId: draftOrder.paymentId,
      data: {
        external_payment_id: payment.id,
        idempotence_key: idempotenceKey,
        status: mapPaymentStatus(payment.status),
        confirmation_url: payment.confirmation?.confirmation_url ?? null,
        raw_payload: payment,
        paid_at: payment.status === 'succeeded' ? new Date() : null,
        canceled_at: payment.status === 'canceled' ? new Date() : null,
      },
    });

    const normalizedStatus = mapPaymentStatus(payment.status);

    if (isTerminalPaymentStatus(normalizedStatus)) {
      await syncPaymentStateFromProvider({
        externalPaymentId: payment.id,
        paymentState: payment,
      });
    }

    return {
      orderId: draftOrder.orderId,
      paymentId: draftOrder.paymentId,
      externalPaymentId: payment.id,
      status: normalizedStatus,
      confirmationUrl: payment.confirmation?.confirmation_url ?? null,
      amount: draftOrder.amount,
      currency: draftOrder.currency,
    };
  } catch (error) {
    await updatePaymentByIdRecord({
      paymentId: draftOrder.paymentId,
      data: {
        status: 'failed',
        raw_payload: {
          error: error?.message ?? 'unknown_error',
          details: error?.details ?? null,
        },
      },
    });

    await updateOrderByIdRecord({
      orderId: draftOrder.orderId,
      data: {
        status: 'failed',
      },
    });

    throw error;
  }
};

export const processYooKassaWebhook = async ({ payload }) => {
  const parsed = yookassaWebhookSchema.safeParse(payload);

  if (!parsed.success) {
    throw new AppError({
      debug: 'Invalid YooKassa webhook payload',
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.PAYMENT_WEBHOOK_INVALID,
      details: mapZodIssues(parsed.error.issues),
    });
  }

  const eventType = parsed.data.event;
  const externalPaymentId = parsed.data.object.id;

  let webhookEvent = await findWebhookEventRecord({
    provider: 'yookassa',
    eventType,
    externalObjectId: externalPaymentId,
  });

  if (webhookEvent?.is_processed) {
    return;
  }

  if (!webhookEvent) {
    try {
      webhookEvent = await createWebhookEventRecord({
        provider: 'yookassa',
        eventType,
        externalObjectId: externalPaymentId,
        payload: parsed.data,
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }

      webhookEvent = await findWebhookEventRecord({
        provider: 'yookassa',
        eventType,
        externalObjectId: externalPaymentId,
      });
    }
  }

  const paymentState = await getYooKassaPayment(externalPaymentId);
  await syncPaymentStateFromProvider({
    externalPaymentId,
    paymentState,
    webhookEventId: webhookEvent.id,
  });
};

export const getCurrentUserOrderStatus = async ({ userId, orderId: rawOrderId }) => {
  let orderId;
  try {
    orderId = BigInt(rawOrderId);
  } catch {
    throw new AppError({
      debug: `Invalid orderId: ${rawOrderId}`,
      type: ERROR_TYPES.VALIDATION,
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      details: { fields: ['orderId'] },
    });
  }

  let order = await findOrderByIdAndUserIdRecord({
    orderId,
    userId,
  });

  if (!order) {
    throw buildOrderNotFoundError();
  }

  const latestPayment = order.payments[0] ?? null;

  if (
    latestPayment &&
    latestPayment.provider === 'yookassa' &&
    latestPayment.external_payment_id &&
    !isTerminalPaymentStatus(latestPayment.status)
  ) {
    await syncPaymentStateFromProvider({
      externalPaymentId: latestPayment.external_payment_id,
    });

    order = await findOrderByIdAndUserIdRecord({
      orderId,
      userId,
    });

    if (!order) {
      throw buildOrderNotFoundError();
    }
  }

  return formatOrderDetails(order);
};

export const listCurrentUserOrders = async ({ userId, query = {} }) => {
  const status = parseOrderStatusFilter(query.status);
  const source = parseOrderSourceFilter(query.source);
  const limit = parseOrdersLimit(query.limit);
  const syncPending = parseBooleanFlag(query.sync_pending, true);

  let orders = await findOrdersByUserIdRecord({
    userId,
    status,
    source,
    limit,
  });

  if (syncPending) {
    await syncPendingOrders(orders);

    orders = await findOrdersByUserIdRecord({
      userId,
      status,
      source,
      limit,
    });
  }

  return orders.map(formatOrderDetails);
};

export const listCurrentUserPendingOrders = async ({ userId, query = {} }) => {
  const limit = parseOrdersLimit(query.limit);
  const syncPending = parseBooleanFlag(query.sync_pending, true);

  let orders = await findOrdersByUserIdRecord({
    userId,
    status: 'waiting_for_payment',
    source: parseOrderSourceFilter(query.source),
    limit,
  });

  if (syncPending) {
    await syncPendingOrders(orders);

    orders = await findOrdersByUserIdRecord({
      userId,
      status: 'waiting_for_payment',
      source: parseOrderSourceFilter(query.source),
      limit,
    });
  }

  return orders.map(formatOrderDetails);
};

export const listCurrentUserLibrary = async (userId) => {
  const libraryRows = await findLibraryByUserIdRecord({ userId });
  const gamesWithRating = await attachGameRatingSummaries(
    libraryRows.map((libraryRow) => libraryRow.games),
  );

  return libraryRows.map((libraryRow, index) => ({
    granted_at: libraryRow.granted_at,
    game: formatGameList(gamesWithRating[index]),
  }));
};

export const listCurrentUserLibraryGameIds = async (userId) => {
  const libraryRows = await findLibraryGameIdsByUserIdRecord({ userId });
  return libraryRows.map((item) => item.game_id);
};
