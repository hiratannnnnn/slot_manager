function groupBookedSlotsIntoReviews(slots) {
  const bookedSlots = slots
    .filter((slot) => slot.hasScaleTeam)
    .sort((a, b) => new Date(a.beginAt) - new Date(b.beginAt));
  const reviews = [];

  for (const slot of bookedSlots) {
    const lastReview = reviews[reviews.length - 1];

    if (lastReview && lastReview.endAt === slot.beginAt) {
      lastReview.slotIds.push(slot.id);
      lastReview.endAt = slot.endAt;
      continue;
    }

    reviews.push({
      id: buildReviewId([slot.id], slot.beginAt, slot.endAt),
      slotIds: [slot.id],
      beginAt: slot.beginAt,
      endAt: slot.endAt,
    });
  }

  return reviews.map((review) => ({
    ...review,
    id: buildReviewId(review.slotIds, review.beginAt, review.endAt),
  }));
}

function buildReviewId(slotIds, beginAt, endAt) {
  return `${slotIds.join('-')}:${beginAt}:${endAt}`;
}

module.exports = {
  groupBookedSlotsIntoReviews,
};
