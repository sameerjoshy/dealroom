import type { Play } from '@dealroom/contracts';
import { useApi } from '../lib/useApi';
import { ErrorState, PageHead, Spinner } from '../components/ui';

interface PlayWithStats extends Play { stats: { runs: number; moved: number } }

export default function Plays() {
  const { data, error, loading, reload } = useApi<PlayWithStats[]>('/plays');
  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const built = data.filter((p) => p.built);
  const viewable = data.filter((p) => !p.built);

  return (
    <div>
      <PageHead title="Plays" sub="A play is data: a stall, the steps it runs, the signal that proves it moved, and a fallback. Six are built in full; the rest are shown as YAML." />

      <h2 className="label mb-3">Built in full</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {built.map((p) => (
          <div key={p.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="font-mono text-[11px] text-muted">{p.id} · fixes {p.stalls.join(', ')}</p>
              </div>
              <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700">built</span>
            </div>
            <ul className="mt-3 space-y-1">
              {p.steps.map((s, i) => <li key={i} className="text-sm text-slate-600">• {s.label}</li>)}
            </ul>
            <div className="mt-3 flex items-center gap-3 text-xs text-muted">
              <span>Check: {p.success_summary}</span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-muted font-mono">
              <span>{p.window_days}d window</span>
              {p.fallback && <span>→ {p.fallback}</span>}
              <span className="ml-auto">{p.stats.runs} runs · {p.stats.moved} moved</span>
            </div>
          </div>
        ))}
      </div>

      <h2 className="label mb-3">Viewable (YAML)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {viewable.map((p) => (
          <div key={p.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="font-mono text-[11px] text-muted">{p.id} · fixes {p.stalls.join(', ')}</p>
              </div>
              <span className="chip border-line bg-white text-muted">viewable</span>
            </div>
            <pre className="mt-3 rounded-lg bg-ink text-emerald-100/90 text-[11px] p-3 overflow-x-auto font-mono leading-relaxed">{p.yaml}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
