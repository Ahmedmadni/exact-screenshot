create table if not exists public.presentation_snapshots (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_kit_snapshots (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_template_snapshots (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_records (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists presentation_snapshots_user_idx on public.presentation_snapshots(user_id);
create index if not exists brand_kit_snapshots_user_idx on public.brand_kit_snapshots(user_id);
create index if not exists saved_template_snapshots_user_idx on public.saved_template_snapshots(user_id);
create index if not exists asset_records_user_idx on public.asset_records(user_id);

alter table public.presentation_snapshots enable row level security;
alter table public.brand_kit_snapshots enable row level security;
alter table public.saved_template_snapshots enable row level security;
alter table public.asset_records enable row level security;

drop policy if exists "users_manage_own_presentations" on public.presentation_snapshots;
create policy "users_manage_own_presentations" on public.presentation_snapshots
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users_manage_own_brand_kits" on public.brand_kit_snapshots;
create policy "users_manage_own_brand_kits" on public.brand_kit_snapshots
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users_manage_own_saved_templates" on public.saved_template_snapshots;
create policy "users_manage_own_saved_templates" on public.saved_template_snapshots
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users_manage_own_assets" on public.asset_records;
create policy "users_manage_own_assets" on public.asset_records
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


create table if not exists public.presentation_versions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.review_comments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.review_decisions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists presentation_versions_user_idx on public.presentation_versions(user_id);
create index if not exists review_comments_user_idx on public.review_comments(user_id);
create index if not exists review_decisions_user_idx on public.review_decisions(user_id);

alter table public.presentation_versions enable row level security;
alter table public.review_comments enable row level security;
alter table public.review_decisions enable row level security;

drop policy if exists "users_manage_own_versions" on public.presentation_versions;
create policy "users_manage_own_versions" on public.presentation_versions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users_manage_own_review_comments" on public.review_comments;
create policy "users_manage_own_review_comments" on public.review_comments
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users_manage_own_review_decisions" on public.review_decisions;
create policy "users_manage_own_review_decisions" on public.review_decisions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


create extension if not exists pgcrypto;

create table if not exists public.review_share_links (
  id text primary key,
  presentation_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists review_share_links_owner_idx on public.review_share_links(owner_user_id);
create index if not exists review_share_links_presentation_idx on public.review_share_links(presentation_id);
alter table public.review_share_links enable row level security;

drop policy if exists "owners_manage_review_share_links" on public.review_share_links;
create policy "owners_manage_review_share_links" on public.review_share_links
for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

create or replace function public.create_review_share(
  p_presentation_id text,
  p_share_token text,
  p_expires_at timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_id text := encode(gen_random_bytes(12), 'hex');
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;
  if length(p_share_token) < 32 then
    raise exception 'Invalid share token';
  end if;
  if not exists (
    select 1 from public.presentation_snapshots
    where id = p_presentation_id and user_id = v_owner
  ) then
    raise exception 'Presentation not found or not owned by caller';
  end if;

  insert into public.review_share_links(id, presentation_id, owner_user_id, token_hash, expires_at)
  values (v_id, p_presentation_id, v_owner, encode(digest(p_share_token, 'sha256'), 'hex'), p_expires_at);

  return jsonb_build_object('id', v_id, 'expiresAt', p_expires_at);
end;
$$;

create or replace function public.get_review_share(p_share_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.review_share_links%rowtype;
  v_payload jsonb;
  v_slides jsonb;
  v_comments jsonb;
begin
  select * into v_link
  from public.review_share_links
  where token_hash = encode(digest(p_share_token, 'sha256'), 'hex')
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  limit 1;

  if v_link.id is null then
    return null;
  end if;

  select payload into v_payload
  from public.presentation_snapshots
  where id = v_link.presentation_id and user_id = v_link.owner_user_id;

  if v_payload is null then
    return null;
  end if;

  select coalesce(jsonb_agg(value - 'speakerNotes'), '[]'::jsonb)
  into v_slides
  from jsonb_array_elements(coalesce(v_payload->'slides', '[]'::jsonb));

  v_payload := jsonb_set(v_payload - 'rehearsals', '{slides}', v_slides, true);

  select coalesce(jsonb_agg(payload order by updated_at asc), '[]'::jsonb)
  into v_comments
  from public.review_comments
  where payload->>'presentationId' = v_link.presentation_id;

  return jsonb_build_object(
    'presentation', v_payload,
    'comments', v_comments,
    'expiresAt', v_link.expires_at
  );
end;
$$;

create or replace function public.add_review_share_comment(
  p_share_token text,
  p_author_name text,
  p_comment_body text,
  p_slide_id text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.review_share_links%rowtype;
  v_id text := encode(gen_random_bytes(12), 'hex');
  v_stamp timestamptz := now();
  v_payload jsonb;
begin
  select * into v_link
  from public.review_share_links
  where token_hash = encode(digest(p_share_token, 'sha256'), 'hex')
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  limit 1;

  if v_link.id is null then
    raise exception 'Review link is invalid or expired';
  end if;
  if length(trim(coalesce(p_comment_body, ''))) < 1 or length(p_comment_body) > 4000 then
    raise exception 'Comment must be between 1 and 4000 characters';
  end if;

  v_payload := jsonb_build_object(
    'id', v_id,
    'presentationId', v_link.presentation_id,
    'slideId', p_slide_id,
    'authorName', left(coalesce(nullif(trim(p_author_name), ''), 'External reviewer'), 120),
    'body', trim(p_comment_body),
    'resolved', false,
    'createdAt', to_char(v_stamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updatedAt', to_char(v_stamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  insert into public.review_comments(id, user_id, payload, updated_at)
  values (v_id, v_link.owner_user_id, v_payload, v_stamp);

  return v_payload;
end;
$$;

grant execute on function public.get_review_share(text) to anon, authenticated;
grant execute on function public.add_review_share_comment(text, text, text, text) to anon, authenticated;
grant execute on function public.create_review_share(text, text, timestamptz) to authenticated;
