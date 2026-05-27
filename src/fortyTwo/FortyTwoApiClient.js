class FortyTwoApiClient {
  constructor({ tokenProvider, baseUrl = 'https://api.intra.42.fr/v2' }) {
    this.tokenProvider = tokenProvider;
    this.baseUrl = baseUrl;
  }

  async listMySlots({ futureOnly = true, pageSize = 100 } = {}) {
    const params = new URLSearchParams({
      sort: 'begin_at',
      'page[size]': String(pageSize),
    });

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

    if (!response.ok) {
      throw new Error(`42 API request failed: ${response.status} ${formatApiError(data)}`);
    }

    return data;
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

module.exports = {
  FortyTwoApiClient,
};
