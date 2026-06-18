const Discord = require('discord.js');
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    ModalBuilder,
    PermissionsBitField,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
require('dotenv').config();
require('@colors/colors');

const { assertSupabaseConfig } = require('./database/supabase');
const { loadEvents } = require('./Handlers/eventHandler');
const { handleCommands } = require('./Handlers/commandHandler');
const { startSteamNewsWatcher } = require('./Services/steamNewsWatcher');
const GuildConfig = require('./Schemas/jointocreateschema');

const client = new Discord.Client({ intents: 3276799 });
const channelMap = new Map();

client.commands = new Discord.Collection();
client.buttons = new Discord.Collection();
client.selectMenus = new Discord.Collection();
client.modals = new Discord.Collection();
client.config = require('./config');

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (!newState.channelId) {
        if (oldState.channelId && channelMap.has(oldState.member.id)) {
            const channel = oldState.guild.channels.cache.get(channelMap.get(oldState.member.id));
            if (channel && channel.members.size === 0) {
                setTimeout(async () => {
                    if (channel.members.size === 0) {
                        await channel.delete().catch(console.error);
                        channelMap.delete(oldState.member.id);
                    }
                }, 5000);
            }
        }
        return;
    }

    const guildConfig = await GuildConfig.findOne({ guildId: newState.guild.id });
    if (!guildConfig || !guildConfig.joinToCreateChannelId) return;

    if (newState.channelId === guildConfig.joinToCreateChannelId) {
        const userId = newState.member.id;
        const username = newState.member.user.username;
        const timestamp = Math.floor(Date.now() / 1000);
        const locale = newState.member.user.locale || 'unknown';

        const region = locale.startsWith('es-419') || locale.startsWith('es-') ? 'LATAM' : 'EU';
        const channelName = `PC-${region} de ${username}`;

        if (channelMap.has(userId)) {
            const existingChannel = newState.guild.channels.cache.get(channelMap.get(userId));
            if (existingChannel) {
                await newState.setChannel(existingChannel);
                return;
            }
        }

        const channel = await newState.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: newState.channel?.parentId || null,
            userLimit: 5,
            permissionOverwrites: [
                { id: newState.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: newState.member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels] },
            ],
        }).catch(console.error);

        if (!channel) return;

        channelMap.set(userId, channel.id);
        await newState.setChannel(channel);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Canal Creado')
            .setDescription(`El usuario **${username}** ha creado este canal.`)
            .addFields(
                { name: 'Propietario', value: `<@${userId}>`, inline: true },
                { name: 'Fecha de Creacion', value: `<t:${timestamp}:R>`, inline: true },
                { name: 'Region', value: region, inline: true }
            );

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`rename_channel_${userId}`)
                .setLabel('Cambiar Nombre')
                .setStyle(ButtonStyle.Primary)
        );

        try {
            await channel.send({ embeds: [embed], components: [button] });
        } catch (error) {
            console.error('No se pudo enviar el mensaje en el canal de voz.', error);
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (!interaction.guild) {
        return interaction.reply({ content: 'Este comando solo puede usarse en servidores.', ephemeral: true });
    }

    const userId = interaction.customId.split('_')[2];
    if (interaction.customId.startsWith('rename_channel') && interaction.user.id === userId) {
        const modal = new ModalBuilder()
            .setCustomId('rename_modal')
            .setTitle('Cambiar Nombre del Canal')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('new_channel_name')
                        .setLabel('Nuevo Nombre')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );
        await interaction.showModal(modal);
    } else {
        await interaction.reply({ content: 'No tienes permiso para usar este boton.', ephemeral: true });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (!interaction.guild) {
        return interaction.reply({ content: 'Este comando solo puede usarse en servidores.', ephemeral: true });
    }

    if (interaction.customId === 'rename_modal') {
        const newName = interaction.fields.getTextInputValue('new_channel_name');
        const channelId = channelMap.get(interaction.user.id);
        if (channelId) {
            const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
            if (channel) {
                await channel.setName(newName).catch(console.error);
                await interaction.reply({ content: `El nombre de tu canal ha sido cambiado a: **${newName}**`, ephemeral: true });
            } else {
                await interaction.reply({ content: 'No se pudo encontrar tu canal de voz.', ephemeral: true });
            }
        } else {
            await interaction.reply({ content: 'No tienes un canal de voz activo para renombrar.', ephemeral: true });
        }
    }
});

async function start() {
    if (!process.env.token) {
        throw new Error('Discord token missing. Set token in your .env file.');
    }

    assertSupabaseConfig();
    console.log('[Supabase API] '.green + 'is ready.');

    loadEvents(client);
    handleCommands(client);

    await client.login(process.env.token);
    console.clear();
    console.log('[Discord API] '.green + client.user.username + ' is logged.');
    startSteamNewsWatcher(client);
}

start().catch((error) => {
    console.error(error);
    process.exit(1);
});
