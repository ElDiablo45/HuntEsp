const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { sendLatestSteamNews } = require('../../Services/steamNewsWatcher');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('steam-news')
        .setDescription('Gestiona las noticias de Steam')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand((subcommand) => subcommand
            .setName('latest')
            .setDescription('Manda manualmente la ultima noticia de Steam')
            .addChannelOption((option) => option
                .setName('channel')
                .setDescription('Canal donde se mandara la noticia')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false))),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand !== 'latest') {
            return interaction.reply({ content: 'Subcomando no reconocido.', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel') || interaction.channel;
        if (!channel || typeof channel.send !== 'function') {
            return interaction.reply({ content: 'Ese canal no permite enviar mensajes.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const latest = await sendLatestSteamNews(client, channel);
            await interaction.editReply({
                content: `Ultima noticia enviada: ${latest.title || latest.gid}`,
            });
        } catch (error) {
            console.error('[Steam News] Error enviando noticia manual:', error);
            await interaction.editReply({
                content: `No pude enviar la ultima noticia: ${error.message}`,
            });
        }
    },
};
