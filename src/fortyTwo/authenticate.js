const crypto = require('crypto');
const http = require('http');
const { getFortyTwoEnv } = require('../config/env');
const { FileTokenStore } = require('./FileTokenStore');
const { normalizeToken } = require('./UserOAuthTokenProvider');

async function authenticate() {
  const env = getFortyTwoEnv();
  const redirectUrl = new URL(env.fortyTwoRedirectUri);
  const state = crypto.randomBytes(24).toString('hex');
  const tokenStore = new FileTokenStore();

  const authorizeUrl = new URL('https://api.intra.42.fr/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', env.fortyTwoClientId);
  authorizeUrl.searchParams.set('redirect_uri', env.fortyTwoRedirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', env.fortyTwoScopes);
  authorizeUrl.searchParams.set('state', state);

  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, env.fortyTwoRedirectUri);

      if (requestUrl.pathname !== redirectUrl.pathname) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }

      if (requestUrl.searchParams.get('state') !== state) {
        response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Invalid OAuth state.');
        return;
      }

      const code = requestUrl.searchParams.get('code');

      if (!code) {
        response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Missing OAuth code.');
        return;
      }

      const token = await exchangeCodeForToken({ env, code });
      tokenStore.write(token);

      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('42 authentication completed. You can close this tab and run /slots in Discord.');
      server.close();
    } catch (error) {
      console.error(error);
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('42 authentication failed. Check the terminal log.');
      server.close();
    }
  });

  server.listen(Number(redirectUrl.port || 80), redirectUrl.hostname, () => {
    console.log('Open this URL in your browser to authenticate with 42:');
    console.log(authorizeUrl.toString());
    console.log('');
    console.log(`Waiting for callback on ${env.fortyTwoRedirectUri}`);
  });
}

async function exchangeCodeForToken({ env, code }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.fortyTwoClientId,
    client_secret: env.fortyTwoClientSecret,
    code,
    redirect_uri: env.fortyTwoRedirectUri,
  });

  const response = await fetch('https://api.intra.42.fr/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(`42 token exchange failed: ${response.status} ${formatApiError(data)}`);
  }

  return normalizeToken(data);
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

authenticate().catch((error) => {
  console.error(error);
  process.exit(1);
});
