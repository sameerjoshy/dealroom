import { useState } from 'react';
import { Loader2, ScanSearch, Sparkles } from 'lucide-react';
import { useApi } from '../lib/useApi';
import { post } from '../lib/api';
import { ConfidenceChip, PageHead } from '../components/ui';

interface Result {
  deal: { name: string };
  coverage: { available: number; required: number; missing: string[]; confidence: 'high' | 'medium' | 'low' };
  findings: { stall_id: string; name: string; confidence: string; why: string }[];
  recommended_play: { id: string; name: string; steps: { label: string }[]; success_summary: string };
  note: string;
}

const SAMPLE = `Deal: Northwind Logistics, $180k, at Proposal.
Champion is Dana (Ops Director) — she's engaged and wants this, but says she can't get the COO to a meeting.
We've never spoken to finance. Security review hasn't started. Competitor (Acme) came up on the last call.
Close date has slipped once. No procurement contact yet.`;

export default function Diagnose() {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setErr(null); setResult(null);
    try { setResult(await post<Result>('/diagnose-deal', { text, name })); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHead
        title="Diagnose a deal"
        sub="Paste a real deal story or call notes. In about thirty seconds you get the likely stall, the coverage behind it, and the play that moves it."
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <label className="label">Deal (optional)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme — Platform renewal"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
          <label className="label mt-4 block">What's happening</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12}
            placeholder="Paste your notes — who you've met, where it stands, what's stuck…"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-ink resize-y" />
          <div className="mt-3 flex items-center gap-2">
            <button className="btn-accent" onClick={run} disabled={busy || text.trim().length < 20}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <ScanSearch size={14} />} Diagnose
            </button>
            <button className="btn-ghost" onClick={() => { setText(SAMPLE); setName('Northwind Logistics — Ops platform'); }}>
              <Sparkles size={14} /> Use a sample
            </button>
          </div>
          {err && <p className="mt-3 text-sm text-critical">{err}</p>}
        </div>

        <div>
          {!result && (
            <div className="card p-8 h-full grid place-items-center text-center">
              <div>
                <ScanSearch className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-muted">Your diagnosis appears here — with the confidence behind it.</p>
              </div>
            </div>
          )}
          {result && (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ConfidenceChip confidence={result.coverage.confidence} />
                  <span className="chip border-line bg-white text-muted">
                    {result.coverage.available}/{result.coverage.required} signals
                  </span>
                </div>
                <p className="text-sm text-slate-700">{result.note}</p>
              </div>

              {result.findings.map((f) => (
                <div key={f.stall_id} className="card p-5">
                  <p className="font-semibold">{f.name} <span className="text-[11px] font-normal text-muted">· {f.confidence} confidence</span></p>
                  <p className="text-sm text-slate-600 mt-1">{f.why}</p>
                </div>
              ))}

              <div className="card p-5 border-l-4 border-l-accent2">
                <p className="label mb-1">Recommended play</p>
                <p className="font-semibold">{result.recommended_play.name}</p>
                <ul className="mt-2 space-y-1">
                  {result.recommended_play.steps.map((s, i) => <li key={i} className="text-sm text-slate-600">• {s.label}</li>)}
                </ul>
                <p className="text-xs text-muted mt-3">Check: {result.recommended_play.success_summary}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
