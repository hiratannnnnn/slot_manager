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
      const leadMilliseconds = this.leadMinutes * 60 * 1000;

      for (const review of reviews) {
        const beginTime = new Date(review.beginAt).getTime();
        const millisecondsUntilBegin = beginTime - now;

        if (millisecondsUntilBegin <= 0 || millisecondsUntilBegin > leadMilliseconds) {
          continue;
        }

        const notificationKey = `review-starting:${review.id}`;

        if (this.notificationStore.has(notificationKey)) {
          continue;
        }

        await this.sendReminder(review, settings);
        this.notificationStore.add(notificationKey);
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

  async sendReminder(review, settings) {
    const channel = await this.discordClient.channels.fetch(settings.channelId);

    if (!channel || !channel.isTextBased()) {
      throw new Error(`Notification channel is not text based: ${settings.channelId}`);
    }

    const mention = `<@${settings.userId}>`;

    await channel.send({
      content: `${mention} レビュー開始が近づいています。\n\n${formatReview(review)}`,
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

module.exports = {
  ReviewReminderService,
};
