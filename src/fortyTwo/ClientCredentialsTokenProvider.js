class ClientCredentialsTokenProvider {
  constructor({ clientId, clientSecret, tokenUrl = 'https://api.intra.42.fr/oauth/token' }) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.tokenUrl = tokenUrl;
    this.cachedToken = null;
  }

  async getAccessToken() {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000) {
      return this.cachedToken.accessToken;
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
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
      throw new Error(`42 token request failed: ${response.status} ${formatApiError(data)}`);
    }

    this.cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return this.cachedToken.accessToken;
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function formatApiError(data) {
  if (!data) {
    return 'empty response';
  }

  return data.error_description || data.error || JSON.stringify(data);
}

module.exports = {
  ClientCredentialsTokenProvider,
};
