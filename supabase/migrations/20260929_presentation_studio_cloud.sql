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
