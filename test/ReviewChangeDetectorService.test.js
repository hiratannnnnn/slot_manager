const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ReviewChangeDetectorService,
  findReviewChanges,
  getReviewSlotClosureRange,
} = require('../src/notifications/ReviewChangeDetectorService');

const BEFORE_REVIEW = '2026-06-23T09:55:00.000Z';
const AT_REVIEW_START = '2026-06-23T10:00:00.000Z';

function review({ id, slotIds }) {
  return {
    id,
    slotIds,
    beginAt: '2026-06-23T10:00:00.000Z',
    endAt: '2026-06-23T10:30:00.000Z',
  };
}

test('does not report a review as cancelled and created when one contiguous slot is removed', () => {
  const previousReview = review({
    id: '135133250-135133251:2026-06-23T10:00:00.000Z:2026-06-23T10:30:00.000Z',
    slotIds: [135133250, 135133251],
  });
  const currentReview = review({
    id: '135133251:2026-06-23T10:15:00.000Z:2026-06-23T10:30:00.000Z',
    slotIds: [135133251],
  });

  assert.deepEqual(findReviewChanges([previousReview], [currentReview], BEFORE_REVIEW), {
    created: [],
    cancelled: [],
  });
});

test('reports reviews with no shared slots as created or cancelled', () => {
  const cancelledReview = review({ id: 'old', slotIds: [1] });
  const createdReview = review({ id: 'new', slotIds: [2] });

  assert.deepEqual(findReviewChanges([cancelledReview], [createdReview], BEFORE_REVIEW), {
    created: [createdReview],
    cancelled: [cancelledReview],
  });
});

test('reports cancellation after every slot of a review has disappeared', () => {
  const cancelledReview = review({ id: 'old', slotIds: [1, 2] });

  assert.deepEqual(findReviewChanges([cancelledReview], [], BEFORE_REVIEW), {
    created: [],
    cancelled: [cancelledReview],
  });
});

test('does not report a review as cancelled when it disappears at its start time', () => {
  const startedReview = review({ id: 'started', slotIds: [1, 2] });

  assert.deepEqual(findReviewChanges([startedReview], [], AT_REVIEW_START), {
    created: [],
    cancelled: [],
  });
});

test('does not report a review as cancelled when it disappears after its start time', () => {
  const startedReview = review({ id: 'started', slotIds: [1, 2] });

  assert.deepEqual(findReviewChanges(
    [startedReview],
    [],
    '2026-06-23T10:05:00.000Z',
  ), {
    created: [],
    cancelled: [],
  });
});

test('builds the slot closure range from 30 minutes before to 30 minutes after a review', () => {
  assert.deepEqual(getReviewSlotClosureRange({
    beginAt: '2026-06-23T09:00:00.000Z',
    endAt: '2026-06-23T09:30:00.000Z',
  }), {
    beginAt: '2026-06-23T08:30:00.000Z',
    endAt: '2026-06-23T10:00:00.000Z',
  });
});

test('closes surrounding open slots when a new review is detected', async () => {
  const closedRanges = [];
  const sentMessages = [];
  let writtenSnapshot;
  const service = new ReviewChangeDetectorService({
    discordClient: {
      channels: {
        async fetch() {
          return {
            isTextBased: () => true,
            async send(message) {
              sentMessages.push(message);
            },
          };
        },
      },
    },
    slotService: {
      async listMySlots() {
        return [
          {
            id: 10,
            beginAt: '2026-06-23T09:00:00.000Z',
            endAt: '2026-06-23T09:15:00.000Z',
            hasScaleTeam: true,
          },
          {
            id: 11,
            beginAt: '2026-06-23T09:15:00.000Z',
            endAt: '2026-06-23T09:30:00.000Z',
            hasScaleTeam: true,
          },
        ];
      },
      async closeSlotsByRange(range) {
        closedRanges.push(range);
        return [{ id: 20 }, { id: 21 }];
      },
    },
    settingsStore: {
      read: () => ({ channelId: 'channel', userId: 'user' }),
    },
    snapshotStore: {
      read: () => ({ checkedAt: '2026-06-23T08:00:00.000Z', reviews: [] }),
      write(snapshot) {
        writtenSnapshot = snapshot;
      },
    },
  });

  await service.check();

  assert.deepEqual(closedRanges, [{
    beginAt: '2026-06-23T08:30:00.000Z',
    endAt: '2026-06-23T10:00:00.000Z',
  }]);
  assert.equal(sentMessages.length, 1);
  assert.equal(writtenSnapshot.reviews.length, 1);
});
