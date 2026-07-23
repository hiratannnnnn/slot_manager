const assert = require('node:assert/strict');
const test = require('node:test');
const { UserOAuthTokenProvider } = require('../src/fortyTwo/UserOAuthTokenProvider');

test('concurrent access token requests perform only one refresh', async () => {
  const expiredToken = {
    accessToken: 'expired-access-token',
    refreshToken: 'refresh-token-1',
    expiresAt: Date.now() - 1,
  };
  let storedToken = expiredToken;
  let refreshRequests = 0;
  const originalFetch = global.fetch;

  global.fetch = async () => {
    refreshRequests += 1;
    const requestNumber = refreshRequests;
    await new Promise((resolve) => setTimeout(resolve, 10));

    if (requestNumber > 1) {
      return {
        ok: false,
        status: 401,
        json: async () => ({
          error_description: 'The provided authorization grant is invalid',
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'new-access-token',
        refresh_token: 'refresh-token-2',
        expires_in: 7200,
        token_type: 'bearer',
      }),
    };
  };

  const provider = new UserOAuthTokenProvider({
    clientId: 'client-id',
    clientSecret: 'client-secret',
    tokenStore: {
      read: () => storedToken,
      write: (token) => {
        storedToken = token;
      },
    },
  });

  try {
    const tokens = await Promise.all([
      provider.getAccessToken(),
      provider.getAccessToken(),
      provider.getAccessToken(),
    ]);

    assert.deepEqual(tokens, [
      'new-access-token',
      'new-access-token',
      'new-access-token',
    ]);
    assert.equal(refreshRequests, 1);
  } finally {
    global.fetch = originalFetch;
  }
});
