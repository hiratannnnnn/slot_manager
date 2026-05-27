function formatSlots(slots) {
  if (slots.length === 0) {
    return '表示できるSlotはありません。';
  }

  return slots
    .map((slot) => {
      const beginAt = formatDateTime(slot.beginAt);
      const endAt = formatDateTime(slot.endAt);
      const status = slot.hasScaleTeam ? 'booked' : 'open';

      return `ID: ${slot.id}\n${beginAt} - ${endAt}\nstatus: ${status}`;
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
  formatSlots,
};
