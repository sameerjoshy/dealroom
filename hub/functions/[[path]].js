// apps.gtm-360.com is a thin proxy to the apps-hub Worker, which owns all
// routing (launcher, /deal-room, /content-engine, /deal-room/api).
const HUB = 'https://apps-hub.sameerjoshy.workers.dev';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const res = await fetch(HUB + url.pathname + url.search, {
    method: request.method,
    headers: request.headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
  });
  return new Response(res.body, { status: res.status, headers: res.headers });
}