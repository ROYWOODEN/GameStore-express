const formatGameRating = (game) => ({
  average: game.rating_summary?.average ?? null,
  count: game.rating_summary?.count ?? 0,
});

const sortGameTags = (gameTags) =>
  [...(gameTags ?? [])].sort((left, right) => {
    const typeDiff =
      Number(left.tags.tag_types.sort_order ?? 0) - Number(right.tags.tag_types.sort_order ?? 0);

    if (typeDiff !== 0) {
      return typeDiff;
    }

    return left.tags.name.localeCompare(right.tags.name);
  });

export const formatGame = (game) => ({
  id: game.id,
  title: game.title,
  description: game.description,
  price: game.price,
  created_at: game.created_at,
  updated_at: game.updated_at,
  rating: formatGameRating(game),
  tags: sortGameTags(game.game_tags).map((gt) => ({
    id: gt.tags.id,
    name: gt.tags.name,
    type: {
      id: gt.tags.tag_types.id,
      name: gt.tags.tag_types.name,
      sort_order: gt.tags.tag_types.sort_order,
    },
  })),
  media: {
    images: game.game_images,
    videos: game.game_videos,
  },
});

export const formatGameList = (game) => ({
  id: game.id,
  title: game.title,
  description: game.description,
  price: game.price,
  created_at: game.created_at,
  updated_at: game.updated_at,
  rating: formatGameRating(game),
  tags: sortGameTags(game.game_tags).map((gt) => ({
    id: gt.tags.id,
    name: gt.tags.name,
    type_id: gt.tags.tag_types.id,
    type: gt.tags.tag_types.name,
  })),
  media: {
    images: game.game_images.map((img) => ({
      url: img.url,
      alt: img.alt,
    })),
  },
});
