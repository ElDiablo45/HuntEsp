const {SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, PermissionFlagsBits,ButtonBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('post-ticket').setDescription('Post a ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
    .addStringOption(option => option.setName('title').setDescription('Title of the ticket').setRequired(true))
    .addChannelOption(option => option.setName('channel').setDescription('Channel to post the ticket in').setRequired(true)),
    async execute(interaction) {
        const title = interaction.options.getString('title') || 'Ticket';
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        const embed = new EmbedBuilder().setTitle(title).setDescription('Para crear un Ticket pulsa en el boton adjunto debajo de este mensaje.').setColor('#A3A27E').setFooter({ text: 'Recruit And Training Division' });
        const button = new ButtonBuilder().setCustomId(`ticket`).setLabel('Abrir ticket').setStyle('2');

        const actionRow = new ActionRowBuilder().addComponents(button);

        await channel.send({embeds: [embed], components: [actionRow]});
        await interaction.reply({content: 'Ticket posted', ephemeral: true});
    }
}