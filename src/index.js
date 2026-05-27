const { Client, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const { getDiscordEnv, getFortyTwoEnv } = require('./config/env');
const { FileTokenStore } = require('./fortyTwo/FileTokenStore');
const { FortyTwoApiClient } = require('./fortyTwo/FortyTwoApiClient');
const { SlotService } = require('./application/SlotService');
const { UserOAuthTokenProvider } = require('./fortyTwo/UserOAuthTokenProvider');
const { formatSlots } = require('./discord/formatSlots');
const { parseSlotDateTime } = require('./application/parseSlotDateTime');
const { getTodaySlotDeletionRange } = require('./application/getTodaySlotDeletionRange');
const { ReviewNotificationStore } = require('./notifications/ReviewNotificationStore');
const { ReviewNotificationSettingsStore } = require('./notifications/ReviewNotificationSettingsStore');
const { ReviewSnapshotStore } = require('./notifications/ReviewSnapshotStore');
const { ReviewChangeDetectorService } = require('./notifications/ReviewChangeDetectorService');
const { ReviewReminderService } = require('./notifications/ReviewReminderService');

const env = getDiscordEnv();
let slotService;
const reviewNotificationSettingsStore = new ReviewNotificationSettingsStore();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  startReviewNotifications();
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

    if (interaction.commandName === 'create-slot') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const beginAt = parseSlotDateTime(interaction.options.getString('begin_at', true));
      const endAt = parseSlotDateTime(interaction.options.getString('end_at', true));

      if (new Date(beginAt) >= new Date(endAt)) {
        await interaction.editReply('開始時刻は終了時刻より前にしてください。');
        return;
      }

      const slots = await getSlotService().createSlot({ beginAt, endAt });
      await interaction.editReply(`Slotを作成しました。\n\n${formatSlots(slots)}`);
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

      const deletedSlots = await getSlotService().deleteSlotsByRange({ beginAt, endAt });

      if (deletedSlots.length === 0) {
        await interaction.editReply('指定範囲に削除対象のSlotが見つかりませんでした。');
        return;
      }

      await interaction.editReply(`Slotを削除しました。\n\n${formatSlots(deletedSlots)}`);
      return;
    }

    if (interaction.commandName === 'delete-today-slots') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const { beginAt, endAt } = getTodaySlotDeletionRange();
      const deletedSlots = await getSlotService().deleteSlotsByRange({ beginAt, endAt });

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

    const message = '処理中にエラーが発生しました。Botのログを確認してください。';

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

function startReviewNotifications() {
  const reminderService = new ReviewReminderService({
    discordClient: client,
    slotService: getSlotService(),
    notificationStore: new ReviewNotificationStore(),
    settingsStore: reviewNotificationSettingsStore,
    channelId: env.notifyChannelId,
    userId: env.notifyUserId,
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
    intervalSeconds: env.reviewChangeIntervalSeconds,
  });

  changeDetectorService.start();
}
