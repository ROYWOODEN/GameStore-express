export const buildGoogleOAuthUrl = ({ state }) => {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');

  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', process.env.GOOGLE_CALLBACK_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'profile email');
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('state', state);

  return url.toString();
};
