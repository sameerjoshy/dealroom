-- Deal Room schema. Shared Supabase project, `dr_` prefix, RLS on workspace_id.
-- Apply with the Management API (see content-engine/scripts/apply-migration.mjs pattern).

create extension if not exists "pgcrypto";

create table if not exists dr_workspaces (
  id text primary key,
  name text not null,
  hubspot_portal_id text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists dr_deals (
  id text primary key,
  workspace_id text not null references dr_workspaces(id) on delete cascade,
  hubspot_id text,
  name text not null,
  account text not null,
  amount numeric not null default 0,
  stage text not null,
  close_date date not null,
  close_date_history jsonb not null default '[]'::jsonb,
  owner_id text,
  owner_name text,
  template_id text,
  meddic jsonb not null default '{}'::jsonb,
  brief jsonb,
  brief_hash text,
  created_at timestamptz not null default now()
);
create index if not exists dr_deals_ws on dr_deals(workspace_id);

create table if not exists dr_stakeholders (
  id text primary key,
  deal_id text not null references dr_deals(id) on delete cascade,
  name text not null,
  email text not null,
  title text,
  meddic_role text,
  role_confirmed boolean not null default false,
  sentiment text,
  last_two_way_at timestamptz,
  engagement_score int,
  status text not null default 'mapped'
);
create index if not exists dr_stakeholders_deal on dr_stakeholders(deal_id);

create table if not exists dr_activities (
  id text primary key,
  deal_id text not null references dr_deals(id) on delete cascade,
  type text not null,
  direction text,
  stakeholder_id text,
  body text,
  occurred_at timestamptz not null
);
create index if not exists dr_activities_deal on dr_activities(deal_id, occurred_at desc);

-- Append-only. At scale: monthly partitions + a dr_engagement_daily rollup + 90-day raw retention.
create table if not exists dr_events (
  id text primary key,
  deal_id text not null references dr_deals(id) on delete cascade,
  room_id text,
  stakeholder_email text not null,
  type text not null,
  ref_id text,
  duration_s int,
  occurred_at timestamptz not null
);
create index if not exists dr_events_deal on dr_events(deal_id, occurred_at desc);

create table if not exists dr_plan_milestones (
  id text primary key,
  deal_id text not null references dr_deals(id) on delete cascade,
  title text not null,
  type text not null,
  owner_side text not null,
  owner_contact_id text,
  due_date date not null,
  status text not null default 'pending',
  depends_on uuid[] not null default '{}',
  lead_time_days int,
  sort int
);
create index if not exists dr_plan_deal on dr_plan_milestones(deal_id);

create table if not exists dr_plan_templates (
  id text primary key,
  name text not null,
  milestones jsonb not null
);

create table if not exists dr_stalls (
  id uuid primary key default gen_random_uuid(),
  deal_id text not null references dr_deals(id) on delete cascade,
  stall_id text not null,
  confidence text not null,
  evidence jsonb not null default '[]'::jsonb,
  explanation text,
  status text not null default 'active',
  detected_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists dr_stalls_deal on dr_stalls(deal_id, status);

create table if not exists dr_plays (
  id text primary key,
  name text not null,
  stalls text[] not null,
  definition jsonb not null,
  version int not null default 1
);

create table if not exists dr_play_runs (
  id text primary key,
  deal_id text not null references dr_deals(id) on delete cascade,
  play_id text not null references dr_plays(id),
  stall_id text,
  state text not null,
  depth int not null default 0,
  steps jsonb not null default '[]'::jsonb,
  approved_by text,
  approved_at timestamptz,
  verify_until timestamptz,
  outcome text,
  outcome_evidence jsonb,
  fallback_run_id text,
  dismiss_reason text,
  created_at timestamptz not null default now()
);
create index if not exists dr_play_runs_deal on dr_play_runs(deal_id, state);

create table if not exists dr_rooms (
  id text primary key,
  deal_id text not null references dr_deals(id) on delete cascade,
  token text not null unique,
  sections jsonb not null default '{}'::jsonb,
  gate text,
  expires_at timestamptz,
  revoked boolean not null default false
);

create table if not exists dr_assets (
  id text primary key,
  deal_id text not null references dr_deals(id) on delete cascade,
  room_id text,
  type text not null,
  content jsonb,
  r2_key text,
  published boolean not null default false,
  version int not null default 1
);

create table if not exists dr_agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  deal_id text references dr_deals(id) on delete cascade,
  input_hash text,
  output jsonb,
  valid boolean,
  tokens int,
  latency_ms int,
  created_at timestamptz not null default now()
);

create table if not exists dr_audit (
  id uuid primary key default gen_random_uuid(),
  workspace_id text,
  actor text,
  entity text,
  entity_id text,
  action text,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);

create table if not exists dr_hubspot_syncs (
  id uuid primary key default gen_random_uuid(),
  direction text not null,
  object text not null,
  hubspot_id text,
  local_id text,
  status text,
  error text,
  at timestamptz not null default now()
);

-- RLS: workspace-scoped (service-role bypasses; user policies land with auth wiring)
alter table dr_deals enable row level security;
alter table dr_stakeholders enable row level security;
alter table dr_activities enable row level security;
alter table dr_events enable row level security;
alter table dr_plan_milestones enable row level security;
alter table dr_stalls enable row level security;
alter table dr_play_runs enable row level security;
alter table dr_rooms enable row level security;
alter table dr_assets enable row level security;
