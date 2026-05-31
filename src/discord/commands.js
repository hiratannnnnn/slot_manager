const { SlashCommandBuilder } = require('discord.js');

const commandDefinitions = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Botの疎通確認をします'),
  new SlashCommandBuilder()
    .setName('slots')
    .setDescription('42の自分のSlot一覧を表示します'),
  new SlashCommandBuilder()
    .setName('view-slots')
    .setDescription('42の自分のSlot一覧を連続区間ごとにまとめて表示します'),
  new SlashCommandBuilder()
    .setName('create-slot')
    .setDescription('42のSlotを作成します')
    .addStringOption((option) =>
      option
        .setName('begin_at')
        .setDescription('開始時刻。例: 2026-05-28 03:00')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('end_at')
        .setDescription('終了時刻。例: 2026-05-28 03:15')
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName('open-slot')
    .setDescription('75分のSlot作成と15分休憩を指定範囲内で繰り返します')
    .addStringOption((option) =>
      option
        .setName('begin_at')
        .setDescription('開始時刻。例: 2026-05-28 03:00')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('end_at')
        .setDescription('終了時刻。例: 2026-05-28 06:00')
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName('delete-slot')
    .setDescription('42のSlotを削除します')
    .addStringOption((option) =>
      option
        .setName('begin_at')
        .setDescription('削除開始時刻。例: 2026-05-28 03:00')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('end_at')
        .setDescription('削除終了時刻。例: 2026-05-28 03:45')
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName('close-slots')
    .setDescription('指定範囲の42 Slotをすべて閉じます。日付のみなら0:00-24:00で扱います')
    .addStringOption((option) =>
      option
        .setName('begin_at')
        .setDescription('閉じる開始日時。例: 6-1 または 6-1 03:00')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('end_at')
        .setDescription('閉じる終了日時。例: 6-1 または 6-1 06:00')
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName('delete-today-slots')
    .setDescription('現在時刻から翌朝4時までの自分のSlotをすべて削除します'),
  new SlashCommandBuilder()
    .setName('register-review-notify')
    .setDescription('このチャンネルで自分宛てのレビュー通知を有効にします'),
];

module.exports = {
  commandDefinitions,
};
