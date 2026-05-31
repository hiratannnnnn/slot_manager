class AuthFailureNotifier {
  constructor({ discordClient }) {
    this.discordClient = discordClient;
    this.hasActiveFailure = false;
  }

  async notifyIfAuthenticationError(error, settings) {
    if (!isFortyTwoAuthenticationError(error)) {
      return false;
    }

    if (this.hasActiveFailure) {
      return true;
    }

    this.hasActiveFailure = true;

    const channel = await this.discordClient.channels.fetch(settings.channelId);

    if (!channel || !channel.isTextBased()) {
      throw new Error(`Notification channel is not text based: ${settings.channelId}`);
    }

    await channel.send({
      content: [
        `<@${settings.userId}> 42 APIの認証でエラーが発生しました。`,
        '',
        'サーバで `npm run auth:42` を実行して、42認証を更新してください。',
        `エラー: ${formatErrorMessage(error)}`,
      ].join('\n'),
      allowedMentions: {
        users: [settings.userId],
      },
    });

    return true;
  }

  markRecovered() {
    this.hasActiveFailure = false;
  }
}

function isFortyTwoAuthenticationError(error) {
  const message = formatErrorMessage(error);

  return [
    '42 user token is missing',
    '42 user token is expired',
    '42 token refresh failed',
    '42 API request failed: 401',
  ].some((pattern) => message.includes(pattern));
}

function formatErrorMessage(error) {
  if (!error) {
    return 'Unknown error';
  }

  return error.message || String(error);
}

module.exports = {
  AuthFailureNotifier,
  isFortyTwoAuthenticationError,
};
