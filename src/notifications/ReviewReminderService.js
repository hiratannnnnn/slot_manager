const { groupBookedSlotsIntoReviews } = require('../application/groupBookedSlotsIntoReviews');
const { formatReview } = require('../discord/formatReview');
const FINAL_REMINDER_LEAD_MINUTES = 5;

class ReviewReminderService {
  constructor({
    discordClient,
    slotService,
    notificationStore,
    settingsStore,
    channelId,
    userId,
    authFailureNotifier,
    leadMinutes = 42,
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

          // A bot restarted within the final five minutes should send only the final reminder.
          if (reminderLeadMinutes === this.leadMinutes
            && reminderLeadMinutes > FINAL_REMINDER_LEAD_MINUTES
            && millisecondsUntilBegin <= FINAL_REMINDER_LEAD_MINUTES * 60 * 1000) {
            continue;
          }

          const notificationKey = `review-starting:${review.id}:${reminderLeadMinutes}m`;
          const legacyNotificationKey = `review-starting:${review.id}`;

          if (this.notificationStore.has(notificationKey)
            || (reminderLeadMinutes === this.leadMinutes && this.notificationStore.has(legacyNotificationKey))) {
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
    return [...new Set([this.leadMinutes, FINAL_REMINDER_LEAD_MINUTES])];
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

module.exports = {
  ReviewReminderService,
};
