-- RecallPilot initial schema (R0/R1)
-- Supabase-compatible: relies on auth.users and auth.uid().

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  country text not null default 'DE',
  locale text not null default 'en',
  timezone text not null default 'Europe/Berlin',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_locale_check check (locale in ('en', 'de', 'nl'))
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'staff',
  created_at timestamptz not null default now(),
  constraint memberships_role_check check (role in ('owner', 'admin', 'staff')),
  unique (org_id, user_id)
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  city text,
  country text,
  timezone text not null default 'Europe/Berlin',
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  name text not null,
  specialty text,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists public.mapping_profiles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  pms_name text,
  mapping jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade,
  lead_email text,
  lead_name text,
  practice_name text,
  filename text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  storage_path text,
  status text not null default 'uploaded',
  stage text,
  delimiter text,
  encoding text,
  has_bom boolean not null default false,
  headers jsonb not null default '[]'::jsonb,
  mapping jsonb not null default '{}'::jsonb,
  mapping_profile_id uuid references public.mapping_profiles (id) on delete set null,
  row_count integer not null default 0,
  valid_count integer not null default 0,
  error_count integer not null default 0,
  stats jsonb not null default '{}'::jsonb,
  error_message text,
  purge_at timestamptz,
  raw_purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint imports_status_check check (status in ('uploaded', 'validating', 'ready', 'committing', 'completed', 'failed'))
);

create index if not exists imports_org_id_idx on public.imports (org_id);
create index if not exists imports_status_idx on public.imports (status);
create index if not exists imports_purge_at_idx on public.imports (purge_at) where raw_purged_at is null;

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  provider_id uuid references public.providers (id) on delete set null,
  external_id text,
  patient_key text not null,
  first_name text,
  last_name text,
  email text,
  phone text,
  birth_date date,
  last_visit_at date,
  next_recall_at date,
  recall_interval_months integer,
  last_treatment_type text not null default 'other',
  locale text not null default 'en',
  status text not null default 'active',
  source_import_id uuid references public.imports (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patients_treatment_check check (last_treatment_type in ('hygiene', 'checkup', 'treatment', 'other')),
  constraint patients_locale_check check (locale in ('en', 'de', 'nl')),
  constraint patients_status_check check (status in ('active', 'archived', 'deleted')),
  unique (org_id, patient_key)
);

create index if not exists patients_org_id_idx on public.patients (org_id);
create index if not exists patients_org_last_visit_idx on public.patients (org_id, last_visit_at);
create index if not exists patients_org_email_idx on public.patients (org_id, lower(email));

create table if not exists public.patient_channel_consents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  channel text not null,
  granted boolean not null default false,
  source text,
  granted_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint consent_channel_check check (channel in ('email', 'sms', 'whatsapp', 'voice')),
  unique (patient_id, channel)
);

create index if not exists consents_org_id_idx on public.patient_channel_consents (org_id);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  provider_id uuid references public.providers (id) on delete set null,
  external_id text,
  treatment_type text not null default 'other',
  status text not null default 'completed',
  starts_at timestamptz,
  production_value numeric(10, 2),
  source_import_id uuid references public.imports (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint appointments_treatment_check check (treatment_type in ('hygiene', 'checkup', 'treatment', 'other')),
  constraint appointments_status_check check (status in ('scheduled', 'completed', 'cancelled', 'no_show'))
);

create unique index if not exists appointments_org_external_idx
  on public.appointments (org_id, external_id)
  where external_id is not null;
create index if not exists appointments_org_patient_idx on public.appointments (org_id, patient_id);

create table if not exists public.recall_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  name text not null,
  treatment_type text not null default 'hygiene',
  interval_months integer not null default 6,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint recall_rules_treatment_check check (treatment_type in ('hygiene', 'checkup', 'treatment', 'other')),
  constraint recall_rules_interval_check check (interval_months between 1 and 60)
);

create index if not exists recall_rules_org_id_idx on public.recall_rules (org_id);

create table if not exists public.import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports (id) on delete cascade,
  org_id uuid references public.organizations (id) on delete cascade,
  row_number integer not null,
  status text not null default 'valid',
  raw jsonb not null default '{}'::jsonb,
  normalized jsonb,
  issues jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint import_rows_status_check check (status in ('valid', 'error'))
);

create index if not exists import_rows_import_id_idx on public.import_rows (import_id);
create index if not exists import_rows_org_id_idx on public.import_rows (org_id);

create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade,
  import_id uuid references public.imports (id) on delete set null,
  lead_email text,
  practice_name text,
  token text not null unique,
  token_prefix text,
  status text not null default 'processing',
  summary jsonb,
  assumptions jsonb,
  pdf_path text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint audits_status_check check (status in ('processing', 'completed', 'failed'))
);

create index if not exists audits_org_id_idx on public.audits (org_id);
create index if not exists audits_expires_at_idx on public.audits (expires_at);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_org_id_idx on public.audit_logs (org_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at);

create table if not exists public.opt_outs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  patient_id uuid references public.patients (id) on delete cascade,
  channel text not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint opt_outs_channel_check check (channel in ('email', 'sms', 'whatsapp', 'voice'))
);

create index if not exists opt_outs_org_id_idx on public.opt_outs (org_id);

-- ---------------------------------------------------------------------------
-- Timestamps
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists patients_set_updated_at on public.patients;
create trigger patients_set_updated_at before update on public.patients
for each row execute function public.set_updated_at();

drop trigger if exists imports_set_updated_at on public.imports;
create trigger imports_set_updated_at before update on public.imports
for each row execute function public.set_updated_at();

drop trigger if exists audits_set_updated_at on public.audits;
create trigger audits_set_updated_at before update on public.audits
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profile bootstrap for Supabase Auth users
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = target_org_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = target_org_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.is_org_admin(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.locations enable row level security;
alter table public.providers enable row level security;
alter table public.mapping_profiles enable row level security;
alter table public.imports enable row level security;
alter table public.patients enable row level security;
alter table public.patient_channel_consents enable row level security;
alter table public.appointments enable row level security;
alter table public.recall_rules enable row level security;
alter table public.import_rows enable row level security;
alter table public.audits enable row level security;
alter table public.audit_logs enable row level security;
alter table public.opt_outs enable row level security;

-- Organizations
create policy organizations_select on public.organizations
  for select using (public.is_org_member(id));
create policy organizations_insert on public.organizations
  for insert with check (auth.uid() is not null and created_by = auth.uid());
create policy organizations_update on public.organizations
  for update using (public.is_org_admin(id)) with check (public.is_org_admin(id));
create policy organizations_delete on public.organizations
  for delete using (
    exists (
      select 1 from public.memberships m
      where m.org_id = organizations.id and m.user_id = auth.uid() and m.role = 'owner'
    )
  );

-- Profiles
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());

-- Memberships
create policy memberships_select on public.memberships
  for select using (public.is_org_member(org_id) or user_id = auth.uid());
create policy memberships_insert on public.memberships
  for insert with check (
    (
      user_id = auth.uid()
      and role = 'owner'
      and exists (
        select 1 from public.organizations o
        where o.id = memberships.org_id and o.created_by = auth.uid()
      )
    )
    or public.is_org_admin(org_id)
  );
create policy memberships_update on public.memberships
  for update using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy memberships_delete on public.memberships
  for delete using (public.is_org_admin(org_id));

-- Tenant tables: any member may read/write within their organization.
create policy locations_tenant on public.locations
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy providers_tenant on public.providers
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy mapping_profiles_tenant on public.mapping_profiles
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy imports_tenant on public.imports
  for all using (org_id is not null and public.is_org_member(org_id))
  with check (org_id is not null and public.is_org_member(org_id));
create policy patients_tenant on public.patients
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy consents_tenant on public.patient_channel_consents
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy appointments_tenant on public.appointments
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy recall_rules_tenant on public.recall_rules
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy import_rows_tenant on public.import_rows
  for all using (org_id is not null and public.is_org_member(org_id))
  with check (org_id is not null and public.is_org_member(org_id));
create policy audits_tenant on public.audits
  for all using (org_id is not null and public.is_org_member(org_id))
  with check (org_id is not null and public.is_org_member(org_id));
create policy opt_outs_tenant on public.opt_outs
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

-- Audit log is append-only for members.
create policy audit_logs_select on public.audit_logs
  for select using (org_id is not null and public.is_org_member(org_id));
create policy audit_logs_insert on public.audit_logs
  for insert with check (
    org_id is not null
    and public.is_org_member(org_id)
    and (actor_user_id is null or actor_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on public.audit_logs from authenticated;
grant select, insert on public.audit_logs to authenticated;
revoke all on all tables in schema public from anon;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
