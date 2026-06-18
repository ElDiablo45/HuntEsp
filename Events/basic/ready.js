const { Events } = require('discord.js');
const { assertSupabaseConfig } = require('../../database/supabase');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute: async () => {
        assertSupabaseConfig();
        console.log('\n');
        console.log(' [ OK ] Supabase configurado correctamente.');
    },
};
