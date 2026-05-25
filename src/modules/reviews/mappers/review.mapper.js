export const formatReview = (review) => ({
  id: review.id,
  game_id: review.game_id,
  rating: review.rating,
  text: review.text,
  created_at: review.created_at,
  updated_at: review.updated_at,
  user: review.users
    ? {
        id: review.users.id,
        name: review.users.name,
        avatar_url: review.users.avatar_url,
      }
    : null,
});
