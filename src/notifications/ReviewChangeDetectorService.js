const { groupBookedSlotsIntoReviews } = require('../application/groupBookedSlotsIntoReviews');
const { formatReview } = require('../discord/formatReview');

class ReviewChangeDetectorService {
  constructor({
    discordClient,
    slotService,
    settingsStore,
    snapshotStore,
    channelId,
    userId,
    authFailureNotifier,
    intervalSeconds = 300,
  }) {
    this.discordClient = discordClient;
    this.slotService = slotService;
    this.settingsStore = settingsStore;
    this.snapshotStore = snapshotStore;
    this.channelId = channelId;
    this.userId = userId;
    this.authFailureNotifier = authFailureNotifier;
    this.intervalSeconds = intervalSeconds;
    this.interval = null;
    this.isChecking = false;
  }

  start() {
    const settings = this.getSettings();

    if (!settings) {
      console.log('Review change detector waiting for settings. Run /register-review-notify or set DISCORD_NOTIFY_CHANNEL_ID and DISCORD_NOTIFY_USER_ID.');
    }

    this.check().catch((error) => {
      console.error('Review change check failed:', error);
    });

    this.interval = setInterval(() => {
      this.check().catch((error) => {
        console.error('Review change check failed:', error);
      });
    }, this.intervalSeconds * 1000);

    console.log(`Review change detector started. interval=${this.intervalSeconds}s`);
  }

  async check() {
    if (this.isChecking) {
      return;
    }

    this.isChecking = true;

    const settings = this.getSettings();

    try {
      if (!settings) {
        return;
      }

      const currentSnapshot = await this.createSnapshot();
      this.authFailureNotifier?.markRecovered();

      const previousSnapshot = this.snapshotStore.read();

      if (!previousSnapshot) {
        this.snapshotStore.write(currentSnapshot);
        return;
      }

      const changes = findReviewChanges(previousSnapshot.reviews, currentSnapshot.reviews);

      for (const review of changes.created) {
        await this.sendChangeNotification({
          settings,
          title: '新しいレビューが入りました。',
          review,
        });
      }

      for (const review of changes.cancelled) {
        await this.sendChangeNotification({
          settings,
          title: 'レビューがキャンセルされました。',
          review,
        });
      }

      this.snapshotStore.write(currentSnapshot);
    } catch (error) {
      if (settings && await this.authFailureNotifier?.notifyIfAuthenticationError(error, settings)) {
        return;
      }

      throw error;
    } finally {
      this.isChecking = false;
    }
  }

  async createSnapshot() {
    const slots = await this.slotService.listMySlots();
    const reviews = groupBookedSlotsIntoReviews(slots);

    return {
      checkedAt: new Date().toISOString(),
      reviews,
    };
  }

  async sendChangeNotification({ settings, title, review }) {
    const channel = await this.discordClient.channels.fetch(settings.channelId);

    if (!channel || !channel.isTextBased()) {
      throw new Error(`Notification channel is not text based: ${settings.channelId}`);
    }

    await channel.send({
      content: `<@${settings.userId}> ${title}\n\n${formatReview(review)}`,
      allowedMentions: {
        users: [settings.userId],
      },
    });
  }

  getSettings() {
    const savedSettings = this.settingsStore ? this.settingsStore.read() : null;
    const channelId = savedSettings?.channelId || this.channelId;
    const userId = savedSettings?.userId || this.userId;

    if (!channelId || !userId) {
      return null;
    }

    return { channelId, userId };
  }
}

function findReviewChanges(previousReviews, currentReviews) {
  const previousById = mapById(previousReviews);
  const currentById = mapById(currentReviews);

  return {
    created: currentReviews.filter((review) => !previousById.has(review.id)),
    cancelled: previousReviews.filter((review) => !currentById.has(review.id)),
  };
}

function mapById(reviews) {
  return new Map(reviews.map((review) => [review.id, review]));
}

module.exports = {
  ReviewChangeDetectorService,
  findReviewChanges,
};
