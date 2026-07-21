const dotenv = require('dotenv');

dotenv.config({ quiet: true });

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getDiscordEnv() {
  return {
    discordToken: requireEnv('DISCORD_TOKEN'),
    discordClientId: requireEnv('DISCORD_CLIENT_ID'),
    discordGuildId: process.env.DISCORD_GUILD_ID,
    notifyChannelId: process.env.DISCORD_NOTIFY_CHANNEL_ID,
    notifyUserId: process.env.DISCORD_NOTIFY_USER_ID,
    reviewNotifyLeadMinutes: readIntegerEnv('REVIEW_NOTIFY_LEAD_MINUTES', 42),
    reviewNotifyIntervalSeconds: readIntegerEnv('REVIEW_NOTIFY_INTERVAL_SECONDS', 60),
    reviewChangeIntervalSeconds: readIntegerEnv('REVIEW_CHANGE_INTERVAL_SECONDS', 300),
  };
}

function getFortyTwoEnv() {
  return {
    fortyTwoClientId: requireEnv('FORTYTWO_CLIENT_ID'),
    fortyTwoClientSecret: requireEnv('FORTYTWO_CLIENT_SECRET'),
    fortyTwoRedirectUri: process.env.FORTYTWO_REDIRECT_URI || 'http://localhost:3000/auth/42/callback',
    fortyTwoScopes: process.env.FORTYTWO_SCOPES || 'public projects',
  };
}

module.exports = {
  getDiscordEnv,
  getFortyTwoEnv,
};

function readIntegerEnv(name, defaultValue) {
  const value = process.env[name];

  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer environment variable: ${name}`);
  }

  return parsed;
}
