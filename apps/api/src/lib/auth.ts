// Auth gate. Opt-in: when REQUIRE_AUTH !== 'true' the API runs in demo mode
// (actor 'u-amy', any request allowed), which keeps local dev and the live demo
// unchanged. When enabled, a request must present either:
//   - `Authorization: Bearer <jwt>` or the `.gtm-360.com` SSO cookie, signed
//     HS256 with GTM360_SSO_SECRET, or
//   - `x-dealroom-key: <key>` matching DEALROOM_API_KEY (machine callers).
// Claims are read tolerantly: actor from sub|email|user_id, workspace from
// workspace_id|ws|wsid. This is the seller SSO surface from SPEC §2; buyer
// rooms (/r/:token) are intentionally out of scope here.

export interface AuthContext {
  actor: string;
  workspaceId: string | null;
  authenticated: boolean;
}

export interface AuthEnv {
  REQUIRE_AUTH?: string;
  GTM360_SSO_SECRET?: string;
  DEALROOM_API_KEY?: string;
}

const DEMO: AuthContext = { actor: 'u-amy', workspaceId: null, authenticated: false };

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlToString(s: string): string {
  return new TextDecoder().decode(b64urlToBytes(s));
}

function cookie(req: Request, name: string): string | null {
  const raw = req.headers.get('Cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

async function verifyHs256(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  let alg: string;
  try { alg = (JSON.parse(b64urlToString(header)) as { alg?: string }).alg ?? ''; } catch { return null; }
  if (alg !== 'HS256') return null;

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
  );
  const valid = await crypto.subtle.verify('HMAC', key, b64urlToBytes(sig), new TextEncoder().encode(`${header}.${payload}`));
  if (!valid) return null;

  try {
    const claims = JSON.parse(b64urlToString(payload)) as Record<string, unknown>;
    const exp = claims.exp;
    if (typeof exp === 'number' && exp * 1000 < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

function claimsToContext(claims: Record<string, unknown>): AuthContext {
  const actor = String(claims.sub ?? claims.email ?? claims.user_id ?? 'unknown');
  const ws = claims.workspace_id ?? claims.ws ?? claims.wsid;
  return { actor, workspaceId: ws ? String(ws) : null, authenticated: true };
}

/** Resolve the caller. Never throws — returns null when auth is on but invalid. */
export async function authenticate(request: Request, env: AuthEnv): Promise<AuthContext | null> {
  if (env.REQUIRE_AUTH !== 'true') return DEMO;

  const apiKey = request.headers.get('x-dealroom-key');
  if (env.DEALROOM_API_KEY && apiKey && apiKey === env.DEALROOM_API_KEY) {
    return { actor: 'api-key', workspaceId: null, authenticated: true };
  }

  const secret = env.GTM360_SSO_SECRET;
  if (!secret) return null;

  const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const token = bearer || cookie(request, 'gtm360_sso') || cookie(request, 'gtm-360-sso');
  if (!token) return null;

  const claims = await verifyHs256(token, secret);
  return claims ? claimsToContext(claims) : null;
}
