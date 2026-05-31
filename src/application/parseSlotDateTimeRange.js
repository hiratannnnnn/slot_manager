const { parseSlotDateTime } = require('./parseSlotDateTime');

function parseSlotDateTimeRange({ beginInput, endInput }) {
  return {
    beginAt: parseSlotDateTimeBoundary(beginInput, 'begin'),
    endAt: parseSlotDateTimeBoundary(endInput, 'end'),
  };
}

function parseSlotDateTimeBoundary(input, boundary) {
  const value = input.trim();

  if (hasTime(value)) {
    return parseSlotDateTime(value);
  }

  const dateParts = parseDateOnly(value);

  if (!dateParts) {
    return parseSlotDateTime(value);
  }

  const hour = boundary === 'begin' ? 0 : 24;

  return buildTokyoIsoString({
    ...dateParts,
    hour,
    minute: 0,
  });
}

function hasTime(value) {
  return /[ T]\d{1,2}(?::\d{2})?$|^\d{1,2}:\d{2}$/.test(value);
}

function parseDateOnly(value) {
  const fullDateMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (fullDateMatch) {
    const [, year, month, day] = fullDateMatch.map(Number);
    return { year, month, day };
  }

  const currentYearMatch = value.match(/^(\d{1,2})-(\d{1,2})$/);

  if (currentYearMatch) {
    const [, month, day] = currentYearMatch.map(Number);
    const { year } = getCurrentTokyoDateParts();
    return { year, month, day };
  }

  const currentYearMonthMatch = value.match(/^(\d{1,2})$/);

  if (currentYearMonthMatch) {
    const [, day] = currentYearMonthMatch.map(Number);
    const { year, month } = getCurrentTokyoDateParts();
    return { year, month, day };
  }

  return null;
}

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
  const expectedDate = new Date(Date.UTC(year, month - 1, day + dayOffset));

  if (
    baseDate.getUTCFullYear() !== year ||
    baseDate.getUTCMonth() !== month - 1 ||
    baseDate.getUTCDate() !== day ||
    Number.isNaN(date.getTime()) ||
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

module.exports = {
  parseSlotDateTimeRange,
};
