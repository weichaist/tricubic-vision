-- Tricubic Vision: core schema
--
-- companies -> locations (sites) -> users
-- rules: plain-language safety rules per company / site, sent to Gemini
-- clips: one row per uploaded video segment (written by analyzeClipWithAI)
-- alerts / applause: rule violations and good behavior found by Gemini,
--   plus sensor alerts from the camera app (writeAlertToSupabase)
-- logs: one row per clip analysis run (success or error)
-- reports: reserved for per-site reports (not used by the apps yet)

create type public.role as enum ('admin', 'manager', 'appUser');

-- Companies ------------------------------------------------------------------
create table public.companies (
  uid uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  abbreviation text,
  address text
);

-- Locations (sites) ------------------------------------------------------------
create table public.locations (
  uid uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  company_uid uuid not null,
  name text not null,
  address text,
  constraint fk_locations_company
    foreign key (company_uid) references public.companies (uid) on delete cascade
);

-- Users ----------------------------------------------------------------------
-- Portal users sign in with Supabase Auth; uid is their auth.users id.
-- Camera app users sign in with Firebase Auth and are matched by email.
create table public.users (
  uid uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  company_uid uuid not null,
  location_uid uuid not null,
  email text unique,
  first_name text,
  last_name text,
  role public.role not null default 'appUser',
  constraint fk_users_company
    foreign key (company_uid) references public.companies (uid) on delete cascade,
  constraint fk_users_location
    foreign key (location_uid) references public.locations (uid) on delete cascade
);

-- Rules ----------------------------------------------------------------------
-- A rule with no location applies to every location of its company.
create table public.rules (
  uid uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  company_uid uuid,
  location_uid uuid,
  name text not null,
  details text,
  status text not null, -- 'active' rules are sent to Gemini; 'inactive' are kept but skipped
  constraint rules_company_uid_fkey
    foreign key (company_uid) references public.companies (uid) on delete cascade,
  constraint fk_rules_location
    foreign key (location_uid) references public.locations (uid) on delete cascade
);

create index rules_company_location_idx on public.rules (company_uid, location_uid);

-- Alerts (violations) ----------------------------------------------------------
create table public.alerts (
  uid uuid primary key default gen_random_uuid(),
  timestamp timestamptz default now(),
  name text not null,
  details jsonb,
  user_uid uuid not null,
  location_uid uuid not null,
  company_uid uuid,
  rule_uid uuid,
  constraint fk_alerts_user
    foreign key (user_uid) references public.users (uid) on delete cascade,
  constraint alerts_location_uid_fkey
    foreign key (location_uid) references public.locations (uid) on delete cascade,
  constraint alerts_company_uid_fkey
    foreign key (company_uid) references public.companies (uid) on delete cascade,
  constraint alerts_rule_uid_fkey
    foreign key (rule_uid) references public.rules (uid) on delete set null
);

create index alerts_location_timestamp_idx on public.alerts (location_uid, timestamp desc);
create index alerts_rule_idx on public.alerts (rule_uid);

-- Applause (good behavior, shown as "ブラボー" in the portal) ------------------------
create table public.applause (
  uid uuid primary key default gen_random_uuid(),
  timestamp timestamptz default now(),
  name text not null,
  details jsonb,
  user_uid uuid not null,
  location_uid uuid,
  company_uid uuid,
  rule_uid uuid,
  constraint fk_applause_user
    foreign key (user_uid) references public.users (uid) on delete cascade,
  constraint applause_location_uid_fkey
    foreign key (location_uid) references public.locations (uid) on delete cascade,
  constraint applause_company_uid_fkey
    foreign key (company_uid) references public.companies (uid) on delete cascade,
  constraint applause_rule_uid_fkey
    foreign key (rule_uid) references public.rules (uid) on delete set null
);

create index applause_location_timestamp_idx on public.applause (location_uid, timestamp desc);
create index applause_rule_idx on public.applause (rule_uid);

-- Clips ----------------------------------------------------------------------
create table public.clips (
  uid uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_uid uuid not null,
  location_uid uuid not null,
  company_uid uuid,
  title text,
  length bigint, -- file size in bytes (the app does not measure duration)
  video_url text not null,
  thumbnail_url text,
  recording_stop_timestamp timestamptz,
  constraint clips_user_uid_fkey
    foreign key (user_uid) references public.users (uid) on delete cascade,
  constraint clips_location_uid_fkey
    foreign key (location_uid) references public.locations (uid) on delete cascade,
  constraint clips_company_uid_fkey
    foreign key (company_uid) references public.companies (uid) on delete cascade
);

create index clips_location_stop_idx on public.clips (location_uid, recording_stop_timestamp);

-- Logs -----------------------------------------------------------------------
create table public.logs (
  uid uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  function_name text not null,
  status text not null check (status in ('success', 'error')),
  message text,
  details jsonb,
  user_uid uuid,
  location_uid uuid,
  clip_id text, -- Firestore document id of the clip
  duration_ms integer,
  constraint logs_user_uid_fkey
    foreign key (user_uid) references public.users (uid) on delete set null,
  constraint logs_location_uid_fkey
    foreign key (location_uid) references public.locations (uid) on delete set null
);

create index logs_location_created_idx on public.logs (location_uid, created_at desc);

-- Reports --------------------------------------------------------------------
create table public.reports (
  uid uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  location_uid uuid not null,
  title text not null,
  contents text,
  grade text,
  constraint fk_reports_location
    foreign key (location_uid) references public.locations (uid) on delete cascade
);

-- Row Level Security -------------------------------------------------------------
-- The Cloud Functions use the service role key and bypass RLS. The admin portal
-- uses the signed-in user's session: any signed-in user may read everything and
-- manage locations and rules. Sign-ups are disabled (supabase/config.toml), so
-- only accounts created by an admin can sign in. Tighten these policies (e.g. by
-- company) before sharing one project between several organizations.
alter table public.companies enable row level security;
alter table public.locations enable row level security;
alter table public.users enable row level security;
alter table public.rules enable row level security;
alter table public.alerts enable row level security;
alter table public.applause enable row level security;
alter table public.clips enable row level security;
alter table public.logs enable row level security;
alter table public.reports enable row level security;

create policy companies_select_policy on public.companies
  for select to authenticated using (true);

create policy locations_select_policy on public.locations
  for select to authenticated using (true);
create policy locations_insert_policy on public.locations
  for insert to authenticated with check (true);
create policy locations_update_policy on public.locations
  for update to authenticated using (true) with check (true);
create policy locations_delete_policy on public.locations
  for delete to authenticated using (true);

create policy users_select_policy on public.users
  for select to authenticated using (true);

create policy rules_select_policy on public.rules
  for select to authenticated using (true);
create policy rules_insert_policy on public.rules
  for insert to authenticated with check (true);
create policy rules_update_policy on public.rules
  for update to authenticated using (true) with check (true);
create policy rules_delete_policy on public.rules
  for delete to authenticated using (true);

create policy alerts_select_policy on public.alerts
  for select to authenticated using (true);

create policy applause_select_policy on public.applause
  for select to authenticated using (true);

create policy clips_select_policy on public.clips
  for select to authenticated using (true);

create policy logs_select_policy on public.logs
  for select to authenticated using (true);

create policy reports_select_policy on public.reports
  for select to authenticated using (true);
