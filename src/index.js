const path = require('path');
const { Client, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const { getDiscordEnv, getFortyTwoEnv } = require('./config/env');
const { FileTokenStore } = require('./fortyTwo/FileTokenStore');
const { FortyTwoApiClient } = require('./fortyTwo/FortyTwoApiClient');
const { SlotService } = require('./application/SlotService');
const { CorrectedReviewService } = require('./application/CorrectedReviewService');
const { UserOAuthTokenProvider } = require('./fortyTwo/UserOAuthTokenProvider');
const { formatSlots } = require('./discord/formatSlots');
const { formatSlotRanges } = require('./discord/formatSlotRanges');
const { formatUserError } = require('./discord/formatUserError');
const { parseSlotDateTime } = require('./application/parseSlotDateTime');
const { parseSlotDateTimeRange } = require('./application/parseSlotDateTimeRange');
const { getTodaySlotDeletionRange } = require('./application/getTodaySlotDeletionRange');
const { buildReviewSlotRanges } = require('./application/buildReviewSlotRanges');
const { groupSlotsIntoRanges } = require('./application/groupSlotsIntoRanges');
const { ReviewNotificationStore } = require('./notifications/ReviewNotificationStore');
const { ReviewNotificationSettingsStore } = require('./notifications/ReviewNotificationSettingsStore');
const { ReviewSnapshotStore } = require('./notifications/ReviewSnapshotStore');
const { ReviewChangeDetectorService } = require('./notifications/ReviewChangeDetectorService');
const { ReviewReminderService } = require('./notifications/ReviewReminderService');
const { AuthFailureNotifier } = require('./notifications/AuthFailureNotifier');
const { CorrectedReviewNotificationService } = require('./notifications/CorrectedReviewNotificationService');

const env = getDiscordEnv();
let slotService;
let correctedReviewService;
const reviewNotificationSettingsStore = new ReviewNotificationSettingsStore();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  startReviewNotifications().catch((error) => {
    console.error('Failed to start review notifications:', error);
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  try {
    if (interaction.commandName === 'ping') {
      await interaction.reply('pong');
      return;
    }

    if (interaction.commandName === 'slots') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const slots = await getSlotService().listMySlots();
      await interaction.editReply(formatSlots(slots));
      return;
    }

    if (interaction.commandName === 'view-slots') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const slots = await getSlotService().listMySlots();
      const ranges = groupSlotsIntoRanges(slots);
      await interaction.editReply(formatSlotRanges(ranges));
      return;
    }

    if (interaction.commandName === 'create-slot') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const beginAt = parseSlotDateTime(interaction.options.getString('begin_at', true));
      const endAt = parseSlotDateTime(interaction.options.getString('end_at', true));

      if (new Date(beginAt) >= new Date(endAt)) {
        await interaction.editReply('開始時刻は終了時刻より前にしてください。');
        return;
      }

      const slots = await getSlotService().createSlot({ beginAt, endAt });
      await interaction.editReply(`Slotを作成しました。\n\n${formatSlotRanges(groupSlotsIntoRanges(slots))}`);
      return;
    }

    if (interaction.commandName === 'open-slot') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const beginAt = parseSlotDateTime(interaction.options.getString('begin_at', true));
      const endAt = parseSlotDateTime(interaction.options.getString('end_at', true));

      if (new Date(beginAt) >= new Date(endAt)) {
        await interaction.editReply('開始時刻は終了時刻より前にしてください。');
        return;
      }

      const ranges = buildReviewSlotRanges({ beginAt, endAt });

      if (ranges.length === 0) {
        await interaction.editReply('指定範囲内に75分のレビューSlotを作成できる時間がありません。');
        return;
      }

      const slots = await getSlotService().openReviewSlots(ranges);
      await interaction.editReply(`Slotを作成しました。作成リクエスト数: ${ranges.length}\n\n${formatSlotRanges(groupSlotsIntoRanges(slots))}`);
      return;
    }

    if (interaction.commandName === 'delete-slot') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const beginAt = parseSlotDateTime(interaction.options.getString('begin_at', true));
      const endAt = parseSlotDateTime(interaction.options.getString('end_at', true));

      if (new Date(beginAt) >= new Date(endAt)) {
        await interaction.editReply('開始時刻は終了時刻より前にしてください。');
        return;
      }

      const deletedSlots = await getSlotService().closeSlotsByRange({ beginAt, endAt });

      if (deletedSlots.length === 0) {
        await interaction.editReply('指定範囲に削除対象のSlotが見つかりませんでした。');
        return;
      }

      await interaction.editReply(`Slotを削除しました。\n\n${formatSlots(deletedSlots)}`);
      return;
    }

    if (interaction.commandName === 'close-slots') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const { beginAt, endAt } = parseSlotDateTimeRange({
        beginInput: interaction.options.getString('begin_at', true),
        endInput: interaction.options.getString('end_at', true),
      });

      if (new Date(beginAt) >= new Date(endAt)) {
        await interaction.editReply('開始時刻は終了時刻より前にしてください。');
        return;
      }

      const deletedSlots = await getSlotService().closeSlotsByRange({ beginAt, endAt });

      if (deletedSlots.length === 0) {
        await interaction.editReply('指定範囲に閉じるSlotが見つかりませんでした。');
        return;
      }

      await interaction.editReply(`Slotを閉じました。\n\n${formatSlots(deletedSlots)}`);
      return;
    }

    if (interaction.commandName === 'delete-today-slots') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const { beginAt, endAt } = getTodaySlotDeletionRange();
      const deletedSlots = await getSlotService().closeSlotsByRange({ beginAt, endAt });

      if (deletedSlots.length === 0) {
        await interaction.editReply('現在時刻から翌朝4時までに削除対象のSlotはありませんでした。');
        return;
      }

      await interaction.editReply(`現在時刻から翌朝4時までのSlotを削除しました。\n\n${formatSlots(deletedSlots)}`);
      return;
    }

    if (interaction.commandName === 'register-review-notify') {
      reviewNotificationSettingsStore.write({
        userId: interaction.user.id,
        channelId: interaction.channelId,
        registeredAt: new Date().toISOString(),
      });

      await interaction.reply({
        content: `<@${interaction.user.id}> このチャンネルでレビュー通知を有効にしました。`,
        flags: MessageFlags.Ephemeral,
        allowedMentions: {
          users: [interaction.user.id],
        },
      });
      return;
    }

  } catch (error) {
    console.error(error);

    const message = formatUserError(error) || '処理中にエラーが発生しました。Botのログを確認してください。';

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message);
    } else {
      await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
  }
});

client.login(env.discordToken);

function getSlotService() {
  if (slotService) {
    return slotService;
  }

  slotService = new SlotService({ fortyTwoApiClient: createFortyTwoApiClient() });

  return slotService;
}

function createFortyTwoApiClient() {
  const fortyTwoEnv = getFortyTwoEnv();
  const tokenProvider = new UserOAuthTokenProvider({
    clientId: fortyTwoEnv.fortyTwoClientId,
    clientSecret: fortyTwoEnv.fortyTwoClientSecret,
    tokenStore: new FileTokenStore(),
  });

  return new FortyTwoApiClient({ tokenProvider });
}

function getCorrectedReviewService() {
  if (correctedReviewService) {
    return correctedReviewService;
  }

  correctedReviewService = new CorrectedReviewService({
    fortyTwoApiClient: createFortyTwoApiClient(),
  });

  return correctedReviewService;
}

async function startReviewNotifications() {
  const authFailureNotifier = new AuthFailureNotifier({ discordClient: client });

  const reminderService = new ReviewReminderService({
    discordClient: client,
    slotService: getSlotService(),
    notificationStore: new ReviewNotificationStore(),
    settingsStore: reviewNotificationSettingsStore,
    channelId: env.notifyChannelId,
    userId: env.notifyUserId,
    authFailureNotifier,
    leadMinutes: env.reviewNotifyLeadMinutes,
    intervalSeconds: env.reviewNotifyIntervalSeconds,
  });

  reminderService.start();

  const changeDetectorService = new ReviewChangeDetectorService({
    discordClient: client,
    slotService: getSlotService(),
    settingsStore: reviewNotificationSettingsStore,
    snapshotStore: new ReviewSnapshotStore(),
    channelId: env.notifyChannelId,
    userId: env.notifyUserId,
    authFailureNotifier,
    intervalSeconds: env.reviewChangeIntervalSeconds,
  });

  changeDetectorService.start();

  const correctedReviewNotificationService = new CorrectedReviewNotificationService({
    discordClient: client,
    correctedReviewService: getCorrectedReviewService(),
    notificationStore: new ReviewNotificationStore({
      filePath: path.resolve(process.cwd(), '.corrected-review-notifications.json'),
    }),
    settingsStore: reviewNotificationSettingsStore,
    snapshotStore: new ReviewSnapshotStore({
      filePath: path.resolve(process.cwd(), '.corrected-review-snapshot.json'),
    }),
    channelId: env.notifyChannelId,
    userId: env.notifyUserId,
    authFailureNotifier,
    leadMinutes: env.reviewNotifyLeadMinutes,
    intervalSeconds: env.reviewNotifyIntervalSeconds,
  });

  correctedReviewNotificationService.start();

  await sendRestartNotification();
}

async function sendRestartNotification() {
  const savedSettings = reviewNotificationSettingsStore.read();
  const channelId = savedSettings?.channelId || env.notifyChannelId;

  if (!channelId) {
    console.log('Restart notification skipped: no notification channel is configured.');
    return;
  }

  const channel = await client.channels.fetch(channelId);

  if (!channel || !channel.isTextBased()) {
    throw new Error(`Notification channel is not text based: ${channelId}`);
  }

  await channel.send('slot_managerを再起動しました。レビュー通知を再開しました。');
}
