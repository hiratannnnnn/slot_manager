const { formatDateTime } = require('./formatDateTime');

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

module.exports = {
  formatSlots,
};
