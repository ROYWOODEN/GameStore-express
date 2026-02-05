export const formatGame = (game) => ({
  id_game: game.id_game,
  title: game.title,
  description: game.description,
  price: game.price,
  created_at: game.created_at,
  tags: game.game_tags.map((gt) => ({
    id: gt.tags.id_tags,
    name: gt.tags.name,
    type: {
      id: gt.tags.tag_types.id,
      name: gt.tags.tag_types.name,
      color: gt.tags.tag_types.color,
      icon: gt.tags.tag_types.icon,
      sort_order: gt.tags.tag_types.sort_order,
    },
  })),
  media: {
    images: game.game_images,
    videos: game.game_videos,
  },
});

export const formatGameList = (game) => ({
  id_game: game.id_game,
  title: game.title,
  price: game.price,
  tags: game.game_tags.map((gt) => ({
    name: gt.tags.name,
    type: gt.tags.tag_types.name,
  })),
  media: {
    images: game.game_images.map((img) => ({
      url: img.url,
      alt: img.alt,
    })),
  },
});
