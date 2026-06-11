const findGenreCover = (genre) => {
  const gameWithImage = genre.game_tags.find((gameTag) => gameTag.games?.game_images?.length > 0);
  const image = gameWithImage?.games?.game_images?.[0];

  if (!image) {
    return null;
  }

  return {
    url: image.url,
    alt: image.alt,
  };
};

export const formatCatalogGenre = (genre) => ({
  id: genre.id,
  name: genre.name,
  games_count: genre._count?.game_tags ?? 0,
  cover: findGenreCover(genre),
});
