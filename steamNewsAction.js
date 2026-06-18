require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { checkSteamNews } = require('./Services/steamNewsWatcher');

async function runSteamNewsAction() {
    if (!process.env.token) {
        throw new Error('Discord token missing. Set token in your .env file as token=...');
    }

    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
        makeCache: () => new Map(),
    });

    client.on('error', (error) => {
        console.error('[Steam News Action] Discord client error:', error);
    });

    await client.login(process.env.token);
    console.log(`[Steam News Action] Logged in as ${client.user.tag}`);

    await checkSteamNews(client);

    await client.destroy();
    console.log('[Steam News Action] Finished and disconnected.');
}

runSteamNewsAction()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('[Steam News Action] Error:', error);
        process.exit(1);
    });
