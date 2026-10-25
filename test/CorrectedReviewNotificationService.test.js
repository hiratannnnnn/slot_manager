const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CorrectedReviewNotificationService,
  findCorrectedReviewChanges,
  hasNotifiedCorrectedReview,
} = require('../src/notifications/CorrectedReviewNotificationService');

const CHECKED_AT = '2026-07-22T09:00:00.000Z';

function review(id, beginAt = '2026-07-22T10:00:00.000Z') {
  return { id, beginAt, correctorLogin: null, projectName: null };
}

test('detects newly booked and cancelled corrected reviews by scale team ID', () => {
  const cancelled = review(1);
  const unchanged = review(2);
  const created = review(3);

  assert.deepEqual(
    findCorrectedReviewChanges([cancelled, unchanged], [unchanged, created], CHECKED_AT),
    { created: [created], cancelled: [cancelled] },
  );
});

test('does not report a corrected review as cancelled after it starts', () => {
  const started = review(1, '2026-07-22T08:59:00.000Z');

  assert.deepEqual(findCorrectedReviewChanges([started], [], CHECKED_AT), {
    created: [],
    cancelled: [],
  });
});

test('uses one reminder at the default 30-minute lead time', () => {
  const service = new CorrectedReviewNotificationService({});

  assert.deepEqual(service.getReminderLeadMinutes(), [30]);
});

test('treats a reminder sent at an old lead time as already sent', () => {
  assert.equal(hasNotifiedCorrectedReview([
    'corrected-review-starting:123:42m',
  ], 123), true);
  assert.equal(hasNotifiedCorrectedReview([
    'corrected-review-starting:1234:42m',
  ], 123), false);
});
