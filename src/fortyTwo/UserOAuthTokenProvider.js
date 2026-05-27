class UserOAuthTokenProvider {
  constructor({
    clientId,
    clientSecret,
    tokenStore,
    tokenUrl = 'https://api.intra.42.fr/oauth/token',
  }) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.tokenStore = tokenStore;
    this.tokenUrl = tokenUrl;
  }

  async getAccessToken() {
    const token = this.tokenStore.read();

    if (!token) {
      throw new Error('42 user token is missing. Run `npm run auth:42` first.');
    }

    if (token.expiresAt && token.expiresAt > Date.now() + 60_000) {
      return token.accessToken;
    }

    if (!token.refreshToken) {
      throw new Error('42 user token is expired and has no refresh token. Run `npm run auth:42` again.');
    }

    const refreshedToken = await this.refreshAccessToken(token.refreshToken);
    this.tokenStore.write(refreshedToken);

    return refreshedToken.accessToken;
  }

  async refreshAccessToken(refreshToken) {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(`42 token refresh failed: ${response.status} ${formatApiError(data)}`);
    }

    return normalizeToken(data, refreshToken);
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeToken(data, fallbackRefreshToken) {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || fallbackRefreshToken,
    scope: data.scope,
    tokenType: data.token_type,
    expiresAt: Date.now() + data.expires_in * 1000,
    createdAt: new Date().toISOString(),
  };
}

function formatApiError(data) {
  if (!data) {
    return 'empty response';
  }

  return data.error_description || data.error || JSON.stringify(data);
}

module.exports = {
  UserOAuthTokenProvider,
  normalizeToken,
};
