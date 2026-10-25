const { groupBookedSlotsIntoReviews } = require('../application/groupBookedSlotsIntoReviews');
const { formatReview } = require('../discord/formatReview');
class ReviewReminderService {
  constructor({
    discordClient,
    slotService,
    notificationStore,
    settingsStore,
    channelId,
    userId,
    authFailureNotifier,
    leadMinutes = 30,
    intervalSeconds = 300,
  }) {
    this.discordClient = discordClient;
    this.slotService = slotService;
    this.notificationStore = notificationStore;
    this.settingsStore = settingsStore;
    this.channelId = channelId;
    this.userId = userId;
    this.authFailureNotifier = authFailureNotifier;
    this.leadMinutes = leadMinutes;
    this.intervalSeconds = intervalSeconds;
    this.interval = null;
    this.isChecking = false;
  }

  start() {
    const settings = this.getSettings();

    if (!settings) {
      console.log('Review reminders waiting for settings. Run /register-review-notify or set DISCORD_NOTIFY_CHANNEL_ID and DISCORD_NOTIFY_USER_ID.');
    }

    this.check().catch((error) => {
      console.error('Review reminder check failed:', error);
    });

    this.interval = setInterval(() => {
      this.check().catch((error) => {
        console.error('Review reminder check failed:', error);
      });
    }, this.intervalSeconds * 1000);

    console.log(`Review reminder checker started. lead=${this.leadMinutes}min interval=${this.intervalSeconds}s`);
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

      const slots = await this.slotService.listMySlots();
      this.authFailureNotifier?.markRecovered();

      const reviews = groupBookedSlotsIntoReviews(slots);
      const now = Date.now();
      for (const review of reviews) {
        const beginTime = new Date(review.beginAt).getTime();

        for (const reminderLeadMinutes of this.getReminderLeadMinutes()) {
          const millisecondsUntilBegin = beginTime - now;
          const leadMilliseconds = reminderLeadMinutes * 60 * 1000;

          if (millisecondsUntilBegin <= 0 || millisecondsUntilBegin > leadMilliseconds) {
            continue;
          }

          const notificationKey = `review-starting:${review.id}:${reminderLeadMinutes}m`;
          const legacyNotificationKey = `review-starting:${review.id}`;

          if (this.notificationStore.has(notificationKey)
            || this.notificationStore.has(legacyNotificationKey)
            || hasNotifiedReviewWithSharedSlot(
              this.notificationStore.read().notified,
              review,
            )) {
            continue;
          }

          await this.sendReminder(review, settings, reminderLeadMinutes);
          this.notificationStore.add(notificationKey);
        }
      }
    } catch (error) {
      if (settings && await this.authFailureNotifier?.notifyIfAuthenticationError(error, settings)) {
        return;
      }

      throw error;
    } finally {
      this.isChecking = false;
    }
  }

  async sendReminder(review, settings, reminderLeadMinutes) {
    const channel = await this.discordClient.channels.fetch(settings.channelId);

    if (!channel || !channel.isTextBased()) {
      throw new Error(`Notification channel is not text based: ${settings.channelId}`);
    }

    const mention = `<@${settings.userId}>`;

    await channel.send({
      content: `${mention} レビュー開始${reminderLeadMinutes}分前です。\n\n${formatReview(review)}`,
      allowedMentions: {
        users: [settings.userId],
      },
    });
  }

  getReminderLeadMinutes() {
    return [this.leadMinutes];
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

function hasNotifiedReviewWithSharedSlot(
  notificationKeys,
  review,
) {
  const currentSlotIds = new Set(review.slotIds.map(String));

  return notificationKeys.some((notificationKey) => {
    const notifiedSlotIds = getNotifiedSlotIds(notificationKey);

    return notifiedSlotIds.some((slotId) => currentSlotIds.has(slotId));
  });
}

function getNotifiedSlotIds(notificationKey) {
  const prefix = 'review-starting:';

  if (!notificationKey.startsWith(prefix)) {
    return [];
  }

  const slotIds = notificationKey.slice(prefix.length).split(':', 1)[0];
  return slotIds.split('-').filter(Boolean);
}

module.exports = {
  ReviewReminderService,
  hasNotifiedReviewWithSharedSlot,
};
