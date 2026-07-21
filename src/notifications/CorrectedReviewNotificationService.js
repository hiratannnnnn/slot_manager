const { formatCorrectedReview } = require('../discord/formatCorrectedReview');

const FINAL_REMINDER_LEAD_MINUTES = 5;

class CorrectedReviewNotificationService {
  constructor({
    discordClient,
    correctedReviewService,
    notificationStore,
    settingsStore,
    snapshotStore,
    channelId,
    userId,
    authFailureNotifier,
    leadMinutes = 42,
    intervalSeconds = 60,
  }) {
    this.discordClient = discordClient;
    this.correctedReviewService = correctedReviewService;
    this.notificationStore = notificationStore;
    this.settingsStore = settingsStore;
    this.snapshotStore = snapshotStore;
    this.channelId = channelId;
    this.userId = userId;
    this.authFailureNotifier = authFailureNotifier;
    this.leadMinutes = leadMinutes;
    this.intervalSeconds = intervalSeconds;
    this.interval = null;
    this.isChecking = false;
  }

  start() {
    this.check().catch((error) => {
      console.error('Corrected review notification check failed:', error);
    });

    this.interval = setInterval(() => {
      this.check().catch((error) => {
        console.error('Corrected review notification check failed:', error);
      });
    }, this.intervalSeconds * 1000);

    console.log(`Corrected review notification checker started. lead=${this.leadMinutes}min interval=${this.intervalSeconds}s`);
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

      const reviews = await this.correctedReviewService.listUpcomingReviews();
      this.authFailureNotifier?.markRecovered();
      const checkedAt = new Date().toISOString();
      const previousSnapshot = this.snapshotStore.read();

      if (previousSnapshot) {
        const changes = findCorrectedReviewChanges(
          previousSnapshot.reviews,
          reviews,
          checkedAt,
        );

        for (const review of changes.created) {
          await this.send(settings, '受検するレビューが予約されました。', review);
        }

        for (const review of changes.cancelled) {
          await this.send(settings, '受検予定のレビューがキャンセルされました。', review);
        }
      }

      await this.sendReminders(settings, reviews, new Date(checkedAt).getTime());
      this.snapshotStore.write({ checkedAt, reviews });
    } catch (error) {
      if (settings && await this.authFailureNotifier?.notifyIfAuthenticationError(error, settings)) {
        return;
      }

      throw error;
    } finally {
      this.isChecking = false;
    }
  }

  async sendReminders(settings, reviews, now) {
    for (const review of reviews) {
      const millisecondsUntilBegin = new Date(review.beginAt).getTime() - now;

      for (const leadMinutes of this.getReminderLeadMinutes()) {
        if (millisecondsUntilBegin <= 0 || millisecondsUntilBegin > leadMinutes * 60 * 1000) {
          continue;
        }

        if (leadMinutes === this.leadMinutes
          && leadMinutes > FINAL_REMINDER_LEAD_MINUTES
          && millisecondsUntilBegin <= FINAL_REMINDER_LEAD_MINUTES * 60 * 1000) {
          continue;
        }

        const notificationKey = `corrected-review-starting:${review.id}:${leadMinutes}m`;

        if (this.notificationStore.has(notificationKey)) {
          continue;
        }

        await this.send(settings, `受検するレビューの開始${leadMinutes}分前です。`, review);
        this.notificationStore.add(notificationKey);
      }
    }
  }

  async send(settings, title, review) {
    const channel = await this.discordClient.channels.fetch(settings.channelId);

    if (!channel || !channel.isTextBased()) {
      throw new Error(`Notification channel is not text based: ${settings.channelId}`);
    }

    await channel.send({
      content: `<@${settings.userId}> ${title}\n\n${formatCorrectedReview(review)}`,
      allowedMentions: { users: [settings.userId] },
    });
  }

  getReminderLeadMinutes() {
    return [...new Set([this.leadMinutes, FINAL_REMINDER_LEAD_MINUTES])];
  }

  getSettings() {
    const savedSettings = this.settingsStore ? this.settingsStore.read() : null;
    const channelId = savedSettings?.channelId || this.channelId;
    const userId = savedSettings?.userId || this.userId;

    return channelId && userId ? { channelId, userId } : null;
  }
}

function findCorrectedReviewChanges(previousReviews, currentReviews, checkedAt) {
  const currentIds = new Set(currentReviews.map((review) => String(review.id)));
  const previousIds = new Set(previousReviews.map((review) => String(review.id)));
  const checkedAtTime = new Date(checkedAt).getTime();

  return {
    created: currentReviews.filter((review) => !previousIds.has(String(review.id))),
    cancelled: previousReviews.filter((review) => (
      !currentIds.has(String(review.id))
      && new Date(review.beginAt).getTime() > checkedAtTime
    )),
  };
}

module.exports = {
  CorrectedReviewNotificationService,
  findCorrectedReviewChanges,
};
