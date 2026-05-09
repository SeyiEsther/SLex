-- ============================================================
-- SyncLedger Database Schema
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
  estimated_monthly_leakage numeric(12, 2) not null default 0,
  payroll_row_count         integer,
  benefits_row_count        integer,
  created_at                timestamptz not null default now(),
  completed_at              timestamptz
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
  details             jsonb default '{}'::jsonb,
  status              text not null default 'open'
                        check (status in ('open', 'resolved', 'dismissed')),
  created_at          timestamptz not null default now()
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table reconciliation_runs enable row level security;
alter table reconciliation_issues enable row level security;

-- Users can only see their own runs
create policy "Users can manage their own runs"
  on reconciliation_runs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only see their own issues
create policy "Users can manage their own issues"
  on reconciliation_issues
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists idx_runs_user_id_created
  on reconciliation_runs(user_id, created_at desc);

create index if not exists idx_issues_run_id
  on reconciliation_issues(run_id);

create index if not exists idx_issues_user_id
  on reconciliation_issues(user_id);

create index if not exists idx_issues_severity
  on reconciliation_issues(severity);
