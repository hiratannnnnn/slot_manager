function parseSlotDateTime(input) {
  const value = input.trim();
  const localMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);

  if (localMatch) {
    const [, year, month, day, hour, minute] = localMatch.map(Number);
    const utcMilliseconds = Date.UTC(year, month - 1, day, hour - 9, minute);
    return new Date(utcMilliseconds).toISOString();
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
