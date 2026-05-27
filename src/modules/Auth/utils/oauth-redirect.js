const getRedirectBaseUrl = (status) => {
  if (status === 'success') {
    return process.env.GOOGLE_OAUTH_SUCCESS_REDIRECT || process.env.CLIENT_URL;
  }

  return process.env.GOOGLE_OAUTH_FAILURE_REDIRECT || process.env.CLIENT_URL;
};

export const buildOAuthRedirectUrl = ({ provider, status, error = null }) => {
  const redirectBaseUrl = getRedirectBaseUrl(status);

  if (!redirectBaseUrl) {
    throw new Error('OAuth redirect URL is not configured');
  }

  const url = new URL(redirectBaseUrl);
  url.searchParams.set('provider', provider);
  url.searchParams.set('status', status);

  if (error) {
    url.searchParams.set('error', error);
  }

  return url.toString();
};
