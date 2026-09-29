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
  where payload->>'presentationId' = v_link.presentation_id
    and coalesce((payload->>'external')::boolean, false) = true;

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
    'external', true,
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


-- Live team collaboration -----------------------------------------------------

create table if not exists public.presentation_collaborators (
  presentation_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  role text not null check (role in ('editor','reviewer','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (presentation_id, user_id)
);

create table if not exists public.collaboration_invites (
  id text primary key,
  presentation_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  invited_email text not null,
  role text not null check (role in ('editor','reviewer','viewer')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.presentation_live_documents (
  presentation_id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision bigint not null default 1,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);

create index if not exists presentation_collaborators_owner_idx on public.presentation_collaborators(owner_user_id);
create index if not exists presentation_collaborators_user_idx on public.presentation_collaborators(user_id);
create index if not exists collaboration_invites_owner_idx on public.collaboration_invites(owner_user_id);
create index if not exists collaboration_invites_presentation_idx on public.collaboration_invites(presentation_id);
create index if not exists live_documents_owner_idx on public.presentation_live_documents(owner_user_id);

alter table public.presentation_collaborators enable row level security;
alter table public.collaboration_invites enable row level security;
alter table public.presentation_live_documents enable row level security;

drop policy if exists "collaborators_read_membership" on public.presentation_collaborators;
create policy "collaborators_read_membership" on public.presentation_collaborators
for select using (auth.uid() = owner_user_id or auth.uid() = user_id);

drop policy if exists "owners_manage_membership" on public.presentation_collaborators;
create policy "owners_manage_membership" on public.presentation_collaborators
for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists "owners_manage_collaboration_invites" on public.collaboration_invites;
create policy "owners_manage_collaboration_invites" on public.collaboration_invites
for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists "team_read_live_documents" on public.presentation_live_documents;
create policy "team_read_live_documents" on public.presentation_live_documents
for select using (
  auth.uid() = owner_user_id
  or exists (
    select 1 from public.presentation_collaborators c
    where c.presentation_id = presentation_live_documents.presentation_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "editors_update_live_documents" on public.presentation_live_documents;
create policy "editors_update_live_documents" on public.presentation_live_documents
for update using (
  auth.uid() = owner_user_id
  or exists (
    select 1 from public.presentation_collaborators c
    where c.presentation_id = presentation_live_documents.presentation_id
      and c.user_id = auth.uid()
      and c.role = 'editor'
  )
) with check (
  auth.uid() = owner_user_id
  or exists (
    select 1 from public.presentation_collaborators c
    where c.presentation_id = presentation_live_documents.presentation_id
      and c.user_id = auth.uid()
      and c.role = 'editor'
  )
);

create or replace function public.enable_live_collaboration(p_presentation_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_payload jsonb;
  v_doc public.presentation_live_documents%rowtype;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select payload into v_payload
  from public.presentation_snapshots
  where id = p_presentation_id and user_id = v_user;

  if v_payload is null then
    raise exception 'Sync the presentation to cloud before enabling collaboration';
  end if;

  insert into public.presentation_live_documents(presentation_id, owner_user_id, payload, revision, updated_by)
  values (p_presentation_id, v_user, v_payload, 1, v_user)
  on conflict (presentation_id) do nothing;

  select * into v_doc from public.presentation_live_documents where presentation_id = p_presentation_id;

  if v_doc.owner_user_id <> v_user then
    raise exception 'Only the presentation owner can enable collaboration';
  end if;

  return jsonb_build_object(
    'presentation', v_doc.payload,
    'revision', v_doc.revision,
    'role', 'owner',
    'ownerUserId', v_doc.owner_user_id,
    'updatedAt', v_doc.updated_at
  );
end;
$$;

create or replace function public.create_collaboration_invite(
  p_presentation_id text,
  p_invited_email text,
  p_role text,
  p_invite_token text,
  p_expires_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id text := encode(gen_random_bytes(12), 'hex');
  v_email text := lower(trim(p_invited_email));
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_role not in ('editor','reviewer','viewer') then raise exception 'Invalid collaboration role'; end if;
  if length(v_email) < 3 or position('@' in v_email) < 2 then raise exception 'Valid email required'; end if;
  if length(p_invite_token) < 32 then raise exception 'Invalid invite token'; end if;
  if p_expires_at <= now() then raise exception 'Invite expiry must be in the future'; end if;

  if not exists (
    select 1 from public.presentation_live_documents
    where presentation_id = p_presentation_id and owner_user_id = v_user
  ) then
    raise exception 'Enable collaboration before inviting members';
  end if;

  insert into public.collaboration_invites(id, presentation_id, owner_user_id, invited_email, role, token_hash, expires_at)
  values (v_id, p_presentation_id, v_user, v_email, p_role, encode(digest(p_invite_token, 'sha256'), 'hex'), p_expires_at);

  return jsonb_build_object('id', v_id, 'expiresAt', p_expires_at);
end;
$$;

create or replace function public.accept_collaboration_invite(p_invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_invite public.collaboration_invites%rowtype;
  v_doc public.presentation_live_documents%rowtype;
begin
  if v_user is null then raise exception 'Sign in before accepting an invite'; end if;

  select * into v_invite
  from public.collaboration_invites
  where token_hash = encode(digest(p_invite_token, 'sha256'), 'hex')
    and revoked_at is null
    and accepted_at is null
    and expires_at > now()
  limit 1;

  if v_invite.id is null then raise exception 'Invite is invalid or expired'; end if;
  if v_email = '' or v_email <> lower(v_invite.invited_email) then
    raise exception 'Sign in with the invited email address';
  end if;

  insert into public.presentation_collaborators(presentation_id, owner_user_id, user_id, email, role)
  values (v_invite.presentation_id, v_invite.owner_user_id, v_user, v_email, v_invite.role)
  on conflict (presentation_id, user_id)
  do update set email = excluded.email, role = excluded.role, updated_at = now();

  update public.collaboration_invites set accepted_at = now() where id = v_invite.id;
  select * into v_doc from public.presentation_live_documents where presentation_id = v_invite.presentation_id;

  return jsonb_build_object(
    'presentation', v_doc.payload,
    'revision', v_doc.revision,
    'role', v_invite.role,
    'ownerUserId', v_invite.owner_user_id,
    'updatedAt', v_doc.updated_at
  );
end;
$$;

create or replace function public.get_live_presentation(p_presentation_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_doc public.presentation_live_documents%rowtype;
  v_role text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_doc from public.presentation_live_documents where presentation_id = p_presentation_id;
  if v_doc.presentation_id is null then return null; end if;

  if v_doc.owner_user_id = v_user then
    v_role := 'owner';
  else
    select role into v_role from public.presentation_collaborators
    where presentation_id = p_presentation_id and user_id = v_user;
  end if;

  if v_role is null then raise exception 'You do not have access to this presentation'; end if;

  return jsonb_build_object(
    'presentation', v_doc.payload,
    'revision', v_doc.revision,
    'role', v_role,
    'ownerUserId', v_doc.owner_user_id,
    'updatedAt', v_doc.updated_at
  );
end;
$$;

create or replace function public.save_live_presentation(
  p_presentation_id text,
  p_expected_revision bigint,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_doc public.presentation_live_documents%rowtype;
  v_role text;
  v_new_revision bigint;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_doc from public.presentation_live_documents where presentation_id = p_presentation_id for update;
  if v_doc.presentation_id is null then raise exception 'Live document not found'; end if;

  if v_doc.owner_user_id = v_user then
    v_role := 'owner';
  else
    select role into v_role from public.presentation_collaborators
    where presentation_id = p_presentation_id and user_id = v_user;
  end if;

  if v_role not in ('owner','editor') then
    raise exception 'Your collaboration role is read-only';
  end if;
  if v_doc.payload->>'status' = 'Approved' and v_role <> 'owner' then
    raise exception 'Approved presentations can only be reopened by the owner';
  end if;

  if v_doc.revision <> p_expected_revision then
    return jsonb_build_object(
      'ok', false,
      'conflict', true,
      'revision', v_doc.revision,
      'presentation', v_doc.payload,
      'updatedAt', v_doc.updated_at
    );
  end if;

  v_new_revision := v_doc.revision + 1;
  update public.presentation_live_documents
  set payload = p_payload, revision = v_new_revision, updated_by = v_user, updated_at = now()
  where presentation_id = p_presentation_id;

  return jsonb_build_object(
    'ok', true,
    'conflict', false,
    'revision', v_new_revision,
    'updatedAt', now()
  );
end;
$$;

create or replace function public.list_presentation_team(p_presentation_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_members jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select owner_user_id into v_owner from public.presentation_live_documents where presentation_id = p_presentation_id;
  if v_owner is null then return '[]'::jsonb; end if;
  if v_owner <> v_user and not exists (
    select 1 from public.presentation_collaborators where presentation_id = p_presentation_id and user_id = v_user
  ) then
    raise exception 'You do not have access to this team';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', c.user_id,
    'email', c.email,
    'role', c.role,
    'createdAt', c.created_at
  ) order by c.created_at), '[]'::jsonb)
  into v_members
  from public.presentation_collaborators c
  where c.presentation_id = p_presentation_id;

  return v_members;
end;
$$;

create or replace function public.remove_presentation_collaborator(p_presentation_id text, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if not exists (
    select 1 from public.presentation_live_documents
    where presentation_id = p_presentation_id and owner_user_id = v_user
  ) then
    raise exception 'Only the owner can remove collaborators';
  end if;
  delete from public.presentation_collaborators where presentation_id = p_presentation_id and user_id = p_user_id;
end;
$$;

grant execute on function public.enable_live_collaboration(text) to authenticated;
grant execute on function public.create_collaboration_invite(text,text,text,text,timestamptz) to authenticated;
grant execute on function public.accept_collaboration_invite(text) to authenticated;
grant execute on function public.get_live_presentation(text) to authenticated;
grant execute on function public.save_live_presentation(text,bigint,jsonb) to authenticated;
grant execute on function public.list_presentation_team(text) to authenticated;
create or replace function public.update_presentation_collaborator_role(
  p_presentation_id text,
  p_user_id uuid,
  p_role text
) returns void
language plpgsql
security definer
set search_path = public
as $
declare
  v_user uuid := auth.uid();
begin
  if p_role not in ('editor','reviewer','viewer') then raise exception 'Invalid collaboration role'; end if;
  if not exists (
    select 1 from public.presentation_live_documents
    where presentation_id = p_presentation_id and owner_user_id = v_user
  ) then
    raise exception 'Only the owner can change collaborator roles';
  end if;
  update public.presentation_collaborators
  set role = p_role, updated_at = now()
  where presentation_id = p_presentation_id and user_id = p_user_id;
end;
$;

grant execute on function public.remove_presentation_collaborator(text,uuid) to authenticated;
grant execute on function public.update_presentation_collaborator_role(text,uuid,text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'presentation_live_documents'
  ) then
    alter publication supabase_realtime add table public.presentation_live_documents;
  end if;
end $$;
