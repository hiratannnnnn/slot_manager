const assert = require('node:assert/strict');
const test = require('node:test');
const { SlotService } = require('../src/application/SlotService');

test('closeSlotsByRange logs the slot context when deletion fails', async () => {
  const expectedError = new Error('42 API request failed: 403 forbidden');
  const logEntries = [];
  const logger = {
    info(message, context) {
      logEntries.push({ level: 'info', message, context });
    },
    error(message, context) {
      logEntries.push({ level: 'error', message, context });
    },
  };
  const fortyTwoApiClient = {
    async listMySlots() {
      return [
        {
          id: 42,
          begin_at: '2026-09-27T01:00:00.000Z',
          end_at: '2026-09-27T01:15:00.000Z',
          scale_team: null,
        },
      ];
    },
    async deleteSlot() {
      throw expectedError;
    },
  };
  const service = new SlotService({ fortyTwoApiClient, logger });

  await assert.rejects(
    service.closeSlotsByRange({
      beginAt: '2026-09-27T00:00:00.000Z',
      endAt: '2026-09-27T02:00:00.000Z',
    }),
    expectedError,
  );

  assert.deepEqual(logEntries.at(-1), {
    level: 'error',
    message: 'Failed to delete slot.',
    context: {
      slotId: 42,
      beginAt: '2026-09-27T01:00:00.000Z',
      endAt: '2026-09-27T01:15:00.000Z',
      hasScaleTeam: false,
      error: '42 API request failed: 403 forbidden',
    },
  });
});

test('closeSlotsByRange deletes open slots and skips booked slots', async () => {
  const deletedSlotIds = [];
  const logger = { info() {}, error() {} };
  const fortyTwoApiClient = {
    async listMySlots() {
      return [
        {
          id: 1,
          begin_at: '2026-09-27T01:00:00.000Z',
          end_at: '2026-09-27T01:15:00.000Z',
          scale_team: { id: 100 },
        },
        {
          id: 2,
          begin_at: '2026-09-27T01:15:00.000Z',
          end_at: '2026-09-27T01:30:00.000Z',
          scale_team: null,
        },
      ];
    },
    async deleteSlot(slotId) {
      deletedSlotIds.push(slotId);
    },
  };
  const service = new SlotService({ fortyTwoApiClient, logger });

  const closedSlots = await service.closeSlotsByRange({
    beginAt: '2026-09-27T01:00:00.000Z',
    endAt: '2026-09-27T01:30:00.000Z',
  });

  assert.deepEqual(deletedSlotIds, [2]);
  assert.deepEqual(closedSlots.map((slot) => slot.id), [2]);
});
