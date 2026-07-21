const test = require('node:test');
const assert = require('node:assert/strict');

const { formatCorrectedReview } = require('../src/application/CorrectedReviewService');

test('formats an upcoming corrected scale team', () => {
  assert.deepEqual(formatCorrectedReview({
    id: 123,
    begin_at: '2026-07-22T10:00:00.000Z',
    corrector: { login: 'evaluator' },
    team: { project: { name: 'minishell' } },
  }), {
    id: 123,
    beginAt: '2026-07-22T10:00:00.000Z',
    correctorLogin: 'evaluator',
    projectName: 'minishell',
  });
});
