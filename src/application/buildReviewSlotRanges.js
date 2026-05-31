const SLOT_UNIT_MILLISECONDS = 15 * 60 * 1000;
const MINIMUM_REVIEW_SLOT_MILLISECONDS = 45 * 60 * 1000;
const REVIEW_SLOT_MILLISECONDS = 75 * 60 * 1000;
const REVIEW_INTERVAL_MILLISECONDS = 15 * 60 * 1000;

function buildReviewSlotRanges({ beginAt, endAt }) {
  const endTime = new Date(endAt).getTime();
  assertAlignedToSlotUnit(endTime, 'endAt');

  const ranges = [];

  for (
    let reviewBeginTime = new Date(beginAt).getTime();
    reviewBeginTime + MINIMUM_REVIEW_SLOT_MILLISECONDS <= endTime;
    reviewBeginTime += REVIEW_SLOT_MILLISECONDS + REVIEW_INTERVAL_MILLISECONDS
  ) {
    assertAlignedToSlotUnit(reviewBeginTime, 'beginAt');
    const reviewEndTime = Math.min(reviewBeginTime + REVIEW_SLOT_MILLISECONDS, endTime);

    ranges.push({
      beginAt: new Date(reviewBeginTime).toISOString(),
      endAt: new Date(reviewEndTime).toISOString(),
    });
  }

  return ranges;
}

function assertAlignedToSlotUnit(time, name) {
  if (time % SLOT_UNIT_MILLISECONDS !== 0) {
    throw new Error(`${name} must be aligned to 15 minutes.`);
  }
}

module.exports = {
  buildReviewSlotRanges,
};
