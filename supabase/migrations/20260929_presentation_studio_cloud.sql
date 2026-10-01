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

alter table public.presentation_collaborators add column if not exists email text;

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

  update public.presentation_snapshots
  set payload = p_payload, updated_at = now()
  where id = p_presentation_id and user_id = v_doc.owner_user_id;

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
as $$
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
$$;

grant execute on function public.remove_presentation_collaborator(text,uuid) to authenticated;
grant execute on function public.update_presentation_collaborator_role(text,uuid,text) to authenticated;

create or replace function public.add_team_review_comment(
  p_presentation_id text,
  p_comment_body text,
  p_slide_id text default null,
  p_element_id text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_email text := coalesce(auth.jwt()->>'email','Team reviewer');
  v_owner uuid;
  v_role text;
  v_id text := encode(gen_random_bytes(12), 'hex');
  v_stamp timestamptz := now();
  v_payload jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select owner_user_id into v_owner from public.presentation_live_documents where presentation_id = p_presentation_id;
  if v_owner is null then raise exception 'Live presentation not found'; end if;

  if v_owner = v_user then
    v_role := 'owner';
  else
    select role into v_role from public.presentation_collaborators
    where presentation_id = p_presentation_id and user_id = v_user;
  end if;

  if v_role not in ('owner','editor','reviewer') then
    raise exception 'Your role cannot add review comments';
  end if;
  if length(trim(coalesce(p_comment_body,''))) < 1 or length(p_comment_body) > 4000 then
    raise exception 'Comment must be between 1 and 4000 characters';
  end if;

  v_payload := jsonb_build_object(
    'id', v_id,
    'presentationId', p_presentation_id,
    'slideId', p_slide_id,
    'elementId', p_element_id,
    'authorName', left(v_email, 120),
    'authorUserId', v_user,
    'body', trim(p_comment_body),
    'resolved', false,
    'team', true,
    'createdAt', to_char(v_stamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updatedAt', to_char(v_stamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  insert into public.review_comments(id, user_id, payload, updated_at)
  values (v_id, v_owner, v_payload, v_stamp);

  return v_payload;
end;
$$;

create or replace function public.list_team_review_comments(p_presentation_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_role text;
  v_comments jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select owner_user_id into v_owner from public.presentation_live_documents where presentation_id = p_presentation_id;
  if v_owner is null then return '[]'::jsonb; end if;

  if v_owner = v_user then
    v_role := 'owner';
  else
    select role into v_role from public.presentation_collaborators
    where presentation_id = p_presentation_id and user_id = v_user;
  end if;

  if v_role not in ('owner','editor','reviewer') then
    raise exception 'Your role cannot access team review comments';
  end if;

  select coalesce(jsonb_agg(payload order by updated_at asc), '[]'::jsonb)
  into v_comments
  from public.review_comments
  where payload->>'presentationId' = p_presentation_id
    and coalesce((payload->>'team')::boolean, false) = true;

  return v_comments;
end;
$$;

grant execute on function public.add_team_review_comment(text,text,text,text) to authenticated;
grant execute on function public.list_team_review_comments(text) to authenticated;

create or replace function public.apply_live_element_changes(
  p_presentation_id text,
  p_base_revision bigint,
  p_slide_id text,
  p_changes jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_doc public.presentation_live_documents%rowtype;
  v_role text;
  v_slide jsonb;
  v_slides jsonb;
  v_elements jsonb;
  v_change jsonb;
  v_id text;
  v_before jsonb;
  v_after jsonb;
  v_current jsonb;
  v_new_revision bigint;
  v_payload jsonb;
  v_merged boolean;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) < 1 then
    raise exception 'Element changes must be a non-empty array';
  end if;

  select * into v_doc
  from public.presentation_live_documents
  where presentation_id = p_presentation_id
  for update;

  if v_doc.presentation_id is null then raise exception 'Live document not found'; end if;

  if v_doc.owner_user_id = v_user then
    v_role := 'owner';
  else
    select role into v_role
    from public.presentation_collaborators
    where presentation_id = p_presentation_id and user_id = v_user;
  end if;

  if v_role not in ('owner','editor') then raise exception 'Your collaboration role is read-only'; end if;
  if v_doc.payload->>'status' = 'Approved' and v_role <> 'owner' then
    raise exception 'Approved presentations can only be reopened by the owner';
  end if;

  select value into v_slide
  from jsonb_array_elements(coalesce(v_doc.payload->'slides','[]'::jsonb)) value
  where value->>'id' = p_slide_id
  limit 1;

  if v_slide is null then
    return jsonb_build_object(
      'ok', false, 'conflict', true, 'reason', 'slide_changed',
      'revision', v_doc.revision, 'presentation', v_doc.payload, 'updatedAt', v_doc.updated_at
    );
  end if;

  v_elements := coalesce(v_slide->'elements','[]'::jsonb);

  for v_change in select value from jsonb_array_elements(p_changes) value
  loop
    v_id := v_change->>'id';
    v_before := v_change->'before';
    v_after := v_change->'after';
    v_current := null;

    select value into v_current
    from jsonb_array_elements(v_elements) value
    where value->>'id' = v_id
    limit 1;

    if v_before is null or v_before = 'null'::jsonb then
      if v_current is not null then
        return jsonb_build_object(
          'ok', false, 'conflict', true, 'reason', 'same_element_changed',
          'elementId', v_id, 'revision', v_doc.revision,
          'presentation', v_doc.payload, 'updatedAt', v_doc.updated_at
        );
      end if;
    elsif v_current is null or v_current <> v_before then
      return jsonb_build_object(
        'ok', false, 'conflict', true, 'reason', 'same_element_changed',
        'elementId', v_id, 'revision', v_doc.revision,
        'presentation', v_doc.payload, 'updatedAt', v_doc.updated_at
      );
    end if;

    if v_after is null or v_after = 'null'::jsonb then
      select coalesce(jsonb_agg(value order by ord), '[]'::jsonb)
      into v_elements
      from jsonb_array_elements(v_elements) with ordinality as e(value, ord)
      where value->>'id' <> v_id;
    elsif v_before is null or v_before = 'null'::jsonb then
      v_elements := v_elements || jsonb_build_array(v_after);
    else
      select coalesce(jsonb_agg(
        case when value->>'id' = v_id then v_after else value end
        order by ord
      ), '[]'::jsonb)
      into v_elements
      from jsonb_array_elements(v_elements) with ordinality as e(value, ord);
    end if;
  end loop;

  v_slide := jsonb_set(v_slide, '{elements}', v_elements, true);
  v_slide := jsonb_set(
    v_slide,
    '{updatedAt}',
    to_jsonb(to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
    true
  );

  select coalesce(jsonb_agg(
    case when value->>'id' = p_slide_id then v_slide else value end
    order by ord
  ), '[]'::jsonb)
  into v_slides
  from jsonb_array_elements(coalesce(v_doc.payload->'slides','[]'::jsonb)) with ordinality as s(value, ord);

  v_payload := jsonb_set(v_doc.payload, '{slides}', v_slides, true);
  v_payload := jsonb_set(
    v_payload,
    '{updatedAt}',
    to_jsonb(to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
    true
  );
  v_new_revision := v_doc.revision + 1;
  v_merged := v_doc.revision <> p_base_revision;

  update public.presentation_live_documents
  set payload = v_payload, revision = v_new_revision, updated_by = v_user, updated_at = now()
  where presentation_id = p_presentation_id;

  update public.presentation_snapshots
  set payload = v_payload, updated_at = now()
  where id = p_presentation_id and user_id = v_doc.owner_user_id;

  return jsonb_build_object(
    'ok', true,
    'conflict', false,
    'revision', v_new_revision,
    'presentation', v_payload,
    'merged', v_merged,
    'updatedAt', now()
  );
end;
$$;

grant execute on function public.apply_live_element_changes(text,bigint,text,jsonb) to authenticated;

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


-- Collaboration activity -----------------------------------------------------

create table if not exists public.collaboration_activity (
  id text primary key,
  presentation_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  actor_email text,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists collaboration_activity_presentation_idx
on public.collaboration_activity(presentation_id, created_at desc);

alter table public.collaboration_activity enable row level security;

drop policy if exists "team_read_collaboration_activity" on public.collaboration_activity;
create policy "team_read_collaboration_activity" on public.collaboration_activity
for select using (
  auth.uid() = owner_user_id
  or exists (
    select 1 from public.presentation_collaborators c
    where c.presentation_id = collaboration_activity.presentation_id
      and c.user_id = auth.uid()
  )
);

create or replace function public.record_collaboration_activity(
  p_presentation_id text,
  p_event_type text,
  p_details jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_role text;
  v_email text := coalesce(auth.jwt()->>'email','Team member');
  v_id text := encode(gen_random_bytes(12), 'hex');
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select owner_user_id into v_owner from public.presentation_live_documents where presentation_id = p_presentation_id;
  if v_owner is null then raise exception 'Live presentation not found'; end if;

  if v_owner = v_user then
    v_role := 'owner';
  else
    select role into v_role from public.presentation_collaborators
    where presentation_id = p_presentation_id and user_id = v_user;
  end if;

  if v_role is null then raise exception 'You do not have access to this presentation'; end if;
  if p_event_type not in (
    'conflict_detected','conflict_resolved','manual_snapshot','comment_added',
    'opened_editor','opened_presenter','invite_created','member_joined',
    'member_removed','role_changed'
  ) then
    raise exception 'Unsupported client activity event';
  end if;

  insert into public.collaboration_activity(
    id, presentation_id, owner_user_id, actor_user_id, actor_email, event_type, details
  ) values (
    v_id, p_presentation_id, v_owner, v_user, left(v_email,120), p_event_type, coalesce(p_details,'{}'::jsonb)
  );
end;
$$;

create or replace function public.list_collaboration_activity(
  p_presentation_id text,
  p_limit integer default 30
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_role text;
  v_rows jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select owner_user_id into v_owner from public.presentation_live_documents where presentation_id = p_presentation_id;
  if v_owner is null then return '[]'::jsonb; end if;

  if v_owner = v_user then
    v_role := 'owner';
  else
    select role into v_role from public.presentation_collaborators
    where presentation_id = p_presentation_id and user_id = v_user;
  end if;
  if v_role is null then raise exception 'You do not have access to this team'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'presentationId', a.presentation_id,
    'actorUserId', a.actor_user_id,
    'actorEmail', a.actor_email,
    'eventType', a.event_type,
    'details', a.details,
    'createdAt', a.created_at
  ) order by a.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select *
    from public.collaboration_activity
    where presentation_id = p_presentation_id
    order by created_at desc
    limit greatest(1, least(coalesce(p_limit,30),100))
  ) a;

  return v_rows;
end;
$$;

create or replace function public.revoke_collaboration_invite(p_invite_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.collaboration_invites%rowtype;
begin
  select * into v_invite from public.collaboration_invites where id = p_invite_id;
  if v_invite.id is null then return; end if;
  if v_invite.owner_user_id <> v_user then raise exception 'Only the owner can revoke invitations'; end if;

  update public.collaboration_invites set revoked_at = now() where id = p_invite_id;
  insert into public.collaboration_activity(
    id, presentation_id, owner_user_id, actor_user_id, actor_email, event_type, details
  ) values (
    encode(gen_random_bytes(12), 'hex'), v_invite.presentation_id, v_invite.owner_user_id,
    v_user, coalesce(auth.jwt()->>'email','Owner'), 'invite_revoked',
    jsonb_build_object('email',v_invite.invited_email,'role',v_invite.role)
  );
end;
$$;

grant execute on function public.record_collaboration_activity(text,text,jsonb) to authenticated;
grant execute on function public.list_collaboration_activity(text,integer) to authenticated;
grant execute on function public.revoke_collaboration_invite(text) to authenticated;


-- Live presentation sessions -------------------------------------------------

create table if not exists public.presentation_sessions (
  id text primary key,
  presentation_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'live' check (status in ('live','ended')),
  current_slide_id text,
  current_slide_index integer not null default 0,
  started_by uuid not null references auth.users(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.presentation_session_items (
  id text primary key,
  session_id text not null references public.presentation_sessions(id) on delete cascade,
  presentation_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  actor_email text,
  kind text not null check (kind in ('question','decision','action')),
  slide_id text,
  body text not null,
  status text not null default 'open' check (status in ('open','answered','completed')),
  resolution text,
  assignee text,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists presentation_sessions_presentation_idx
on public.presentation_sessions(presentation_id, started_at desc);

create index if not exists presentation_session_items_session_idx
on public.presentation_session_items(session_id, created_at asc);

alter table public.presentation_sessions enable row level security;
alter table public.presentation_session_items enable row level security;

drop policy if exists "team_read_presentation_sessions" on public.presentation_sessions;
create policy "team_read_presentation_sessions" on public.presentation_sessions
for select using (
  auth.uid() = owner_user_id
  or exists (
    select 1 from public.presentation_collaborators c
    where c.presentation_id = presentation_sessions.presentation_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "team_read_presentation_session_items" on public.presentation_session_items;
create policy "team_read_presentation_session_items" on public.presentation_session_items
for select using (
  auth.uid() = owner_user_id
  or exists (
    select 1 from public.presentation_collaborators c
    where c.presentation_id = presentation_session_items.presentation_id
      and c.user_id = auth.uid()
  )
);

create or replace function public.start_presentation_session(
  p_presentation_id text,
  p_title text default null,
  p_current_slide_id text default null,
  p_current_slide_index integer default 0
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id text := encode(gen_random_bytes(12), 'hex');
  v_title text;
  v_existing public.presentation_sessions%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.presentation_live_documents
    where presentation_id = p_presentation_id and owner_user_id = v_user
  ) then
    raise exception 'Only the presentation owner can start a live session';
  end if;

  select * into v_existing
  from public.presentation_sessions
  where presentation_id = p_presentation_id
    and owner_user_id = v_user
    and status = 'live'
  order by started_at desc
  limit 1;

  if v_existing.id is not null then
    return jsonb_build_object(
      'id', v_existing.id,
      'presentationId', v_existing.presentation_id,
      'title', v_existing.title,
      'status', v_existing.status,
      'currentSlideId', v_existing.current_slide_id,
      'currentSlideIndex', v_existing.current_slide_index,
      'startedAt', v_existing.started_at,
      'endedAt', v_existing.ended_at,
      'updatedAt', v_existing.updated_at
    );
  end if;

  v_title := left(coalesce(nullif(trim(p_title),''), 'Live presentation session'), 240);

  insert into public.presentation_sessions(
    id, presentation_id, owner_user_id, title, current_slide_id, current_slide_index, started_by
  ) values (
    v_id, p_presentation_id, v_user, v_title, p_current_slide_id, greatest(0, p_current_slide_index), v_user
  );

  insert into public.collaboration_activity(
    id, presentation_id, owner_user_id, actor_user_id, actor_email, event_type, details
  ) values (
    encode(gen_random_bytes(12), 'hex'),
    p_presentation_id,
    v_user,
    v_user,
    coalesce(auth.jwt()->>'email','Owner'),
    'live_session_started',
    jsonb_build_object('sessionId', v_id, 'title', v_title)
  );

  return jsonb_build_object(
    'id', v_id,
    'presentationId', p_presentation_id,
    'title', v_title,
    'status', 'live',
    'currentSlideId', p_current_slide_id,
    'currentSlideIndex', greatest(0, p_current_slide_index),
    'startedAt', now(),
    'endedAt', null,
    'updatedAt', now()
  );
end;
$$;

create or replace function public.get_active_presentation_session(p_presentation_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_role text;
  v_session public.presentation_sessions%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select owner_user_id into v_owner
  from public.presentation_live_documents
  where presentation_id = p_presentation_id;

  if v_owner is null then return null; end if;

  if v_owner = v_user then
    v_role := 'owner';
  else
    select role into v_role
    from public.presentation_collaborators
    where presentation_id = p_presentation_id and user_id = v_user;
  end if;

  if v_role is null then raise exception 'You do not have access to this presentation'; end if;

  select * into v_session
  from public.presentation_sessions
  where presentation_id = p_presentation_id and status = 'live'
  order by started_at desc
  limit 1;

  if v_session.id is null then return null; end if;

  return jsonb_build_object(
    'id', v_session.id,
    'presentationId', v_session.presentation_id,
    'title', v_session.title,
    'status', v_session.status,
    'currentSlideId', v_session.current_slide_id,
    'currentSlideIndex', v_session.current_slide_index,
    'startedAt', v_session.started_at,
    'endedAt', v_session.ended_at,
    'updatedAt', v_session.updated_at,
    'role', v_role
  );
end;
$$;

create or replace function public.list_presentation_sessions(
  p_presentation_id text,
  p_limit integer default 20
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_role text;
  v_rows jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select owner_user_id into v_owner
  from public.presentation_live_documents
  where presentation_id = p_presentation_id;
  if v_owner is null then return '[]'::jsonb; end if;

  if v_owner = v_user then
    v_role := 'owner';
  else
    select role into v_role
    from public.presentation_collaborators
    where presentation_id = p_presentation_id and user_id = v_user;
  end if;
  if v_role is null then raise exception 'You do not have access to this presentation'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'presentationId', s.presentation_id,
    'title', s.title,
    'status', s.status,
    'currentSlideId', s.current_slide_id,
    'currentSlideIndex', s.current_slide_index,
    'startedAt', s.started_at,
    'endedAt', s.ended_at,
    'updatedAt', s.updated_at
  ) order by s.started_at desc), '[]'::jsonb)
  into v_rows
  from (
    select *
    from public.presentation_sessions
    where presentation_id = p_presentation_id
    order by started_at desc
    limit greatest(1, least(coalesce(p_limit,20),100))
  ) s;

  return v_rows;
end;
$$;

create or replace function public.update_presentation_session_slide(
  p_session_id text,
  p_slide_id text,
  p_slide_index integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_session public.presentation_sessions%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_session from public.presentation_sessions where id = p_session_id for update;
  if v_session.id is null then raise exception 'Session not found'; end if;
  if v_session.owner_user_id <> v_user then raise exception 'Only the owner can control the live session'; end if;
  if v_session.status <> 'live' then raise exception 'Session has ended'; end if;

  update public.presentation_sessions
  set current_slide_id = p_slide_id,
      current_slide_index = greatest(0, p_slide_index),
      updated_at = now()
  where id = p_session_id;

  return jsonb_build_object(
    'id', p_session_id,
    'presentationId', v_session.presentation_id,
    'title', v_session.title,
    'status', 'live',
    'currentSlideId', p_slide_id,
    'currentSlideIndex', greatest(0, p_slide_index),
    'startedAt', v_session.started_at,
    'endedAt', null,
    'updatedAt', now()
  );
end;
$$;

create or replace function public.end_presentation_session(p_session_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_session public.presentation_sessions%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_session from public.presentation_sessions where id = p_session_id for update;
  if v_session.id is null then raise exception 'Session not found'; end if;
  if v_session.owner_user_id <> v_user then raise exception 'Only the owner can end the session'; end if;

  update public.presentation_sessions
  set status = 'ended', ended_at = coalesce(ended_at, now()), updated_at = now()
  where id = p_session_id;

  insert into public.collaboration_activity(
    id, presentation_id, owner_user_id, actor_user_id, actor_email, event_type, details
  ) values (
    encode(gen_random_bytes(12), 'hex'),
    v_session.presentation_id,
    v_session.owner_user_id,
    v_user,
    coalesce(auth.jwt()->>'email','Owner'),
    'live_session_ended',
    jsonb_build_object('sessionId', p_session_id, 'title', v_session.title)
  );

  return jsonb_build_object(
    'id', p_session_id,
    'presentationId', v_session.presentation_id,
    'title', v_session.title,
    'status', 'ended',
    'currentSlideId', v_session.current_slide_id,
    'currentSlideIndex', v_session.current_slide_index,
    'startedAt', v_session.started_at,
    'endedAt', coalesce(v_session.ended_at, now()),
    'updatedAt', now()
  );
end;
$$;

create or replace function public.add_presentation_session_item(
  p_session_id text,
  p_kind text,
  p_body text,
  p_slide_id text default null,
  p_assignee text default null,
  p_due_date date default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_email text := coalesce(auth.jwt()->>'email','Team member');
  v_session public.presentation_sessions%rowtype;
  v_role text;
  v_id text := encode(gen_random_bytes(12), 'hex');
  v_status text := 'open';
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_kind not in ('question','decision','action') then raise exception 'Invalid session item type'; end if;
  if length(trim(coalesce(p_body,''))) < 1 or length(p_body) > 5000 then
    raise exception 'Item must be between 1 and 5000 characters';
  end if;

  select * into v_session from public.presentation_sessions where id = p_session_id;
  if v_session.id is null then raise exception 'Session not found'; end if;
  if v_session.status <> 'live' then raise exception 'Session has ended'; end if;

  if v_session.owner_user_id = v_user then
    v_role := 'owner';
  else
    select role into v_role
    from public.presentation_collaborators
    where presentation_id = v_session.presentation_id and user_id = v_user;
  end if;
  if v_role is null then raise exception 'You do not have access to this session'; end if;
  if p_kind in ('decision','action') and v_role not in ('owner','editor','reviewer') then
    raise exception 'Your role can only ask questions';
  end if;

  if p_kind = 'decision' then v_status := 'completed'; end if;

  insert into public.presentation_session_items(
    id, session_id, presentation_id, owner_user_id, actor_user_id, actor_email,
    kind, slide_id, body, status, assignee, due_date
  ) values (
    v_id, v_session.id, v_session.presentation_id, v_session.owner_user_id, v_user,
    left(v_email,120), p_kind, p_slide_id, trim(p_body), v_status,
    nullif(left(trim(coalesce(p_assignee,'')),240),''), p_due_date
  );

  return jsonb_build_object(
    'id', v_id,
    'sessionId', v_session.id,
    'presentationId', v_session.presentation_id,
    'actorUserId', v_user,
    'actorEmail', left(v_email,120),
    'kind', p_kind,
    'slideId', p_slide_id,
    'body', trim(p_body),
    'status', v_status,
    'resolution', null,
    'assignee', nullif(left(trim(coalesce(p_assignee,'')),240),''),
    'dueDate', p_due_date,
    'createdAt', now(),
    'updatedAt', now()
  );
end;
$$;

create or replace function public.update_presentation_session_item(
  p_item_id text,
  p_status text default null,
  p_resolution text default null,
  p_assignee text default null,
  p_due_date date default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_item public.presentation_session_items%rowtype;
  v_role text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_item from public.presentation_session_items where id = p_item_id for update;
  if v_item.id is null then raise exception 'Session item not found'; end if;

  if v_item.owner_user_id = v_user then
    v_role := 'owner';
  else
    select role into v_role
    from public.presentation_collaborators
    where presentation_id = v_item.presentation_id and user_id = v_user;
  end if;

  if v_role not in ('owner','editor') then
    raise exception 'Only owner or editor can resolve session items';
  end if;
  if p_status is not null and p_status not in ('open','answered','completed') then
    raise exception 'Invalid session item status';
  end if;

  update public.presentation_session_items
  set status = coalesce(p_status, status),
      resolution = case when p_resolution is null then resolution else nullif(left(trim(p_resolution),5000),'') end,
      assignee = case when p_assignee is null then assignee else nullif(left(trim(p_assignee),240),'') end,
      due_date = coalesce(p_due_date, due_date),
      updated_at = now()
  where id = p_item_id;

  select * into v_item from public.presentation_session_items where id = p_item_id;

  return jsonb_build_object(
    'id', v_item.id,
    'sessionId', v_item.session_id,
    'presentationId', v_item.presentation_id,
    'actorUserId', v_item.actor_user_id,
    'actorEmail', v_item.actor_email,
    'kind', v_item.kind,
    'slideId', v_item.slide_id,
    'body', v_item.body,
    'status', v_item.status,
    'resolution', v_item.resolution,
    'assignee', v_item.assignee,
    'dueDate', v_item.due_date,
    'createdAt', v_item.created_at,
    'updatedAt', v_item.updated_at
  );
end;
$$;

create or replace function public.list_presentation_session_items(p_session_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_session public.presentation_sessions%rowtype;
  v_role text;
  v_rows jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_session from public.presentation_sessions where id = p_session_id;
  if v_session.id is null then return '[]'::jsonb; end if;

  if v_session.owner_user_id = v_user then
    v_role := 'owner';
  else
    select role into v_role
    from public.presentation_collaborators
    where presentation_id = v_session.presentation_id and user_id = v_user;
  end if;
  if v_role is null then raise exception 'You do not have access to this session'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'sessionId', i.session_id,
    'presentationId', i.presentation_id,
    'actorUserId', i.actor_user_id,
    'actorEmail', i.actor_email,
    'kind', i.kind,
    'slideId', i.slide_id,
    'body', i.body,
    'status', i.status,
    'resolution', i.resolution,
    'assignee', i.assignee,
    'dueDate', i.due_date,
    'createdAt', i.created_at,
    'updatedAt', i.updated_at
  ) order by i.created_at asc), '[]'::jsonb)
  into v_rows
  from public.presentation_session_items i
  where i.session_id = p_session_id;

  return v_rows;
end;
$$;

grant execute on function public.start_presentation_session(text,text,text,integer) to authenticated;
grant execute on function public.get_active_presentation_session(text) to authenticated;
grant execute on function public.list_presentation_sessions(text,integer) to authenticated;
grant execute on function public.update_presentation_session_slide(text,text,integer) to authenticated;
grant execute on function public.end_presentation_session(text) to authenticated;
grant execute on function public.add_presentation_session_item(text,text,text,text,text,date) to authenticated;
grant execute on function public.update_presentation_session_item(text,text,text,text,date) to authenticated;
grant execute on function public.list_presentation_session_items(text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'presentation_sessions'
  ) then
    alter publication supabase_realtime add table public.presentation_sessions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'presentation_session_items'
  ) then
    alter publication supabase_realtime add table public.presentation_session_items;
  end if;
end $$;
