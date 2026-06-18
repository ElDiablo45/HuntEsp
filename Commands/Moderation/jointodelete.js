const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const GuildConfig = require('../../Schemas/jointocreateschema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jtc-remove')
        .setDescription('Removes the join to create voice channel system from the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        if (!interaction.guildId) {
            return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        }

        const result = await GuildConfig.findOneAndDelete({ guildId: interaction.guildId });

        if (!result) {
            return interaction.reply({ content: 'The join to create system is not currently set up in this server.', ephemeral: true });
        }

        interaction.reply({ content: 'The join to create system has been successfully removed from the server.', ephemeral: true });
    },
};
