const test = require('node:test');
const assert = require('node:assert/strict');

const { hasNotifiedReviewWithSharedSlot } = require('../src/notifications/ReviewReminderService');

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

  assert.equal(hasNotifiedReviewWithSharedSlot(notificationKeys, review, 42, 42), true);
});

test('does not share notification state between reminder lead times', () => {
  const notificationKeys = [
    'review-starting:101-102-103:2026-07-21T11:30:00.000Z:2026-07-21T12:15:00.000Z:42m',
  ];

  assert.equal(hasNotifiedReviewWithSharedSlot(notificationKeys, review, 5, 42), false);
});

test('does not treat another review as already sent', () => {
  const notificationKeys = [
    'review-starting:201-202:2026-07-21T11:30:00.000Z:2026-07-21T12:00:00.000Z:42m',
  ];

  assert.equal(hasNotifiedReviewWithSharedSlot(notificationKeys, review, 42, 42), false);
});

test('supports legacy reminder keys for the configured lead time', () => {
  const notificationKeys = [
    'review-starting:101-102-103:2026-07-21T11:30:00.000Z:2026-07-21T12:15:00.000Z',
  ];

  assert.equal(hasNotifiedReviewWithSharedSlot(notificationKeys, review, 42, 42), true);
  assert.equal(hasNotifiedReviewWithSharedSlot(notificationKeys, review, 5, 42), false);
});
