create table if not exists public.guild_configs (
    guild_id text primary key,
    join_to_create_channel_id text,
    updated_at timestamptz not null default now()
);

create table if not exists public.ticket_configs (
    guild_id text primary key,
    ticket_open_cat_id text,
    ticket_closed_cat_id text,
    ticket_transcripts_id text,
    ticket_logs_id text,
    ticket_roles text[] not null default '{}',
    updated_at timestamptz not null default now()
);

create table if not exists public.tickets (
    id uuid primary key default gen_random_uuid(),
    guild_id text not null,
    user_id text not null,
    channel_id text not null,
    ticket_id text not null,
    created_at timestamptz not null default now(),
    claimed boolean not null default false,
    claimed_by text,
    unique (guild_id, ticket_id)
);

create index if not exists tickets_guild_user_claimed_idx
    on public.tickets (guild_id, user_id, claimed);

create table if not exists public.feedbacks (
    guild_id text not null,
    user_id text not null,
    user_tag text,
    content jsonb not null default '[]'::jsonb,
    primary key (guild_id, user_id)
);

create table if not exists public.sanctions (
    guild_id text not null,
    user_id text not null,
    user_tag text,
    content jsonb not null default '[]'::jsonb,
    primary key (guild_id, user_id)
);

create table if not exists public.suggestions (
    server_id text not null,
    message_id text not null,
    author_suggestion_id text,
    suggestion text,
    votes_up integer not null default 0,
    votes_down integer not null default 0,
    users_up text[] not null default '{}',
    users_down text[] not null default '{}',
    primary key (server_id, message_id)
);

create index if not exists suggestions_message_id_idx
    on public.suggestions (message_id);

create table if not exists public.steam_news_state (
    app_id text primary key,
    last_gid text not null,
    last_message_id text,
    last_checked_at timestamptz
);

alter table public.steam_news_state
    add column if not exists last_message_id text;

alter table public.steam_news_state enable row level security;

grant usage on schema public to service_role;
grant all on table public.steam_news_state to service_role;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
            and tablename = 'steam_news_state'
            and policyname = 'steam_news_state_service_role_all'
    ) then
        create policy steam_news_state_service_role_all
            on public.steam_news_state
            for all
            to service_role
            using (true)
            with check (true);
    end if;
end
$$;
