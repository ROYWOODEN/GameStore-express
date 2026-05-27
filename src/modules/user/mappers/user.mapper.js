export const mapUserProfile = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatar_url: user.avatar_url,
  created_at: user.created_at,
  role: user.roles?.name ?? null,
});
