const { createSupabaseModel, stringArrayToDb, stringArrayFromDb } = require('../database/supabaseModel');

module.exports = createSupabaseModel({
    table: 'suggestions',
    primaryKey: 'server_id',
    conflictColumns: ['server_id', 'message_id'],
    fields: {
        Servidor: 'server_id',
        MensajeId: 'message_id',
        AutorSugerenciaId: 'author_suggestion_id',
        Sugerencia: 'suggestion',
        VotosArriba: 'votes_up',
        VotosAbajo: 'votes_down',
        UsuariosArriba: {
            column: 'users_up',
            toDb: stringArrayToDb,
            fromDb: stringArrayFromDb,
        },
        UsuariosAbajo: {
            column: 'users_down',
            toDb: stringArrayToDb,
            fromDb: stringArrayFromDb,
        },
    },
    defaults: {
        VotosArriba: 0,
        VotosAbajo: 0,
        UsuariosArriba: () => [],
        UsuariosAbajo: () => [],
    },
});
