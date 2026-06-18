const { createSupabaseModel, dateToDb, dateFromDb } = require('../database/supabaseModel');

module.exports = createSupabaseModel({
    table: 'tickets',
    primaryKey: 'id',
    conflictColumns: ['guild_id', 'ticket_id'],
    fields: {
        id: 'id',
        guildId: 'guild_id',
        userId: 'user_id',
        channelId: 'channel_id',
        ticketId: 'ticket_id',
        createdAt: {
            column: 'created_at',
            toDb: dateToDb,
            fromDb: dateFromDb,
        },
        claimed: 'claimed',
        claimedBy: 'claimed_by',
    },
    defaults: {
        createdAt: () => new Date(),
        claimed: false,
        claimedBy: null,
    },
});
