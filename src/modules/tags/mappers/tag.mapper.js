export const formatTagType = (tagType) => ({
  id: tagType.id,
  name: tagType.name,
  sort_order: tagType.sort_order,
  tags_count: tagType._count?.tags ?? tagType.tags?.length ?? 0,
  ...(tagType.tags
    ? {
        tags: tagType.tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          created_at: tag.created_at,
        })),
      }
    : {}),
});

export const formatTag = (tag) => ({
  id: tag.id,
  name: tag.name,
  created_at: tag.created_at,
  games_count: tag._count?.game_tags ?? 0,
  type: {
    id: tag.tag_types.id,
    name: tag.tag_types.name,
    sort_order: tag.tag_types.sort_order,
  },
});
