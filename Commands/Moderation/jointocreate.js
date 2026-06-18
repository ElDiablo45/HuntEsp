const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord.js');
const GuildConfig = require('../../Schemas/jointocreateschema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jtc-setup')
        .setDescription('Sets the join to create voice channel.')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The trigger voice channel')
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.guildId) {
            return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel');

        if (channel.type !== ChannelType.GuildVoice) {
            return interaction.reply({ content: 'Please select a voice channel.', ephemeral: true });
        }

        await GuildConfig.findOneAndUpdate(
            { guildId: interaction.guildId },
            { joinToCreateChannelId: channel.id },
            { upsert: true }
        );

        interaction.reply({ content: `Join to create channel set to ${channel.name}`, ephemeral: true });
    },
};
