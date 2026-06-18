const { createSupabaseModel, stringArrayToDb, stringArrayFromDb } = require('../database/supabaseModel');

module.exports = createSupabaseModel({
    table: 'ticket_configs',
    primaryKey: 'guild_id',
    fields: {
        guildID: 'guild_id',
        ticketOpenCatID: 'ticket_open_cat_id',
        ticketClosedCatID: 'ticket_closed_cat_id',
        ticketTranscriptsID: 'ticket_transcripts_id',
        ticketLogsID: 'ticket_logs_id',
        ticketRoles: {
            column: 'ticket_roles',
            toDb: stringArrayToDb,
            fromDb: stringArrayFromDb,
        },
    },
    defaults: {
        ticketRoles: () => [],
    },
});
