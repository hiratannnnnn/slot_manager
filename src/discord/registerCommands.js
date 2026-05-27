const { REST, Routes } = require('discord.js');
const { commandDefinitions } = require('./commands');
const { getDiscordEnv } = require('../config/env');

async function registerCommands() {
  const env = getDiscordEnv();
  const rest = new REST({ version: '10' }).setToken(env.discordToken);
  const body = commandDefinitions.map((command) => command.toJSON());

  if (env.discordGuildId) {
    await rest.put(
      Routes.applicationGuildCommands(env.discordClientId, env.discordGuildId),
      { body },
    );
    console.log(`Registered ${body.length} guild commands.`);
    return;
  }

  await rest.put(Routes.applicationCommands(env.discordClientId), { body });
  console.log(`Registered ${body.length} global commands.`);
}

registerCommands().catch((error) => {
  console.error(error);
  process.exit(1);
});
