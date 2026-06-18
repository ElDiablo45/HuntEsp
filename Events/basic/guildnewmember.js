const { Events } = require("discord.js");

const WELCOME_CHANNEL_ID = "1516932731341377768";

module.exports = {
    name: Events.GuildMemberAdd,

    async execute(member) {
        try {
            const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID)
                || await member.guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);

            if (!channel) {
                console.error(`No se pudo encontrar el canal de bienvenida: ${WELCOME_CHANNEL_ID}`);
                return;
            }

            await channel.send({ content: `Bienvenido ${member} a **Hunt Showdown Esp**` });
        } catch (error) {
            console.error("Error al ejecutar el evento GuildMemberAdd:", error);
        }
    },
};
