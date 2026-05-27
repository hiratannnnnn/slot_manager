const { SlashCommandBuilder } = require('discord.js');

const commandDefinitions = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Botの疎通確認をします'),
  new SlashCommandBuilder()
    .setName('slots')
    .setDescription('42の自分のSlot一覧を表示します'),
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
    .setName('register-review-notify')
    .setDescription('このチャンネルで自分宛てのレビュー通知を有効にします'),
];

module.exports = {
  commandDefinitions,
};
