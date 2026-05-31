function parseSlotDateTime(input) {
  const value = input.trim();
  const localMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2})(?::(\d{2}))?$/);

  if (localMatch) {
    const [, year, month, day, hour, minute = '0'] = localMatch;
    return buildTokyoIsoString({
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
    });
  }

  const currentYearMonthMatch = value.match(/^(\d{1,2})[ T](\d{1,2})(?::(\d{2}))?$/);

  if (currentYearMonthMatch) {
    const [, day, hour, minute = '0'] = currentYearMonthMatch;
    const { year, month } = getCurrentTokyoDateParts();
    return buildTokyoIsoString({
      year,
      month,
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
    });
  }

  const currentYearMatch = value.match(/^(\d{1,2})-(\d{1,2})[ T](\d{1,2})(?::(\d{2}))?$/);

  if (currentYearMatch) {
    const [, month, day, hour, minute = '0'] = currentYearMatch;
    const { year } = getCurrentTokyoDateParts();
    return buildTokyoIsoString({
      year,
      month: Number(month),
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
    });
  }

  const currentDayMatch = value.match(/^(\d{1,2})(?::(\d{2}))?$/);

  if (currentDayMatch) {
    const [, hour, minute = '0'] = currentDayMatch;
    const { year, month, day } = getCurrentTokyoDateParts();
    return buildTokyoIsoString({
      year,
      month,
      day,
      hour: Number(hour),
      minute: Number(minute),
    });
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid datetime: ${input}`);
  }

  return parsed.toISOString();
}

module.exports = {
  parseSlotDateTime,
};

function getCurrentTokyoDateParts() {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());

  return {
    year: Number(parts.find((part) => part.type === 'year').value),
    month: Number(parts.find((part) => part.type === 'month').value),
    day: Number(parts.find((part) => part.type === 'day').value),
  };
}

function buildTokyoIsoString({ year, month, day, hour, minute }) {
  if (hour < 0 || hour > 24 || minute < 0 || minute > 59 || (hour === 24 && minute !== 0)) {
    throw new Error('Invalid datetime.');
  }

  const dayOffset = Math.floor(hour / 24);
  const normalizedHour = hour % 24;
  const baseDate = new Date(Date.UTC(year, month - 1, day));
  const utcMilliseconds = Date.UTC(year, month - 1, day + dayOffset, normalizedHour - 9, minute);
  const date = new Date(utcMilliseconds);
  const expectedDate = new Date(Date.UTC(year, month - 1, day + dayOffset));
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const parsedParts = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  if (
    baseDate.getUTCFullYear() !== year ||
    baseDate.getUTCMonth() !== month - 1 ||
    baseDate.getUTCDate() !== day ||
    parsedParts.year !== expectedDate.getUTCFullYear() ||
    parsedParts.month !== expectedDate.getUTCMonth() + 1 ||
    parsedParts.day !== expectedDate.getUTCDate() ||
    parsedParts.hour !== normalizedHour ||
    parsedParts.minute !== minute
  ) {
    throw new Error('Invalid datetime.');
  }

  return date.toISOString();
}
