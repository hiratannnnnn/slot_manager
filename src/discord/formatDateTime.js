function formatDateTime(value) {
  if (!value) {
    return 'unknown';
  }

  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(value));
}

module.exports = {
  formatDateTime,
};
