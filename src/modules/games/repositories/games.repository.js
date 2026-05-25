import { prisma } from '#src/core/prisma.js';
import { buildTargetFileUrl } from '#src/modules/files/index.js';

const GAME_LIST_INCLUDE = {
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

const GAME_DETAIL_INCLUDE = {
  game_images: { orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] },
  game_videos: true,
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

const formatRatingSummary = (ratingRow) => ({
  average:
    ratingRow?._avg.rating === null || ratingRow?._avg.rating === undefined
      ? null
      : Number(Number(ratingRow._avg.rating).toFixed(1)),
  count: ratingRow?._count.rating ?? 0,
});

export const attachGameRatingSummaries = async (games, db = prisma) => {
  if (games.length === 0) {
    return games;
  }

  const gameIds = games.map((game) => game.id);
  const ratingRows = await db.game_reviews.groupBy({
    by: ['game_id'],
    where: {
      game_id: {
        in: gameIds,
      },
    },
    _avg: {
      rating: true,
    },
    _count: {
      rating: true,
    },
  });

  const ratingByGameId = new Map(
    ratingRows.map((ratingRow) => [String(ratingRow.game_id), formatRatingSummary(ratingRow)]),
  );

  return games.map((game) => ({
    ...game,
    rating_summary: ratingByGameId.get(String(game.id)) ?? {
      average: null,
      count: 0,
    },
  }));
};

export const findManyGames = async () => {
  const games = await prisma.games.findMany({
    include: GAME_LIST_INCLUDE,
  });

  return attachGameRatingSummaries(games);
};

export const findGameById = async (id) => {
  const game = await prisma.games.findUnique({
    where: {
      id,
    },
    include: GAME_DETAIL_INCLUDE,
  });

  if (!game) {
    return null;
  }

  const [gameWithRating] = await attachGameRatingSummaries([game]);
  return gameWithRating;
};

export const createGameWithImagesRecord = async (game, files) => {
  const created = await prisma.$transaction(async (tx) => {
    const gameRow = await tx.games.create({
      data: {
        title: game.title,
        description: game.description,
        price: game.price,
      },
      select: {
        id: true,
      },
    });

    if (files?.length) {
      await tx.game_images.createMany({
        data: files.map((file, index) => ({
          game_id: gameRow.id,
          url: buildTargetFileUrl('game_images', file.filename),
          alt: game.title,
          sort_order: index,
        })),
      });
    }

    return gameRow;
  });

  return created.id;
};

export const findGameImagesByGameId = async (id) => {
  return prisma.game_images.findMany({
    where: {
      game_id: id,
    },
  });
};

export const deleteGameById = async (id) => {
  await prisma.games.delete({
    where: {
      id,
    },
  });
};

export const updateGameById = async (id, data) => {
  await prisma.games.update({
    where: {
      id,
    },
    data,
  });
};
