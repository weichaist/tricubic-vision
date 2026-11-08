-- Evaluations: staff rate each alert / applause as positive (⭕), neutral (🔼)
-- or negative (❌). See docs/evaluation-system.md.
-- Each row points at exactly one alert or one applause row.
create table public.evaluations (
  uid uuid primary key default gen_random_uuid(),

  -- Only one of these is set
  alert_uid uuid references public.alerts (uid) on delete cascade,
  applause_uid uuid references public.applause (uid) on delete cascade,

  evaluation_value text not null check (evaluation_value in ('positive', 'neutral', 'negative')),
  evaluator_user_uid uuid references public.users (uid),
  notes text,
  location_uid uuid references public.locations (uid),
  company_uid uuid references public.companies (uid),
  timestamp timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint exactly_one_item_type check (
    (alert_uid is not null and applause_uid is null) or
    (alert_uid is null and applause_uid is not null)
  )
);

create index idx_evaluations_alert on public.evaluations (alert_uid) where alert_uid is not null;
create index idx_evaluations_applause on public.evaluations (applause_uid) where applause_uid is not null;
create index idx_evaluations_user on public.evaluations (evaluator_user_uid);
create index idx_evaluations_timestamp on public.evaluations (timestamp);
create index idx_evaluations_location on public.evaluations (location_uid);

-- One evaluation per user per item
create unique index idx_evaluations_unique_alert on public.evaluations (alert_uid, evaluator_user_uid)
  where alert_uid is not null;
create unique index idx_evaluations_unique_applause on public.evaluations (applause_uid, evaluator_user_uid)
  where applause_uid is not null;

alter table public.evaluations enable row level security;

create policy "Users can view evaluations for their company" on public.evaluations
  for select using (
    exists (
      select 1 from public.users
      where users.uid = auth.uid()
      and users.company_uid = evaluations.company_uid
    )
  );

create policy "Users can insert evaluations for their company" on public.evaluations
  for insert with check (
    evaluator_user_uid = auth.uid() and
    exists (
      select 1 from public.users
      where users.uid = auth.uid()
      and users.company_uid = evaluations.company_uid
    )
  );

create policy "Users can update their own evaluations" on public.evaluations
  for update using (evaluator_user_uid = auth.uid());

-- Keep updated_at current
create or replace function public.update_evaluations_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trigger_evaluations_updated_at
  before update on public.evaluations
  for each row
  execute function public.update_evaluations_updated_at();

-- Evaluations with the kind of item they rate. security_invoker makes the view
-- apply the caller's RLS policies instead of the view owner's.
create view public.evaluations_with_item_type
with (security_invoker = true)
as
select
  e.*,
  case
    when e.alert_uid is not null then 'alert'
    when e.applause_uid is not null then 'applause'
  end as evaluated_item_type,
  coalesce(e.alert_uid, e.applause_uid) as evaluated_item_uid
from public.evaluations e;
