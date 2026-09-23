#!/usr/bin/env node
// Deal Room eval — asserts the engine produces the intended diagnosis on the
// seeded deals, and that the play loop closes. Run against a live Worker:
//   node scripts/eval.mjs            # http://localhost:8787
//   node scripts/eval.mjs <baseUrl>

const BASE = process.argv[2] || 'http://localhost:8787';

const get = async (p) => {
  const r = await fetch(`${BASE}${p}`);
  if (!r.ok) throw new Error(`GET ${p} → ${r.status}`);
  return r.json();
};
const post = async (p, body) => {
  const r = await fetch(`${BASE}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`POST ${p} → ${r.status}`);
  return r.json();
};

const failures = [];
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
};

// Reset to a clean seed
await post('/api/seed/reset', {});

console.log('\nDIAGNOSIS — one intended stall per seeded deal');
const expected = {
  'd-northwind': 'S2', 'd-helix': 'S5', 'd-crestline': 'S3',
  'd-orbit': 'S7', 'd-vantage': 'S8', 'd-kestrel': null, 'd-beacon': 'S4',
};
const deals = await get('/api/deals');
for (const [id, want] of Object.entries(expected)) {
  const d = deals.find((x) => x.id === id);
  const got = d?.top_stall?.id ?? null;
  check(`${id} → ${want ?? 'no stall'}`, got === want, `got ${got ?? 'none'}`);
}

console.log('\nCOVERAGE / CONFIDENCE');
const nw = await get('/api/deals/d-northwind');
check('northwind high confidence (7/7)', nw.coverage.confidence === 'high' && nw.coverage.available === 7, `${nw.coverage.available}/${nw.coverage.required} ${nw.coverage.confidence}`);
check('northwind has an actionable card', nw.cards.length >= 1);
check('card cites evidence', nw.cards[0]?.stall.evidence.length >= 1);
check('card confidence shown', Boolean(nw.cards[0]?.coverage.confidence));

const beacon = await get('/api/deals/d-beacon');
check('beacon is low confidence (thin data)', beacon.coverage.confidence === 'low', `${beacon.coverage.available}/${beacon.coverage.required}`);
check('beacon still gets a triangulated finding', beacon.stalls.length >= 1);

const ks = await get('/api/deals/d-kestrel');
check('kestrel healthy → no cards', ks.cards.length === 0 && ks.stalls.length === 0);

console.log('\nPLAY LOOP — approve → verify → moved');
const run = await post('/api/play-runs', { deal_id: 'd-northwind', play_id: 'P-EB-VIA-CHAMPION', approve: true });
check('approve runs the steps', run.state === 'verifying' && run.steps.every((s) => s.status === 'done'));
const moved = await post(`/api/play-runs/${run.id}/simulate`, { outcome: 'moved' });
check('simulate → moved_after_play', moved.state === 'moved_after_play');
const today = await get('/api/today');
check('today shows the moved play', today.moved.some((m) => m.run.id === run.id));

console.log('\nFALLBACK — no response → fallback (depth capped)');
const run2 = await post('/api/play-runs', { deal_id: 'd-orbit', play_id: 'P-BREAK-SILENCE', approve: true });
const nm = await post(`/api/play-runs/${run2.id}/simulate`, { outcome: 'not_moved' });
check('not_moved sets a fallback run', nm.state === 'not_moved' && Boolean(nm.fallback_run_id));

console.log('\nDIAGNOSE A DEAL — intake');
const diag = await post('/api/diagnose-deal', { text: 'Champion is engaged but cannot get the CFO to a meeting. No procurement contact. Acme is also pitching. Close date slipped.', name: 'Test deal' });
check('intake returns findings', diag.findings.length >= 1);
check('intake recommends a play', Boolean(diag.recommended_play?.id));

console.log(`\n${failures.length ? `FAILURES (${failures.length}):\n` + failures.map((f) => '  - ' + f).join('\n') : '✅ all evals passed'}`);
process.exit(failures.length ? 1 : 0);
