const { createSupabaseModel } = require('../database/supabaseModel');

module.exports = createSupabaseModel({
    table: 'guild_configs',
    primaryKey: 'guild_id',
    fields: {
        guildId: 'guild_id',
        joinToCreateChannelId: 'join_to_create_channel_id',
    },
});
