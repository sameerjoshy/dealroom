import type { Severity } from '@dealroom/contracts';
import { useApi } from '../lib/useApi';
import { ErrorState, PageHead, SeverityChip, Spinner } from '../components/ui';
import { money } from '../lib/format';

interface ManagerData {
  pipeline: { stall_id: string; name: string; severity: Severity; count: number; value: number }[];
  play_stats: { play_id: string; name: string; runs: number; moved: number; rate: number | null }[];
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

      <h2 className="label mt-8 mb-3">Escalations</h2>
      <div className="card p-4 text-sm text-muted">
        {data.escalations.length === 0 ? 'Nothing escalated.' : `${data.escalations.length} play(s) escalated to you.`}
      </div>
    </div>
  );
}
