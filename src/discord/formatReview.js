const { formatDateTime } = require('./formatDateTime');

function formatReview(review) {
  const beginAt = formatDateTime(review.beginAt);
  const endAt = formatDateTime(review.endAt);

  return `${beginAt} - ${endAt}\nSlot IDs: ${review.slotIds.join(', ')}`;
}

module.exports = {
  formatReview,
};
