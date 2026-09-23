// Apps hub — routes apps.gtm-360.com/<app>/* to each independent app.
// Each app stays its own Worker; the hub only routes (no auth, no state).

export interface Env {
  DEALROOM: Fetcher;           // dealroom-api
  DEALROOM_APP: Fetcher;       // deal-room static app
  CONTENT_ENGINE_APP: Fetcher; // content-engine static app
}

const APPS = [
  { path: '/deal-room', name: 'Deal Room', desc: 'Why a deal is stuck, the play that moves it, and proof it worked.' },
  { path: '/content-engine', name: 'Content Engine', desc: 'Topic to fact-checked article, in your voice.', soon: true },
];

function launcher(): Response {
  const cards = APPS.map((a) => `
    <a class="card ${a.soon ? 'soon' : ''}" href="${a.soon ? '#' : a.path + '/'}">
      <h2>${a.name}${a.soon ? ' <span class="soon-tag">soon</span>' : ''}</h2>
      <p>${a.desc}</p>
      <span class="go">${a.soon ? 'Coming soon' : 'Open →'}</span>
    </a>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>GTM-360 Apps</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=DM+Mono&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif;color:#0F172A}
    header{background:#0A192F;color:#fff;padding:22px 28px;display:flex;align-items:center;gap:12px}
    .mark{width:34px;height:34px;border-radius:9px;background:#10B981;color:#0A192F;display:grid;place-items:center;font-weight:700}
    header .sub{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;opacity:.5}
    main{max-width:1000px;margin:0 auto;padding:40px 28px}
    h1{font-size:22px;margin:0 0 4px}p.lead{color:#64748B;margin:0 0 28px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
    .card{display:block;background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:22px;text-decoration:none;color:inherit;transition:.15s}
    .card:hover{box-shadow:0 6px 20px rgba(15,23,42,.08);border-color:#0A192F}
    .card.soon{opacity:.6;pointer-events:none}
    .card h2{margin:0 0 8px;font-size:16px}.card p{margin:0 0 16px;color:#64748B;font-size:13px;line-height:1.5}
    .go{font-weight:600;color:#0D9488;font-size:13px}
    .soon-tag{font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;background:#F1F5F9;color:#64748B;padding:2px 6px;border-radius:6px;vertical-align:middle}
  </style></head>
  <body><header><span class="mark">G</span><div><div style="font-weight:700">GTM-360 Apps</div><div class="sub">Full products</div></div></header>
  <main><h1>Apps</h1><p class="lead">Full, standalone products. For the agents themselves, open the <a href="https://agents.gtm-360.com">Agent Portal</a>.</p>
  <div class="grid">${cards}</div></main></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === '/' || pathname === '') return launcher();

    // API: the Worker strips /deal-room itself.
    if (pathname.startsWith('/deal-room/api')) return env.DEALROOM.fetch(request);

    // App: strip the /<app> prefix so the static-assets Worker serves from its root.
    if (pathname.startsWith('/deal-room')) {
      const stripped = new URL(request.url);
      stripped.pathname = pathname.replace(/^\/deal-room/, '') || '/';
      return env.DEALROOM_APP.fetch(new Request(stripped.toString(), request));
    }
    if (pathname.startsWith('/content-engine')) {
      const stripped = new URL(request.url);
      stripped.pathname = pathname.replace(/^\/content-engine/, '') || '/';
      return env.CONTENT_ENGINE_APP.fetch(new Request(stripped.toString(), request));
    }

    return new Response('Not found', { status: 404 });
  },
};
