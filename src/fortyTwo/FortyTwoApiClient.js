const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MILLISECONDS = 30 * 1000;

class FortyTwoApiClient {
  constructor({ tokenProvider, baseUrl = 'https://api.intra.42.fr/v2' }) {
    this.tokenProvider = tokenProvider;
    this.baseUrl = baseUrl;
  }

  async listMySlots({ futureOnly = true, pageSize = 100, pageNumber } = {}) {
    const params = new URLSearchParams({
      sort: 'begin_at',
      'page[size]': String(pageSize),
    });

    if (pageNumber) {
      params.set('page[number]', String(pageNumber));
    }

    if (futureOnly) {
      params.set('filter[future]', 'true');
    }

    return this.request(`/me/slots?${params.toString()}`);
  }

  async getMe() {
    return this.request('/me');
  }

  async createSlot({ userId, beginAt, endAt }) {
    return this.request('/slots', {
      method: 'POST',
      body: JSON.stringify({
        slot: {
          user_id: userId,
          begin_at: beginAt,
          end_at: endAt,
        },
      }),
    });
  }

  async deleteSlot(slotId) {
    await this.request(`/slots/${slotId}`, {
      method: 'DELETE',
    });
  }

  async request(path, options = {}) {
    const accessToken = await this.tokenProvider.getAccessToken();

    for (let attempt = 0; attempt <= DEFAULT_MAX_RETRIES; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...options.headers,
        },
      });

      const data = await readJson(response);

      if (response.ok) {
        return data;
      }

      if (response.status === 429 && attempt < DEFAULT_MAX_RETRIES) {
        await sleep(getRetryDelayMilliseconds(response, attempt));
        continue;
      }

      throw new Error(`42 API request failed: ${response.status} ${formatApiError(data)}`);
    }

    throw new Error('42 API request failed: retry limit exceeded');
  }
}

async function readJson(response) {
  if (response.status === 204) {
    return null;
  }

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

  return data.message || data.error_description || data.error || JSON.stringify(data);
}

function getRetryDelayMilliseconds(response, attempt) {
  const retryAfter = response.headers.get('retry-after');

  if (retryAfter) {
    const retryAfterSeconds = Number(retryAfter);

    if (!Number.isNaN(retryAfterSeconds)) {
      return retryAfterSeconds * 1000;
    }

    const retryAt = new Date(retryAfter).getTime();

    if (!Number.isNaN(retryAt)) {
      return Math.max(retryAt - Date.now(), 0);
    }
  }

  return DEFAULT_RETRY_DELAY_MILLISECONDS * (attempt + 1);
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

module.exports = {
  FortyTwoApiClient,
};
