import type { Severity } from '@dealroom/contracts';
import { useApi } from '../lib/useApi';
import { ErrorState, PageHead, SeverityChip, Spinner } from '../components/ui';
import { money } from '../lib/format';

interface ManagerData {
  pipeline: { stall_id: string; name: string; severity: Severity; count: number; value: number }[];
  play_stats: { play_id: string; name: string; runs: number; moved: number; rate: number | null }[];
  rep_patterns: { rep: string; deals: number; avg_stalls: number; vs_median: number; top_stall_name: string | null; coaching: boolean }[];
  team_median_stalls: number;
  dismiss_reasons: { stall_id: string; name: string; total: number; reasons: { reason: string; count: number }[] }[];
  forecast_flags: { deal_id: string; name: string; account: string; amount: number; close_date: string; earliest: string }[];
  escalations: unknown[];
}

export default function Manager() {
  const { data, error, loading, reload } = useApi<ManagerData>('/manager/overview');
  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div>
      <PageHead title="Manager" sub="Pipeline grouped by stall — not stage — so you coach the cause, not the symptom. Rates are hidden below five runs." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="label mb-3">Pipeline by stall</h2>
          <div className="card divide-y divide-line">
            {data.pipeline.length === 0 && <p className="px-4 py-4 text-sm text-muted">No stalls across the pipeline.</p>}
            {data.pipeline.map((p) => (
              <div key={p.stall_id} className="flex items-center gap-3 px-4 py-3">
                <SeverityChip severity={p.severity}>{p.name}</SeverityChip>
                <span className="ml-auto font-mono text-xs text-muted">{p.count} deals · {money(p.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="label mb-3">Play performance</h2>
          <div className="card divide-y divide-line">
            {data.play_stats.map((s) => (
              <div key={s.play_id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="font-mono text-xs text-muted">{s.runs} runs</span>
                </div>
                <div className="text-xs text-muted mt-1">
                  {s.rate === null
                    ? `Win rate hidden — ${s.runs} run${s.runs === 1 ? '' : 's'} (needs 5)`
                    : `${s.rate}% moved after play · ${s.moved}/${s.runs}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div>
          <h2 className="label mb-3">Rep patterns · median {data.team_median_stalls} stalls/deal</h2>
          <div className="card divide-y divide-line">
            {data.rep_patterns.length === 0 && <p className="px-4 py-4 text-sm text-muted">No rep data.</p>}
            {data.rep_patterns.map((r) => (
              <div key={r.rep} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.rep}</span>
                  <span className="font-mono text-xs text-muted">{r.avg_stalls} stalls/deal · {r.deals} deals</span>
                </div>
                {r.coaching && r.top_stall_name && (
                  <div className="text-xs text-amber-700 mt-1">Coaching topic: {r.top_stall_name} (above team median)</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="label mb-3">Forecast flags · close date not achievable</h2>
          <div className="card divide-y divide-line">
            {data.forecast_flags.length === 0 && <p className="px-4 py-4 text-sm text-muted">No in-quarter deals flagged.</p>}
            {data.forecast_flags.map((f) => (
              <div key={f.deal_id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{f.account}</span>
                  <span className="font-mono text-xs text-muted">{money(f.amount)}</span>
                </div>
                <div className="text-xs text-amber-700 mt-1">CRM {f.close_date} vs earliest achievable {f.earliest}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="label mt-8 mb-3">Dismiss reasons · where the model and the rep disagree</h2>
      <div className="card divide-y divide-line">
        {data.dismiss_reasons.length === 0 && <p className="px-4 py-4 text-sm text-muted">No dismissed plays.</p>}
        {data.dismiss_reasons.map((d) => (
          <div key={d.stall_id} className="flex items-center gap-3 px-4 py-3">
            <span className="text-sm font-medium">{d.name}</span>
            <span className="ml-auto text-xs text-muted">{d.reasons.map((r) => `${r.reason} (${r.count})`).join(' · ')}</span>
          </div>
        ))}
      </div>

      <h2 className="label mt-8 mb-3">Escalations</h2>
      <div className="card p-4 text-sm text-muted">
        {data.escalations.length === 0 ? 'Nothing escalated.' : `${data.escalations.length} play(s) escalated to you.`}
      </div>
    </div>
  );
}
