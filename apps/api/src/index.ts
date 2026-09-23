import type {
  CoachingCard, Coverage, DealRecord, DealRoomOutput, MeddicFieldName, PlayRun, PlayRunStep, QualifierOutput,
} from '@dealroom/contracts';
import { MEDDIC_FIELDS, STALLS } from '@dealroom/contracts';
import { assess } from './rules';
import { PLAYS, PLAY_BY_ID, cardFor } from './plays';
import { getRepo, type Repo } from './repo';
import { id, nowIso } from './lib/util';
import { DEAL_ROOM_AGENT, QUALIFIER_AGENT } from './agents/manifest';
import { draft, extract, runManifest } from './agents/run';
import { createTask, pullDeals, writeNote } from './lib/hubspot';

export interface Env {
  DEEPSEEK_API_KEY?: string;
  HUBSPOT_API_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ENVIRONMENT?: string;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const MEDDIC_LABEL: Record<MeddicFieldName, string> = {
  metrics: 'Metrics', economic_buyer: 'Economic buyer', decision_criteria: 'Decision criteria',
  decision_process: 'Decision process', identify_pain: 'Identify pain', champion: 'Champion',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
}

async function record(dealId: string, repo: Repo): Promise<DealRecord | null> {
  const data = await repo.getDealData(dealId);
  if (!data) return null;
  const { deal, stakeholders, activities, events, plan } = data;
  const a = assess(deal, stakeholders, activities, events, plan);
  const cards = a.stalls.slice(0, 2).map((s) => cardFor(deal, s, a.coverage)).filter((c): c is CoachingCard => Boolean(c));
  const enr = await repo.getEnrichment(dealId);
  const meddic = enr?.meddic ?? deal.meddic;
  return {
    deal, stakeholders, activities, events, plan,
    stalls: a.stalls, coverage: a.coverage, signals: a.signals, reality: a.reality,
    brief: enr?.brief ?? null,
    cards,
    meddic_strip: MEDDIC_FIELDS.map((f) => ({
      field: f, label: MEDDIC_LABEL[f], status: meddic[f]?.status ?? 'empty', value: meddic[f]?.value,
    })),
  };
}

async function allCards(repo: Repo): Promise<CoachingCard[]> {
  const deals = await repo.listDeals();
  const records = await Promise.all(deals.map((d) => record(d.id, repo)));
  const out: CoachingCard[] = [];
  for (const r of records) if (r) out.push(...r.cards);
  return out.sort((a, b) => b.urgency - a.urgency);
}

async function dealBrief(dealId: string, repo: Repo) {
  const deal = (await repo.listDeals()).find((d) => d.id === dealId);
  return { deal_name: deal?.name ?? dealId, account: deal?.account ?? '', amount: deal?.amount ?? 0 };
}

async function today(repo: Repo) {
  const cards = await allCards(repo);
  const runs = await repo.listRuns();
  const runByDeal = new Map(runs.map((r) => [`${r.deal_id}:${r.play_id}`, r]));

  const needsApproval: CoachingCard[] = [];
  const waiting: { card: CoachingCard; run: PlayRun }[] = [];
  for (const c of cards) {
    const run = runByDeal.get(`${c.deal_id}:${c.play_id}`);
    if (!run || run.state === 'proposed') needsApproval.push(c);
    else if (run.state === 'verifying' || run.state === 'executing') waiting.push({ card: c, run });
  }
  const moved = await Promise.all(runs.filter((r) => r.state === 'moved_after_play').map(async (r) => ({ run: r, ...(await dealBrief(r.deal_id, repo)) })));
  const escalated = await Promise.all(runs.filter((r) => r.state === 'escalated').map(async (r) => ({ run: r, ...(await dealBrief(r.deal_id, repo)) })));

  const byPlay = new Map<string, CoachingCard[]>();
  for (const c of needsApproval) byPlay.set(c.play_id, [...(byPlay.get(c.play_id) ?? []), c]);
  const batches = [...byPlay.entries()]
    .filter(([, cs]) => cs.length >= 3)
    .map(([play_id, cs]) => ({ play_id, play_name: PLAY_BY_ID[play_id]?.name ?? play_id, count: cs.length, deal_ids: cs.map((c) => c.deal_id), value: cs.reduce((n, c) => n + c.amount, 0) }));

  const atRisk = cards.filter((c) => c.stall.severity === 'critical');
  return {
    header: {
      plays_run: runs.length,
      deals_moved: moved.length,
      deals_at_risk: atRisk.length,
      value_at_risk: atRisk.reduce((n, c) => n + c.amount, 0),
    },
    needs_approval: needsApproval, batches, waiting, moved, escalated,
  };
}

async function dealsList(repo: Repo) {
  const deals = await repo.listDeals();
  return Promise.all(deals.map(async (deal) => {
    const r = (await record(deal.id, repo))!;
    const top = r.stalls[0];
    return {
      ...deal, coverage: r.coverage,
      top_stall: top ? { id: top.stall_id, name: STALLS[top.stall_id].name, severity: top.severity } : null,
      stall_count: r.stalls.length, card_count: r.cards.length,
    };
  }));
}

async function playsList(repo: Repo) {
  const runs = await repo.listRuns();
  return PLAYS.map((p) => {
    const pr = runs.filter((r) => r.play_id === p.id);
    return { ...p, stats: { runs: pr.length, moved: pr.filter((r) => r.state === 'moved_after_play').length } };
  });
}

async function createRun(dealId: string, playId: string, repo: Repo, depth = 0): Promise<PlayRun | null> {
  const play = PLAY_BY_ID[playId];
  const rec = await record(dealId, repo);
  if (!play || !rec) return null;
  const stall = rec.stalls.find((s) => play.stalls.includes(s.stall_id)) ?? rec.stalls[0];
  const run: PlayRun = {
    id: id('run'), deal_id: dealId, play_id: playId, stall_id: stall?.stall_id ?? 'S1',
    state: 'proposed', depth, created_at: nowIso(),
    steps: play.steps.map((s) => ({ label: s.label, status: 'pending' as const })),
  };
  await repo.putRun(run);
  await repo.audit({ actor: 'u-amy', action: 'play.proposed', entity: 'play_run', entity_id: run.id, detail: { deal_id: dealId, play_id: playId } });
  return run;
}

const STATIC_STEP: Record<string, string> = {
  draft_email: 'Draft ready — demo mode, not sent',
  generate_asset: 'Asset added to the champion kit',
  plan_update: 'Milestone added to the close plan',
  hubspot_task: 'HubSpot task created',
};

async function executeSteps(run: PlayRun, repo: Repo, env: Env): Promise<PlayRun> {
  const play = PLAY_BY_ID[run.play_id];
  const rec = await record(run.deal_id, repo);
  const champion = rec?.stakeholders.find((s) => s.meddic_role === 'champion');
  const steps: PlayRunStep[] = [];
  for (let i = 0; i < run.steps.length; i++) {
    const def = play.steps[i];
    let detail = STATIC_STEP[def?.type ?? 'draft_email'];
    if (env.DEEPSEEK_API_KEY && (def?.type === 'draft_email' || def?.type === 'generate_asset')) {
      const out = await draft(env.DEEPSEEK_API_KEY, {
        account: rec?.deal.account ?? '', deal: rec?.deal.name ?? '', stage: rec?.deal.stage ?? '',
        intent: def.label, recipient: champion?.name, wantAsset: def.type === 'generate_asset',
      });
      if (out) {
        await repo.logAgentRun({ agent_id: 'sniper', deal_id: run.deal_id, valid: true, tokens: 0, latency_ms: 0, at: nowIso() });
        detail = def.type === 'draft_email'
          ? `Subject: ${out.email.subject}\n\n${out.email.body}`
          : (out.asset?.content ?? detail);
      }
    }
    steps.push({ label: def?.label ?? '', status: 'done', detail });
  }
  run.steps = steps;
  run.state = 'verifying';
  run.approved_at = nowIso();
  run.approved_by = 'u-amy';
  run.verify_until = new Date(Date.now() + play.window_days * 86_400_000).toISOString();
  await repo.putRun(run);
  await repo.audit({ actor: 'u-amy', action: 'play.approved', entity: 'play_run', entity_id: run.id, detail: { steps: steps.length } });

  // Best-effort HubSpot write-back (Notes + Task) when the deal is linked.
  const hsDeal = rec?.deal.hubspot_id;
  if (env.HUBSPOT_API_KEY && hsDeal) {
    const summary = `Deal Room — play: ${play.name}\n\n` + steps.map((s) => `• ${s.label}`).join('\n');
    const noted = await writeNote(env.HUBSPOT_API_KEY, hsDeal, summary);
    const tasked = await createTask(env.HUBSPOT_API_KEY, hsDeal, `Deal Room: follow up on ${play.name}`, 3);
    await repo.audit({ actor: 'u-amy', action: 'hubspot.writeback', entity: 'play_run', entity_id: run.id, detail: { noted, tasked } });
  }
  return run;
}

async function approveRun(runId: string, repo: Repo, env: Env): Promise<PlayRun | null> {
  const run = await repo.getRun(runId);
  if (!run) return null;
  run.state = 'executing';
  await repo.putRun(run);
  return executeSteps(run, repo, env);
}

async function simulateRun(runId: string, outcome: 'moved' | 'not_moved', repo: Repo): Promise<PlayRun | null> {
  const run = await repo.getRun(runId);
  if (!run) return null;
  if (outcome === 'moved') {
    run.state = 'moved_after_play';
    run.outcome = 'Buyer responded — the deal moved after the play.';
    run.outcome_evidence = [{ type: 'event', excerpt: 'Economic buyer viewed the room', at: nowIso() }];
    await repo.putRun(run);
    await repo.audit({ actor: 'buyer', action: 'play.moved', entity: 'play_run', entity_id: run.id });
    return run;
  }
  const play = PLAY_BY_ID[run.play_id];
  if (play.fallback && run.depth < 2) {
    run.state = 'not_moved';
    run.outcome = 'No response in the window.';
    await repo.putRun(run);
    const next = await createRun(run.deal_id, play.fallback, repo, run.depth + 1);
    if (next) { run.fallback_run_id = next.id; await repo.putRun(run); }
    await repo.audit({ actor: 'system', action: 'play.fallback', entity: 'play_run', entity_id: run.id, detail: { fallback: play.fallback } });
    return (await repo.getRun(run.id))!;
  }
  run.state = 'escalated';
  run.outcome = 'No response — escalated to the manager.';
  await repo.putRun(run);
  await repo.audit({ actor: 'system', action: 'play.escalated', entity: 'play_run', entity_id: run.id });
  return run;
}

async function managerOverview(repo: Repo) {
  const runs = await repo.listRuns();
  const byStall = new Map<string, { count: number; value: number }>();
  for (const deal of await repo.listDeals()) {
    const r = (await record(deal.id, repo))!;
    for (const s of r.stalls) {
      const cur = byStall.get(s.stall_id) ?? { count: 0, value: 0 };
      cur.count += 1; cur.value += deal.amount;
      byStall.set(s.stall_id, cur);
    }
  }
  const pipeline = [...byStall.entries()]
    .map(([stall_id, v]) => ({ stall_id, name: STALLS[stall_id as keyof typeof STALLS].name, severity: STALLS[stall_id as keyof typeof STALLS].severity, ...v }))
    .sort((a, b) => STALLS[a.stall_id as keyof typeof STALLS].precedence - STALLS[b.stall_id as keyof typeof STALLS].precedence);
  const playStats = PLAYS.filter((p) => p.built).map((p) => {
    const pr = runs.filter((r) => r.play_id === p.id);
    const moved = pr.filter((r) => r.state === 'moved_after_play').length;
    return { play_id: p.id, name: p.name, runs: pr.length, moved, rate: pr.length >= 5 ? Math.round((moved / pr.length) * 100) : null };
  });
  return { pipeline, play_stats: playStats, escalations: runs.filter((r) => r.state === 'escalated') };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/deal-room/, '');
    const method = request.method;
    const repo = getRepo(env);
    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (method === 'GET' && path === '/health') {
      return json({ ok: true, service: 'dealroom-api', llm: Boolean(env.DEEPSEEK_API_KEY), store: env.SUPABASE_URL ? 'supabase' : 'memory', time: nowIso() });
    }
    if (method === 'GET' && path === '/api/today') return json(await today(repo));
    if (method === 'GET' && path === '/api/deals') return json(await dealsList(repo));
    if (method === 'GET' && path === '/api/plays') return json(await playsList(repo));
    if (method === 'GET' && path === '/api/manager/overview') return json(await managerOverview(repo));
    if (method === 'GET' && path === '/api/audit') return json(await repo.listAudit());
    if (method === 'GET' && path === '/api/agent-runs') return json(await repo.listAgentRuns());

    const dealMatch = path.match(/^\/api\/deals\/([^/]+)$/);
    if (method === 'GET' && dealMatch) {
      const r = await record(dealMatch[1], repo);
      return r ? json(r) : json({ error: 'not found' }, 404);
    }

    const enrichMatch = path.match(/^\/api\/deals\/([^/]+)\/enrich$/);
    if (method === 'POST' && enrichMatch) {
      const r = await record(enrichMatch[1], repo);
      if (!r) return json({ error: 'not found' }, 404);
      const [dr, q] = await Promise.all([
        runManifest<DealRoomOutput>(env.DEEPSEEK_API_KEY, DEAL_ROOM_AGENT, r),
        runManifest<QualifierOutput>(env.DEEPSEEK_API_KEY, QUALIFIER_AGENT, r),
      ]);
      if (!dr && !q) return json({ ...r, llm: false });
      await repo.setEnrichment(enrichMatch[1], {
        brief: dr ? { lines: dr.output.brief, generated_at: nowIso() } : undefined,
        meddic: q ? q.output.meddic : undefined,
        generated_at: nowIso(),
      });
      if (dr) await repo.logAgentRun({ agent_id: 'deal-room', deal_id: enrichMatch[1], valid: true, tokens: dr.tokens, latency_ms: dr.latency_ms, at: nowIso() });
      if (q) await repo.logAgentRun({ agent_id: 'qualifier', deal_id: enrichMatch[1], valid: true, tokens: q.tokens, latency_ms: q.latency_ms, at: nowIso() });
      return json({ ...(await record(enrichMatch[1], repo)), llm: true });
    }

    const debriefMatch = path.match(/^\/api\/deals\/([^/]+)\/debrief$/);
    if (method === 'POST' && debriefMatch) {
      const body = (await request.json().catch(() => ({}))) as { text?: string };
      if (!body.text || body.text.trim().length < 20) return json({ error: 'Paste notes or a transcript.' }, 400);
      const facts = await extract(env.DEEPSEEK_API_KEY, body.text);
      if (!facts) return json({ llm: false, note: 'Extractor unavailable (no key).' });
      await repo.logAgentRun({ agent_id: 'extractor', deal_id: debriefMatch[1], valid: true, tokens: 0, latency_ms: 0, at: nowIso() });
      return json({ llm: true, proposed: facts });
    }

    const diagMatch = path.match(/^\/api\/deals\/([^/]+)\/diagnose$/);
    if (method === 'POST' && diagMatch) {
      const r = await record(diagMatch[1], repo);
      return r ? json(r) : json({ error: 'not found' }, 404);
    }

    if (method === 'POST' && path === '/api/play-runs') {
      const body = (await request.json().catch(() => ({}))) as { deal_id?: string; play_id?: string; approve?: boolean };
      if (!body.deal_id || !body.play_id) return json({ error: 'deal_id and play_id required' }, 400);
      const run = await createRun(body.deal_id, body.play_id, repo);
      if (!run) return json({ error: 'deal or play not found' }, 404);
      return json(body.approve ? await approveRun(run.id, repo, env) : run, 201);
    }
    const approveMatch = path.match(/^\/api\/play-runs\/([^/]+)\/approve$/);
    if (method === 'POST' && approveMatch) {
      const run = await approveRun(approveMatch[1], repo, env);
      return run ? json(run) : json({ error: 'not found' }, 404);
    }
    const dismissMatch = path.match(/^\/api\/play-runs\/([^/]+)\/dismiss$/);
    if (method === 'POST' && dismissMatch) {
      const body = (await request.json().catch(() => ({}))) as { reason?: string };
      const run = await repo.getRun(dismissMatch[1]);
      if (!run) return json({ error: 'not found' }, 404);
      run.state = 'dismissed';
      run.dismiss_reason = body.reason ?? 'not now';
      await repo.putRun(run);
      await repo.audit({ actor: 'u-amy', action: 'play.dismissed', entity: 'play_run', entity_id: run.id, detail: { reason: run.dismiss_reason } });
      return json(run);
    }
    const simMatch = path.match(/^\/api\/play-runs\/([^/]+)\/simulate$/);
    if (method === 'POST' && simMatch) {
      const body = (await request.json().catch(() => ({}))) as { outcome?: 'moved' | 'not_moved' };
      const run = await simulateRun(simMatch[1], body.outcome ?? 'moved', repo);
      return run ? json(run) : json({ error: 'not found' }, 404);
    }

    if (method === 'POST' && path === '/api/play-runs/batch-approve') {
      const body = (await request.json().catch(() => ({}))) as { deal_ids?: string[]; play_id?: string };
      if (!body.deal_ids?.length || !body.play_id) return json({ error: 'deal_ids and play_id required' }, 400);
      const runs: PlayRun[] = [];
      for (const dealId of body.deal_ids) {
        const r = await createRun(dealId, body.play_id, repo);
        if (r) { const done = await approveRun(r.id, repo, env); if (done) runs.push(done); }
      }
      await repo.audit({ actor: 'u-amy', action: 'play.batch_approved', entity: 'play_run', entity_id: body.play_id, detail: { count: runs.length } });
      return json({ approved: runs.length, runs });
    }

    if (method === 'POST' && path === '/api/diagnose-deal') {
      const body = (await request.json().catch(() => ({}))) as { text?: string; name?: string };
      const text = (body.text ?? '').trim();
      if (text.length < 20) return json({ error: 'Paste at least a couple of sentences about the deal.' }, 400);
      return json(await diagnoseIntake(text, body.name ?? 'Pasted deal', env));
    }

    if (method === 'POST' && path === '/api/seed/reset') {
      await repo.resetSeed();
      return json({ ok: true, reset_at: nowIso() });
    }

    if (method === 'POST' && path === '/api/hubspot/sync') {
      if (!env.HUBSPOT_API_KEY) return json({ error: 'HubSpot not configured' }, 400);
      const body = (await request.json().catch(() => ({}))) as { limit?: number };
      const { deals, stakeholders } = await pullDeals(env.HUBSPOT_API_KEY, body.limit ?? 15);
      await repo.upsertDeals(deals, stakeholders);
      await repo.audit({ actor: 'system', action: 'hubspot.sync', entity: 'workspace', entity_id: 'demo-ws', detail: { deals: deals.length, stakeholders: stakeholders.length } });
      return json({ synced: true, deals: deals.length, stakeholders: stakeholders.length });
    }

    if (method === 'POST' && path === '/api/hubspot/writeback') {
      const body = (await request.json().catch(() => ({}))) as { run_id?: string };
      const run = body.run_id ? await repo.getRun(body.run_id) : null;
      if (!run) return json({ error: 'run_id required' }, 400);
      const deal = (await repo.listDeals()).find((d) => d.id === run.deal_id);
      if (!env.HUBSPOT_API_KEY || !deal?.hubspot_id) return json({ ok: false, reason: 'no HubSpot deal linked' });
      const summary = `Deal Room — play: ${PLAY_BY_ID[run.play_id]?.name}\n\n` + run.steps.map((s) => `• ${s.label}`).join('\n');
      const noted = await writeNote(env.HUBSPOT_API_KEY, deal.hubspot_id, summary);
      const tasked = await createTask(env.HUBSPOT_API_KEY, deal.hubspot_id, `Deal Room: follow up on ${PLAY_BY_ID[run.play_id]?.name}`, 3);
      await repo.audit({ actor: 'u-amy', action: 'hubspot.writeback', entity: 'play_run', entity_id: run.id, detail: { noted, tasked } });
      return json({ ok: noted || tasked, note: noted, task: tasked });
    }

    return json({ error: 'not found', path }, 404);
  },
};

// ── Diagnose a deal (intake) ─────────────────────────────────────────────────
async function diagnoseIntake(text: string, name: string, env: Env) {
  const lower = text.toLowerCase();
  const has = (...terms: string[]) => terms.some((t) => lower.includes(t));
  const findings: { stall_id: string; name: string; confidence: string; why: string }[] = [];
  let coverage: Coverage = { available: 3, required: 7, missing: ['confirmed roles', 'two-way activity', 'room engagement'], confidence: 'low' };
  let usedLlm = false;

  const facts = await extract(env.DEEPSEEK_API_KEY, text);
  if (facts) {
    usedLlm = true;
    const roles = facts.stakeholders.map((s) => (s.role_hint ?? '').toLowerCase()).join(' ');
    const hasChampion = /champion/.test(roles) || Boolean(facts.meddic_updates.find((m) => m.field === 'champion' && m.status !== 'empty'));
    const hasEB = /economic|buyer|cfo|budget|sign/.test(roles) || Boolean(facts.meddic_updates.find((m) => m.field === 'economic_buyer' && m.status !== 'empty'));
    const avail = Math.min(3 + (facts.stakeholders.length ? 1 : 0) + (hasChampion || hasEB ? 1 : 0), 7);
    coverage = { available: avail, required: 7, missing: ['room engagement'], confidence: avail >= 5 ? 'medium' : 'low' };
    if (!hasChampion) findings.push({ stall_id: 'S1', name: STALLS.S1.name, confidence: 'medium', why: 'No champion is evident in what you pasted.' });
    if (!hasEB) findings.push({ stall_id: 'S2', name: STALLS.S2.name, confidence: 'medium', why: 'The economic buyer is not engaged.' });
    if (facts.competitor_mentions.length) findings.push({ stall_id: 'S8', name: STALLS.S8.name, confidence: 'medium', why: `Competitor active: ${facts.competitor_mentions[0].competitor}.` });
    if (facts.pricing_signals.length) findings.push({ stall_id: 'S9', name: STALLS.S9.name, confidence: 'medium', why: 'Commercial step is stuck.' });
  } else {
    if (!has('champion', 'our contact')) findings.push({ stall_id: 'S1', name: STALLS.S1.name, confidence: 'medium', why: 'No champion is evident in what you pasted.' });
    if (!has('cfo', 'economic buyer', 'budget holder', 'sign-off')) findings.push({ stall_id: 'S2', name: STALLS.S2.name, confidence: 'medium', why: 'The economic buyer is not engaged.' });
    if (!has('procurement', 'security review', 'legal')) findings.push({ stall_id: 'S5', name: STALLS.S5.name, confidence: 'low', why: 'Procurement, security and legal review are not mapped.' });
    if (has('competitor', 'acme', 'rival', 'also talking to')) findings.push({ stall_id: 'S8', name: STALLS.S8.name, confidence: 'medium', why: 'A competitor is active in the deal.' });
  }

  findings.sort((a, b) => STALLS[a.stall_id as keyof typeof STALLS].precedence - STALLS[b.stall_id as keyof typeof STALLS].precedence);
  if (findings.length === 0) findings.push({ stall_id: 'S4', name: STALLS.S4.name, confidence: 'low', why: 'Nothing forces a decision by a date.' });
  const top = findings.slice(0, 2);
  const playMap: Record<string, string> = { S1: 'P-CHAMPION-TEST', S2: 'P-EB-VIA-CHAMPION', S5: 'P-PROCUREMENT-PREWIRE', S8: 'P-DIFFERENTIATE', S9: 'P-COMMERCIAL-TRADE', S4: 'P-COMPELLING-EVENT' };
  return {
    deal: { name }, coverage, findings: top,
    recommended_play: PLAY_BY_ID[playMap[top[0].stall_id] ?? 'P-EB-VIA-CHAMPION'],
    llm: usedLlm,
    note: usedLlm
      ? 'Triangulated from what you pasted. Connect HubSpot to firm it up.'
      : 'Triangulated from what you pasted (offline read). Connect HubSpot to firm it up.',
  };
}
