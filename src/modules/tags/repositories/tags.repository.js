import { prisma } from '#src/core/prisma.js';
import { getPaginationOffset } from '#src/utils/pagination/pagination.js';

const TAG_INCLUDE = {
  tag_types: true,
  _count: {
    select: {
      game_tags: true,
    },
  },
};

export const findManyTagsRecord = async (
  { typeId = undefined, search = undefined, page, limit } = {},
  db = prisma,
) => {
  const where = {};

  if (typeId !== undefined) {
    where.type_id = typeId;
  }

  if (search !== undefined) {
    where.name = {
      contains: search,
    };
  }

  const [items, total] = await Promise.all([
    db.tags.findMany({
      where,
      include: TAG_INCLUDE,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: getPaginationOffset({ page, limit }),
      take: limit,
    }),
    db.tags.count({
      where,
    }),
  ]);

  return {
    items,
    total,
  };
};

export const findTagByIdRecord = async ({ tagId }, db = prisma) => {
  return db.tags.findUnique({
    where: {
      id: tagId,
    },
    include: TAG_INCLUDE,
  });
};

export const findTagsByIdsRecord = async ({ tagIds }, db = prisma) => {
  if (tagIds.length === 0) {
    return [];
  }

  return db.tags.findMany({
    where: {
      id: {
        in: tagIds,
      },
    },
    include: TAG_INCLUDE,
  });
};

export const createTagRecord = async ({ name, typeId }, db = prisma) => {
  return db.tags.create({
    data: {
      name,
      type_id: typeId,
    },
    include: TAG_INCLUDE,
  });
};

export const updateTagByIdRecord = async ({ tagId, data }, db = prisma) => {
  return db.tags.update({
    where: {
      id: tagId,
    },
    data,
    include: TAG_INCLUDE,
  });
};

export const deleteTagByIdRecord = async ({ tagId }, db = prisma) => {
  return db.tags.delete({
    where: {
      id: tagId,
    },
  });
};

export const findManyTagTypesRecord = async ({ withTags = false } = {}, db = prisma) => {
  const include = {
    _count: {
      select: {
        tags: true,
      },
    },
  };

  if (withTags) {
    include.tags = {
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    };
  }

  return db.tag_types.findMany({
    include,
    orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
  });
};

export const findTagTypeByIdRecord = async ({ typeId }, db = prisma) => {
  return db.tag_types.findUnique({
    where: {
      id: typeId,
    },
  });
};
