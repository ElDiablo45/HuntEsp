const { createSupabaseModel } = require('../database/supabaseModel');

module.exports = createSupabaseModel({
    table: 'steam_news_state',
    primaryKey: 'app_id',
    fields: {
        appId: 'app_id',
        lastGid: 'last_gid',
        lastMessageId: 'last_message_id',
        lastCheckedAt: 'last_checked_at',
    },
});
