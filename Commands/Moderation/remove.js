const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("del")
        .setDescription("Eliminar a un usuario o rol del ticket")
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addUserOption((input) =>
            input.setName("user").setDescription("El usuario a eliminar").setRequired(false))
        .addRoleOption((input) =>
            input.setName("role").setDescription("El rol a eliminar").setRequired(false)),
    async execute(interaction, client) {

        

        const user = interaction.options.getUser("user");
        const role = interaction.options.getRole("role");

        if (user) {
            await interaction.channel.permissionOverwrites
                .edit(user, {
                    SendMessages: false,
                    AddReactions: false,
                    ReadMessageHistory: false,
                    AttachFiles: false,
                    ViewChannel: false,
                })
                .catch((e) => console.log(e));

            interaction
                .reply({ content: `> Has eliminado a <@${user.id}> del ticket` })
                .catch((e) => console.log(e));
        } else if (role) {
            await interaction.channel.permissionOverwrites
                .edit(role, {
                    SendMessages: false,
                    AddReactions: false,
                    ReadMessageHistory: false,
                    AttachFiles: false,
                    ViewChannel: false,
                })
                .catch((e) => console.log(e));

            interaction
                .reply({ content: `> Has eliminado el rol <@&${role.id}> del ticket` })
                .catch((e) => console.log(e));
        } else {
            interaction
                .reply({ content: `> No se proporcionó un usuario ni un rol para eliminar` })
                .catch((e) => console.log(e));
        }
    },
};