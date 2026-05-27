const JST_OFFSET_MILLISECONDS = 9 * 60 * 60 * 1000;

function getTodaySlotDeletionRange(now = new Date()) {
  const nowTime = now.getTime();
  const jstNow = new Date(nowTime + JST_OFFSET_MILLISECONDS);
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth();
  const day = jstNow.getUTCDate();
  const tomorrowAtFourJst = Date.UTC(year, month, day + 1, 4 - 9, 0, 0, 0);

  return {
    beginAt: now.toISOString(),
    endAt: new Date(tomorrowAtFourJst).toISOString(),
  };
}

module.exports = {
  getTodaySlotDeletionRange,
};
