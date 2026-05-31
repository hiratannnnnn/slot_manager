function formatUserError(error) {
  const message = error?.message || String(error);

  if (message.startsWith('Invalid datetime')) {
    return [
      '日時の形式が正しくありません。',
      '',
      '例: `6-1 3`, `6-1 03:00`, `1 24`, `2026-06-01 03:00`',
    ].join('\n');
  }

  if (message.includes('must be aligned to 15 minutes')) {
    return '時刻は15分単位で指定してください。例: `3:00`, `3:15`, `3:30`, `3:45`';
  }

  if (message.includes('The slot duration must be at least 45 minutes')) {
    return 'Slotは45分以上で指定してください。';
  }

  if (message.includes('Beginning must be after')) {
    return '開始時刻が近すぎるか、過去の時刻です。現在時刻より十分後の時刻を指定してください。';
  }

  if (message.includes('42 user token is missing') || message.includes('42 user token is expired')) {
    return '42認証が必要です。サーバで `npm run auth:42` を実行してください。';
  }

  if (message.startsWith('42 API request failed: 400') || message.startsWith('42 API request failed: 422')) {
    return `42 APIでエラーになりました。\n\`${message}\``;
  }

  return null;
}

module.exports = {
  formatUserError,
};
