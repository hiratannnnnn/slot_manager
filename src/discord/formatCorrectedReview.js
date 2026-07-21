const { formatDateTime } = require('./formatDateTime');

function formatCorrectedReview(review) {
  const lines = [`開始: ${formatDateTime(review.beginAt)}`];

  if (review.projectName) {
    lines.push(`Project: ${review.projectName}`);
  }

  if (review.correctorLogin) {
    lines.push(`評価者: ${review.correctorLogin}`);
  }

  return lines.join('\n');
}

module.exports = {
  formatCorrectedReview,
};
