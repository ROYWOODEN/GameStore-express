import crypto from 'node:crypto';
import { prisma } from '#src/core/prisma.js';

const PAYMENT_GAME_INCLUDE = {
  game_images: {
    orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    take: 1,
  },
  game_tags: {
    include: {
      tags: {
        include: {
          tag_types: true,
        },
      },
    },
  },
};

const ORDER_WITH_DETAILS_INCLUDE = {
  order_items: {
    orderBy: {
      id: 'asc',
    },
  },
  payments: {
    orderBy: {
      created_at: 'desc',
    },
    take: 1,
  },
};

const buildOrdersListWhere = ({ userId, status = null, source = null }) => {
  const where = {
    user_id: userId,
  };

  if (status !== null) {
    where.status = status;
  }

  if (source !== null) {
    where.source = source;
  }

  return where;
};

export const findGamesByIdsRecord = async ({ gameIds }, db = prisma) => {
  return db.games.findMany({
    where: {
      id: {
        in: gameIds,
      },
    },
    include: PAYMENT_GAME_INCLUDE,
  });
};

export const findActiveUserGamesByUserAndGameIdsRecord = async (
  { userId, gameIds },
  db = prisma,
) => {
  return db.user_games.findMany({
    where: {
      user_id: userId,
      game_id: {
        in: gameIds,
      },
      status: 'active',
    },
    select: {
      game_id: true,
    },
  });
};

export const findBasketItemsByUserAndGameIdsRecord = async ({ userId, gameIds }, db = prisma) => {
  return db.basket.findMany({
    where: {
      user_id: userId,
      game_id: {
        in: gameIds,
      },
    },
    select: {
      game_id: true,
    },
  });
};

export const findWaitingOrdersByUserAndGameIdsRecord = async ({ userId, gameIds }, db = prisma) => {
  return db.orders.findMany({
    where: {
      user_id: userId,
      status: 'waiting_for_payment',
      order_items: {
        some: {
          game_id: {
            in: gameIds,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });
};

export const cancelOrdersWithPaymentsRecord = async ({ orderIds }, db = prisma) => {
  if (orderIds.length === 0) {
    return {
      ordersCount: 0,
      paymentsCount: 0,
    };
  }

  const canceledAt = new Date();

  const [orders, payments] = await Promise.all([
    db.orders.updateMany({
      where: {
        id: {
          in: orderIds,
        },
        status: 'waiting_for_payment',
      },
      data: {
        status: 'canceled',
        canceled_at: canceledAt,
        updated_at: canceledAt,
      },
    }),
    db.payments.updateMany({
      where: {
        order_id: {
          in: orderIds,
        },
        status: {
          in: ['pending', 'waiting_for_capture'],
        },
      },
      data: {
        status: 'canceled',
        confirmation_url: null,
        canceled_at: canceledAt,
        updated_at: canceledAt,
      },
    }),
  ]);

  return {
    ordersCount: orders.count,
    paymentsCount: payments.count,
  };
};

export const createOrderRecord = async (
  { userId, source, currency, totalAmount, status, paidAt },
  db = prisma,
) => {
  return db.orders.create({
    data: {
      user_id: userId,
      source,
      currency,
      total_amount: totalAmount,
      ...(status === undefined ? {} : { status }),
      ...(paidAt === undefined ? {} : { paid_at: paidAt }),
      updated_at: new Date(),
    },
  });
};

export const createOrderItemsRecord = async ({ orderId, items }, db = prisma) => {
  return db.order_items.createMany({
    data: items.map((item) => ({
      order_id: orderId,
      game_id: item.gameId,
      title_snapshot: item.titleSnapshot,
      price_snapshot: item.priceSnapshot,
    })),
  });
};

export const findOrderItemsByOrderIdRecord = async ({ orderId }, db = prisma) => {
  return db.order_items.findMany({
    where: {
      order_id: orderId,
    },
    orderBy: {
      id: 'asc',
    },
  });
};

export const createPaymentRecord = async ({ orderId, amount, currency }, db = prisma) => {
  return db.payments.create({
    data: {
      order_id: orderId,
      amount,
      currency,
      updated_at: new Date(),
      idempotence_key: crypto.randomUUID(),
    },
  });
};

export const updatePaymentByIdRecord = async ({ paymentId, data }, db = prisma) => {
  return db.payments.update({
    where: {
      id: paymentId,
    },
    data: {
      ...data,
      updated_at: new Date(),
    },
  });
};

export const updateOrderByIdRecord = async ({ orderId, data }, db = prisma) => {
  return db.orders.update({
    where: {
      id: orderId,
    },
    data: {
      ...data,
      updated_at: new Date(),
    },
  });
};

export const findPaymentByExternalPaymentIdRecord = async ({ externalPaymentId }, db = prisma) => {
  return db.payments.findUnique({
    where: {
      external_payment_id: externalPaymentId,
    },
    include: {
      orders: {
        include: {
          order_items: true,
        },
      },
    },
  });
};

export const findOrderByIdAndUserIdRecord = async ({ orderId, userId }, db = prisma) => {
  return db.orders.findFirst({
    where: {
      id: orderId,
      user_id: userId,
    },
    include: ORDER_WITH_DETAILS_INCLUDE,
  });
};

export const findOrdersByUserIdRecord = async (
  { userId, status = null, source = null, limit = 20 },
  db = prisma,
) => {
  return db.orders.findMany({
    where: buildOrdersListWhere({ userId, status, source }),
    include: ORDER_WITH_DETAILS_INCLUDE,
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: limit,
  });
};

export const findWebhookEventRecord = async (
  { provider, eventType, externalObjectId },
  db = prisma,
) => {
  return db.payment_webhook_events.findFirst({
    where: {
      provider,
      event_type: eventType,
      external_object_id: externalObjectId,
    },
  });
};

export const createWebhookEventRecord = async (
  { provider, eventType, externalObjectId, payload },
  db = prisma,
) => {
  return db.payment_webhook_events.create({
    data: {
      provider,
      event_type: eventType,
      external_object_id: externalObjectId,
      payload,
    },
  });
};

export const markWebhookEventProcessedRecord = async ({ webhookEventId }, db = prisma) => {
  return db.payment_webhook_events.update({
    where: {
      id: webhookEventId,
    },
    data: {
      is_processed: true,
      processed_at: new Date(),
    },
  });
};

export const createUserGamesRecord = async ({ userId, orderItems }, db = prisma) => {
  return db.user_games.createMany({
    data: orderItems.map((item) => ({
      user_id: userId,
      game_id: item.game_id,
      order_item_id: item.id,
      status: 'active',
    })),
    skipDuplicates: true,
  });
};

export const deleteBasketItemsByUserAndGameIdsRecord = async ({ userId, gameIds }, db = prisma) => {
  return db.basket.deleteMany({
    where: {
      user_id: userId,
      game_id: {
        in: gameIds,
      },
    },
  });
};

export const findLibraryByUserIdRecord = async ({ userId }, db = prisma) => {
  return db.user_games.findMany({
    where: {
      user_id: userId,
      status: 'active',
    },
    include: {
      games: {
        include: PAYMENT_GAME_INCLUDE,
      },
    },
    orderBy: {
      granted_at: 'desc',
    },
  });
};

export const findLibraryGameIdsByUserIdRecord = async ({ userId }, db = prisma) => {
  return db.user_games.findMany({
    where: {
      user_id: userId,
      status: 'active',
    },
    select: {
      game_id: true,
    },
    orderBy: {
      granted_at: 'desc',
    },
  });
};
