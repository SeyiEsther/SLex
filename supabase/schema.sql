-- ============================================================
-- SLex Database Schema — v2
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ─── Reconciliation runs ──────────────────────────────────────────────────────
create table if not exists reconciliation_runs (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid references auth.users(id) on delete cascade not null,
  name                      text not null,
  status                    text not null default 'complete'
                              check (status in ('pending', 'processing', 'complete', 'failed')),
  total_issues              integer not null default 0,
  critical_issues           integer not null default 0,
  warning_issues            integer not null default 0,
  ghost_employees           integer not null default 0,
  estimated_monthly_leakage numeric(12, 2) not null default 0,
  payroll_row_count         integer,
  benefits_row_count        integer,
  payroll_filename          text,
  benefits_filename         text,
  payroll_storage_path      text,
  benefits_storage_path     text,
  created_at                timestamptz not null default now(),
  completed_at              timestamptz
);

-- ─── Uploaded files ───────────────────────────────────────────────────────────
create table if not exists uploaded_files (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  run_id       uuid references reconciliation_runs(id) on delete cascade,
  file_type    text not null check (file_type in ('payroll', 'benefits')),
  filename     text not null,
  storage_path text,
  row_count    integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ─── Payroll records (one row per employee per run) ───────────────────────────
create table if not exists payroll_records (
  id                 uuid primary key default gen_random_uuid(),
  run_id             uuid references reconciliation_runs(id) on delete cascade not null,
  user_id            uuid references auth.users(id) on delete cascade not null,
  name               text not null,
  email              text,
  ni_number          text,
  payroll_id         text,
  department         text,
  gross_pay          numeric(12, 2),
  benefit_deduction  numeric(12, 2),
  created_at         timestamptz not null default now()
);

-- ─── Provider records (one row per benefit line per run) ──────────────────────
create table if not exists provider_records (
  id                 uuid primary key default gen_random_uuid(),
  run_id             uuid references reconciliation_runs(id) on delete cascade not null,
  user_id            uuid references auth.users(id) on delete cascade not null,
  name               text not null,
  email              text,
  ni_number          text,
  payroll_id         text,
  provider_member_id text,
  provider           text,
  benefit_type       text,
  monthly_cost       numeric(12, 2) not null default 0,
  created_at         timestamptz not null default now()
);

-- ─── Reconciliation issues ────────────────────────────────────────────────────
create table if not exists reconciliation_issues (
  id                  uuid primary key default gen_random_uuid(),
  run_id              uuid references reconciliation_runs(id) on delete cascade not null,
  user_id             uuid references auth.users(id) on delete cascade not null,
  issue_type          text not null
                        check (issue_type in (
                          'ghost_employee',
                          'missing_deduction',
                          'duplicate_billing',
                          'name_mismatch',
                          'missing_data'
                        )),
  severity            text not null
                        check (severity in ('critical', 'warning', 'info')),
  affected_name       text not null,
  affected_email      text,
  affected_ni_number  text,
  description         text not null,
  financial_impact    numeric(12, 2),
  match_confidence    numeric(4, 2),
  provider            text,
  department          text,
  details             jsonb default '{}'::jsonb,
  status              text not null default 'open'
                        check (status in ('open', 'resolved', 'dismissed')),
  created_at          timestamptz not null default now()
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table reconciliation_runs   enable row level security;
alter table uploaded_files        enable row level security;
alter table payroll_records       enable row level security;
alter table provider_records      enable row level security;
alter table reconciliation_issues enable row level security;

create policy "Users manage their own runs"
  on reconciliation_runs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own uploaded_files"
  on uploaded_files for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own payroll_records"
  on payroll_records for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own provider_records"
  on provider_records for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own issues"
  on reconciliation_issues for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists idx_runs_user_created      on reconciliation_runs(user_id, created_at desc);
create index if not exists idx_uploaded_files_run     on uploaded_files(run_id);
create index if not exists idx_payroll_records_run    on payroll_records(run_id);
create index if not exists idx_provider_records_run   on provider_records(run_id);
create index if not exists idx_issues_run             on reconciliation_issues(run_id);
create index if not exists idx_issues_severity        on reconciliation_issues(severity);
create index if not exists idx_issues_type            on reconciliation_issues(issue_type);

-- ─── Supabase Storage ─────────────────────────────────────────────────────────
-- Run these after creating a private bucket called 'reconciliation-files' in the
-- Supabase dashboard (Storage → New bucket → name: reconciliation-files → Private)

insert into storage.buckets (id, name, public)
  values ('reconciliation-files', 'reconciliation-files', false)
  on conflict do nothing;

create policy "Users upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'reconciliation-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own files"
  on storage.objects for select
  using (
    bucket_id = 'reconciliation-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'reconciliation-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
