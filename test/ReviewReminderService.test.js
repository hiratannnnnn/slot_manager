const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ReviewReminderService,
  hasNotifiedReviewWithSharedSlot,
} = require('../src/notifications/ReviewReminderService');

const review = {
  id: '102-103:2026-07-21T11:45:00.000Z:2026-07-21T12:15:00.000Z',
  slotIds: [102, 103],
  beginAt: '2026-07-21T11:45:00.000Z',
  endAt: '2026-07-21T12:15:00.000Z',
};

test('treats a reminder for a review with a removed slot as already sent', () => {
  const notificationKeys = [
    'review-starting:101-102-103:2026-07-21T11:30:00.000Z:2026-07-21T12:15:00.000Z:42m',
  ];

  assert.equal(hasNotifiedReviewWithSharedSlot(notificationKeys, review), true);
});

test('treats a reminder sent at an old lead time as already sent', () => {
  const notificationKeys = [
    'review-starting:101-102-103:2026-07-21T11:30:00.000Z:2026-07-21T12:15:00.000Z:42m',
  ];

  assert.equal(hasNotifiedReviewWithSharedSlot(notificationKeys, review), true);
});

test('does not treat another review as already sent', () => {
  const notificationKeys = [
    'review-starting:201-202:2026-07-21T11:30:00.000Z:2026-07-21T12:00:00.000Z:42m',
  ];

  assert.equal(hasNotifiedReviewWithSharedSlot(notificationKeys, review), false);
});

test('supports legacy reminder keys for the configured lead time', () => {
  const notificationKeys = [
    'review-starting:101-102-103:2026-07-21T11:30:00.000Z:2026-07-21T12:15:00.000Z',
  ];

  assert.equal(hasNotifiedReviewWithSharedSlot(notificationKeys, review), true);
});

test('uses one reminder at the default 30-minute lead time', () => {
  const service = new ReviewReminderService({});

  assert.deepEqual(service.getReminderLeadMinutes(), [30]);
});
