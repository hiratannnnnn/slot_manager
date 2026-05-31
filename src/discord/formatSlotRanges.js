function formatSlotRanges(ranges) {
  if (ranges.length === 0) {
    return '表示できるSlotはありません。';
  }

  return ranges
    .map((range) => {
      const beginAt = formatDateTime(range.beginAt);
      const endAt = formatDateTime(range.endAt);
      const durationMinutes = Math.round((new Date(range.endAt) - new Date(range.beginAt)) / 60_000);
      const statusLabel = range.status === 'booked' ? 'booked' : 'open';

      return [
        `${beginAt} - ${endAt}`,
        `status: ${statusLabel}`,
        `duration: ${durationMinutes}min (${range.slotCount} slots)`,
      ].join('\n');
    })
    .join('\n\n');
}

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
  formatSlotRanges,
};
