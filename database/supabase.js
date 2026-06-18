const { createClient } = require('@supabase/supabase-js');

let supabase;

function getJwtRole(key) {
    const parts = key.split('.');
    if (parts.length !== 3) return null;

    try {
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = Buffer.from(payload, 'base64').toString('utf8');
        return JSON.parse(decoded).role || null;
    } catch {
        return null;
    }
}

function assertServiceRoleKey(key) {
    if (key.startsWith('sb_publishable_')) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY has a publishable key. Use a Supabase secret/service_role key instead, usually starting with "sb_secret_".');
    }

    if (key.startsWith('sb_secret_')) return;

    const role = getJwtRole(key);
    if (role && role !== 'service_role') {
        throw new Error(`SUPABASE_SERVICE_ROLE_KEY must be a service_role key, but the configured key has role "${role}". Copy the service_role secret from Supabase Project Settings > API.`);
    }
}

function getSupabase() {
    if (supabase) return supabase;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error('Supabase config missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.');
    }

    assertServiceRoleKey(key);

    supabase = createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    return supabase;
}

function assertSupabaseConfig() {
    getSupabase();
}

module.exports = {
    getSupabase,
    assertSupabaseConfig,
};
