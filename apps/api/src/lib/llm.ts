// LLM provider interface. DeepSeek by default; swappable. No key ⇒ NoLLM, and
// callers fall back to the rule-only path (the app must never break on this).

export interface LlmOpts {
  system: string;
  user: string;
  schema?: unknown;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export class NoLLM extends Error {}

interface DeepSeekResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export interface LlmResult<T> { output: T; tokens: number; latency_ms: number }

export async function chatJson<T>(key: string | undefined, opts: LlmOpts): Promise<LlmResult<T>> {
  if (!key) throw new NoLLM('no llm key');
  const started = Date.now();
  let system = opts.system;
  if (opts.schema) system += `\n\nRespond ONLY with valid json matching this shape (no markdown, no prose):\n${JSON.stringify(opts.schema)}`;
  else if (opts.json) system += '\n\nRespond ONLY with a valid json object (no markdown, no prose).';
  const body: Record<string, unknown> = {
    model: 'deepseek-chat',
    messages: [{ role: 'system', content: system }, { role: 'user', content: opts.user }],
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 1200,
    stream: false,
  };
  if (opts.schema || opts.json) body.response_format = { type: 'json_object' };

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 30000),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
  const data = (await res.json()) as DeepSeekResponse;
  const text = data.choices?.[0]?.message?.content ?? '';
  const cleaned = text.replace(/```json|```/g, '').trim();
  const tokens = (data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0);
  return { output: JSON.parse(cleaned) as T, tokens, latency_ms: Date.now() - started };
}
