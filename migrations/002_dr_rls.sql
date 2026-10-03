-- Deal Room RLS. The initial migration enabled row-level security but shipped
-- no policies (service-role bypassed everything). This adds workspace-scoped
-- policies keyed to Supabase Auth (`auth.uid()`), so once the app is wired to
-- GTM-360 SSO / Supabase Auth, anon + authenticated clients can only ever see
-- their own workspace. The service-role key used by the Worker still bypasses.
--
-- Apply: node scripts/apply-migration.mjs migrations/002_dr_rls.sql

-- ── Membership + helpers ────────────────────────────────────────────────────
create table if not exists dr_workspace_members (
  workspace_id text not null references dr_workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists dr_ws_members_user on dr_workspace_members(user_id);

-- security definer so the membership lookup itself is not subject to RLS.
create or replace function dr_is_member(ws text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from dr_workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  )
$$;

create or replace function dr_deal_ws(did text)
returns text language sql stable security definer set search_path = public as $$
  select workspace_id from dr_deals where id = did
$$;

-- ── Enable RLS on the tables the initial migration missed ───────────────────
alter table dr_workspaces        enable row level security;
alter table dr_workspace_members enable row level security;
alter table dr_plan_templates    enable row level security;
alter table dr_plays             enable row level security;
alter table dr_agent_runs        enable row level security;
alter table dr_audit             enable row level security;
alter table dr_hubspot_syncs     enable row level security;

-- ── dr_workspaces / members ─────────────────────────────────────────────────
drop policy if exists dr_workspaces_member on dr_workspaces;
create policy dr_workspaces_member on dr_workspaces
  using (dr_is_member(id)) with check (dr_is_member(id));

drop policy if exists dr_ws_members_member on dr_workspace_members;
create policy dr_ws_members_member on dr_workspace_members
  using (dr_is_member(workspace_id)) with check (dr_is_member(workspace_id));

-- ── Direct workspace_id tables ──────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['dr_deals', 'dr_audit'] loop
    execute format('drop policy if exists %I_member on %I', t, t);
    execute format(
      'create policy %I_member on %I using (dr_is_member(workspace_id)) with check (dr_is_member(workspace_id))',
      t, t);
  end loop;
end $$;

-- ── Deal-scoped child tables ────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'dr_stakeholders', 'dr_activities', 'dr_events', 'dr_plan_milestones',
    'dr_stalls', 'dr_play_runs', 'dr_rooms', 'dr_assets'
  ] loop
    execute format('drop policy if exists %I_member on %I', t, t);
    execute format(
      'create policy %I_member on %I using (dr_is_member(dr_deal_ws(deal_id))) with check (dr_is_member(dr_deal_ws(deal_id)))',
      t, t);
  end loop;
end $$;

-- agent runs may be deal-linked or workspace-less (system jobs)
drop policy if exists dr_agent_runs_member on dr_agent_runs;
create policy dr_agent_runs_member on dr_agent_runs
  using (deal_id is null or dr_is_member(dr_deal_ws(deal_id)));

-- ── Shared catalogue: readable by any authenticated member ──────────────────
drop policy if exists dr_plays_read on dr_plays;
create policy dr_plays_read on dr_plays for select using (auth.role() = 'authenticated');
drop policy if exists dr_plan_templates_read on dr_plan_templates;
create policy dr_plan_templates_read on dr_plan_templates for select using (auth.role() = 'authenticated');

-- hubspot syncs are written by the Worker (service role); no client policy.
