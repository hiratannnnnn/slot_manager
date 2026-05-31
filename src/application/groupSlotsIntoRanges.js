function groupSlotsIntoRanges(slots) {
  const sortedSlots = [...slots].sort((a, b) => new Date(a.beginAt) - new Date(b.beginAt));
  const ranges = [];

  for (const slot of sortedSlots) {
    const lastRange = ranges[ranges.length - 1];
    const status = slot.hasScaleTeam ? 'booked' : 'open';

    if (lastRange && lastRange.endAt === slot.beginAt && lastRange.status === status) {
      lastRange.slotIds.push(slot.id);
      lastRange.endAt = slot.endAt;
      lastRange.slotCount += 1;
      continue;
    }

    ranges.push({
      beginAt: slot.beginAt,
      endAt: slot.endAt,
      status,
      slotIds: [slot.id],
      slotCount: 1,
    });
  }

  return ranges;
}

module.exports = {
  groupSlotsIntoRanges,
};
