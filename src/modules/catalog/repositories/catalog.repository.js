import { prisma } from '#src/core/prisma.js';

export const findCatalogTagTypesRecord = async (db = prisma) => {
  return db.tag_types.findMany({
    select: {
      id: true,
      name: true,
    },
  });
};

export const findCatalogGenreRecords = async ({ typeIds }, db = prisma) => {
  return db.tags.findMany({
    where: {
      type_id: {
        in: typeIds,
      },
    },
    include: {
      _count: {
        select: {
          game_tags: true,
        },
      },
      game_tags: {
        orderBy: [{ game_id: 'asc' }, { id: 'asc' }],
        include: {
          games: {
            include: {
              game_images: {
                select: {
                  url: true,
                  alt: true,
                },
                orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
                take: 1,
              },
            },
          },
        },
      },
    },
  });
};
