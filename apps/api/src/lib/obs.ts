// Observability: one structured JSON log line per event, so Workers Logs /
// Logpush can index by field. Never log secrets or full request bodies.

type Level = 'debug' | 'info' | 'warn' | 'error';

export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/** Wrap a handler with request timing, a request id, and a JSON error boundary. */
export async function withObservability(
  request: Request,
  service: string,
  handler: (reqId: string) => Promise<Response>,
): Promise<Response> {
  const started = Date.now();
  const reqId = crypto.randomUUID().slice(0, 12);
  const url = new URL(request.url);
  let status = 500;
  try {
    const res = await handler(reqId);
    status = res.status;
    res.headers.set('x-request-id', reqId);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log('error', 'request.unhandled', { req_id: reqId, service, method: request.method, path: url.pathname, error: message });
    return new Response(JSON.stringify({ error: 'internal error', req_id: reqId }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'x-request-id': reqId },
    });
  } finally {
    log('info', 'request', {
      req_id: reqId, service, method: request.method, path: url.pathname,
      status, ms: Date.now() - started,
    });
  }
}
