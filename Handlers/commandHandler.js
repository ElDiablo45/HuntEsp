const { REST } = require("@discordjs/rest");
const { SlashCommandBuilder } = require("discord.js");
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
require('@colors/colors');
const path = require('path'); // Asegúrate de requerir path si no lo habías hecho

const clientId = process.env.clientid; 
const guildId = process.env.guildid; 

function handleCommands(client) {
  client.commandArray = [];

  // Define el path base para las carpetas de comandos
  const commandFoldersPath = path.join(__dirname, '../Commands');
  const commandFolders = fs.readdirSync(commandFoldersPath);

  for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`${commandFoldersPath}/${folder}`).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const command = require(`../Commands/${folder}/${file}`);
      client.commands.set(command.data.name, command);

      if (command.data instanceof SlashCommandBuilder) {
        client.commandArray.push(command.data.toJSON());
      } else {
        client.commandArray.push(command.data);
      }
    }
  }

  const rest = new REST({ version: '9' }).setToken(process.env.token);

  (async () => {
    try {
      console.log('[Refreshing]'.magenta + ` Is now up`);

      await rest.put(
        Routes.applicationCommands(clientId), 
        { body: client.commandArray }
      );

      console.log('[Reload]'.yellow + ` Is now up`);
    } catch (error) {
      console.error(error);
    }
  })();
}

module.exports = { handleCommands };
