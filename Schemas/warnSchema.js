const { createSupabaseModel } = require('../database/supabaseModel');

module.exports = createSupabaseModel({
    table: 'feedbacks',
    primaryKey: 'guild_id',
    conflictColumns: ['guild_id', 'user_id'],
    fields: {
        GuildID: 'guild_id',
        UserID: 'user_id',
        UserTag: 'user_tag',
        Content: 'content',
    },
    defaults: {
        Content: () => [],
    },
});
