const {SlashCommandBuilder, PermissionsBitField, ChannelType} = require('discord.js');
const schemaTicketConfig = require('../../Schemas/config');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-config')
        .setDescription('Configure the ticket system')
        .addSubcommand(subcommand => subcommand
            .setName('category')
            .setDescription('Set the category for tickets')
            .addChannelOption(option => option.setName('category-open').setDescription('The category where the open tickets will be created').setRequired(true))
            .addChannelOption(option => option.setName('category-closed').setDescription('The category where the closed tickets will be moved').setRequired(true))
            .addChannelOption(option => option.setName('channel-transcript').setDescription('The channel where the transcript will be sent').setRequired(true))
            .addChannelOption(option => option.setName('channel-logs').setDescription('The channel where the logs will be sent').setRequired(true))
        )
        .addSubcommand(subcommand => subcommand
            .setName('role')
            .setDescription('Set the role for tickets')
            .addRoleOption(option => option.setName('role-support').setDescription('The role that can see and manage tickets').setRequired(true))
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return interaction.reply({content: 'You need to be have manage channel permission to use this command', ephemeral: true});
        const subcommand = interaction.options.getSubcommand();
        switch (subcommand) {
            case 'category':
                const categoryOpen = interaction.options.getChannel('category-open');
                const categoryClosed = interaction.options.getChannel('category-closed');
                const categoryOverflow = interaction.options.getChannel('channel-transcript');
                const categoryLoggin = interaction.options.getChannel('channel-logs');
                if (categoryOpen.type !== ChannelType.GuildCategory || categoryClosed.type !== ChannelType.GuildCategory || categoryOverflow.type !== ChannelType.GuildText || categoryLoggin.type !== ChannelType.GuildText) return interaction.reply({content: 'The channels must be a category', ephemeral: true});

                await schemaTicketConfig.findOneAndUpdate(
                    {guildID: interaction.guild.id},
                    {ticketOpenCatID: categoryOpen.id, ticketClosedCatID: categoryClosed.id, ticketTranscriptsID: categoryOverflow.id, ticketLogsID: categoryLoggin.id},
                    {upsert: true}
                );
                interaction.reply({content: 'The categories have been set', ephemeral: true});
            break;
            case 'role':
                const roleSupport = interaction.options.getRole('role-support');
                await schemaTicketConfig.findOneAndUpdate(
                    {guildID: interaction.guild.id},
                    {ticketRoles: roleSupport.id},
                    {upsert: true}
                );
                interaction.reply({content: 'The role has been set', ephemeral: true});
            break;
            default:
                interaction.reply({content: 'You need to specify a subcommand', ephemeral: true});
            break;
        }
    }
}
