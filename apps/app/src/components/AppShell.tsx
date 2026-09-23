import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Sun, Briefcase, ScanSearch, BookOpen, BarChart3, ExternalLink } from 'lucide-react';

const NAV = [
  { to: '/', label: 'Today', icon: Sun, end: true },
  { to: '/deals', label: 'Deals', icon: Briefcase },
  { to: '/diagnose', label: 'Diagnose a deal', icon: ScanSearch },
  { to: '/plays', label: 'Plays', icon: BookOpen },
  { to: '/manager', label: 'Manager', icon: BarChart3 },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full">
      <aside className="hidden lg:flex w-[248px] flex-col bg-ink text-white">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-ink font-bold">DR</span>
            <div className="leading-tight">
              <div className="font-bold tracking-tight">Deal Room</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/60">GTM-360</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `navlink ${isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white hover:bg-white/5'}`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10 space-y-2">
          <a href="https://apps.gtm-360.com" className="flex items-center gap-2 text-xs text-white/70 hover:text-white">
            <ExternalLink size={12} /> All apps
          </a>
          <p className="text-[11px] text-white/60">Signed in · SSO</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-line bg-white">
          <span className="font-bold">Deal Room</span>
          <nav className="flex gap-1 overflow-x-auto">
            {NAV.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap ${isActive ? 'bg-ink text-white' : 'text-slate-500'}`}>
                {label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-5 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
