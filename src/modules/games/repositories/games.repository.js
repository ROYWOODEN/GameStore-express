import { prisma } from '#src/core/prisma.js';
import { buildTargetFileUrl } from '#src/modules/files/index.js';
import { getPaginationOffset } from '#src/utils/pagination/pagination.js';

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

const buildGamesListWhere = ({ search = undefined, tagIds = [], tagMode = 'all' }) => {
  const where = {};
  const and = [];

  if (search !== undefined) {
    and.push({
      OR: [
        {
          title: {
            contains: search,
          },
        },
        {
          description: {
            contains: search,
          },
        },
        {
          game_tags: {
            some: {
              tags: {
                name: {
                  contains: search,
                },
              },
            },
          },
        },
      ],
    });
  }

  if (tagIds.length > 0) {
    if (tagMode === 'any') {
      and.push({
        game_tags: {
          some: {
            tags_id: {
              in: tagIds,
            },
          },
        },
      });
    } else {
      and.push(
        ...tagIds.map((tagId) => ({
          game_tags: {
            some: {
              tags_id: tagId,
            },
          },
        })),
      );
    }
  }

  if (and.length > 0) {
    where.AND = and;
  }

  return where;
};

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

export const findManyGames = async ({ search, tagIds, tagMode, page, limit }) => {
  const where = buildGamesListWhere({
    search,
    tagIds,
    tagMode,
  });

  const [games, total] = await Promise.all([
    prisma.games.findMany({
      where,
      include: GAME_LIST_INCLUDE,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      skip: getPaginationOffset({ page, limit }),
      take: limit,
    }),
    prisma.games.count({
      where,
    }),
  ]);

  return {
    items: await attachGameRatingSummaries(games),
    total,
  };
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

const createGameTags = async ({ db, gameId, tagIds }) => {
  if (!tagIds?.length) {
    return;
  }

  await db.game_tags.createMany({
    data: tagIds.map((tagId) => ({
      game_id: gameId,
      tags_id: tagId,
    })),
    skipDuplicates: true,
  });
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

    await createGameTags({
      db: tx,
      gameId: gameRow.id,
      tagIds: game.tagIds,
    });

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

export const updateGameById = async (id, data, { tagIds = undefined } = {}) => {
  await prisma.$transaction(async (tx) => {
    await tx.games.update({
      where: {
        id,
      },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });

    if (tagIds !== undefined) {
      await tx.game_tags.deleteMany({
        where: {
          game_id: id,
        },
      });

      await createGameTags({
        db: tx,
        gameId: id,
        tagIds,
      });
    }
  });
};
