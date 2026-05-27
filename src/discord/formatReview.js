function formatReview(review) {
  const beginAt = formatDateTime(review.beginAt);
  const endAt = formatDateTime(review.endAt);

  return `${beginAt} - ${endAt}\nSlot IDs: ${review.slotIds.join(', ')}`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(value));
}

module.exports = {
  formatReview,
};
