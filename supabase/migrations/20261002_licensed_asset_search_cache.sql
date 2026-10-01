-- Licensed media provider search cache.
-- Provider APIs can require search responses to be cached. This server-only table
-- keeps third-party API traffic behind Edge Functions and is never exposed to
-- authenticated browser clients.

create table if not exists public.licensed_asset_search_cache (
  cache_key text primary key,
  provider text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists licensed_asset_search_cache_expires_idx
  on public.licensed_asset_search_cache(expires_at);

alter table public.licensed_asset_search_cache enable row level security;

-- Deliberately no browser-facing RLS policy. Supabase service-role access from
-- the licensed-assets Edge Function bypasses RLS.
