// One adapter runs any manifest: build the user message, call the LLM, validate
// against the schema, one repair retry, else return null (caller falls back).

import type { DealRecord, ExtractorOutput, SniperOutput } from '@dealroom/contracts';
import { ExtractorOutput as ExtractorSchema, SniperOutput as SniperSchema } from '@dealroom/contracts';
import { chatJson, NoLLM } from '../lib/llm';
import type { AgentManifest } from './manifest';

export interface AgentRunResult<T> { output: T; tokens: number; latency_ms: number; valid: boolean }

export async function runManifest<T>(
  key: string | undefined,
  manifest: AgentManifest,
  record: DealRecord,
): Promise<AgentRunResult<T> | null> {
  if (!key) return null;
  const user = manifest.user(record);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await chatJson<unknown>(key, { system: manifest.system, user, schema: manifest.shape, json: true, maxTokens: manifest.maxTokens });
      const parsed = manifest.schema.safeParse(res.output);
      if (parsed.success) return { output: parsed.data as T, tokens: res.tokens, latency_ms: res.latency_ms, valid: true };
      console.error('[agent]', manifest.id, 'schema mismatch', JSON.stringify(res.output).slice(0, 240));
    } catch (e) {
      if (e instanceof NoLLM) return null;
      console.error('[agent]', manifest.id, e instanceof Error ? e.message : String(e));
      // else retry once
    }
  }
  return null;
}

// ── Extractor: unstructured text → structured facts (never a stall id) ────────
export async function extract(key: string | undefined, text: string): Promise<ExtractorOutput | null> {
  if (!key) return null;
  try {
    const res = await chatJson<unknown>(key, {
      system: `Extract structured facts from B2B sales notes or a call transcript. Use ONLY what is stated — never invent.
Return: meddic_updates (field/value/status filled|thin|empty), stakeholders (name, title?, email?, role_hint?, sentiment?), commitments (who/what/by?), competitor_mentions (competitor/excerpt), pricing_signals (signal/excerpt).`,
      user: text,
      json: true,
      schema: {
        meddic_updates: [{ field: 'champion', value: 'short grounded phrase', status: 'filled' }],
        stakeholders: [{ name: 'Full Name', title: 'Role', email: '', role_hint: 'champion|economic_buyer|influencer|blocker|user|procurement|legal|security', sentiment: 'positive' }],
        commitments: [{ who: 'Name', what: 'commitment', by: 'date or empty' }],
        competitor_mentions: [{ competitor: 'Name', excerpt: 'quote' }],
        pricing_signals: [{ signal: 'what was said', excerpt: 'quote' }],
      },
      maxTokens: 900,
    });
    const parsed = ExtractorSchema.safeParse(res.output);
    if (!parsed.success) console.error('[agent] extractor schema mismatch', JSON.stringify(res.output).slice(0, 240));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// ── Sniper: draft the email (and asset) for a play step ──────────────────────
export async function draft(
  key: string | undefined,
  args: { account: string; deal: string; stage: string; intent: string; recipient?: string; wantAsset?: boolean },
): Promise<SniperOutput | null> {
  if (!key) return null;
  try {
    const res = await chatJson<unknown>(key, {
      system: `You write short, specific B2B sales emails a rep would actually send, grounded in the deal facts and the step's intent.
Rules:
- Never use internal jargon or abbreviations in the email (no "EB", "MAP", "MEDDIC"). Refer to people by name, or by role ("your COO", "your finance lead").
- No urgency manufacturing, no false familiarity. The customer is the hero; be specific.
- Reference the concrete pain, stage, or next step from the facts. No generic filler.
- Subject under 60 characters. Body 90-140 words, plain text, no markdown.
If an asset is requested, also return it (type + content) as a plain-text one-pager.`,
      user: `Account: ${args.account}\nDeal: ${args.deal}\nStage: ${args.stage}\nRecipient: ${args.recipient ?? 'the buyer contact'}\nStep intent: ${args.intent}\n${args.wantAsset ? 'Also produce the requested asset.' : 'Email only.'}`,
      json: true,
      schema: {
        email: { subject: 'under 60 characters', body: 'plain text, 90-140 words' },
        asset: { type: 'exec_summary | business_case | pitch | memo', content: 'plain text one-pager' },
      },
      maxTokens: 900,
      temperature: 0.5,
    });
    const parsed = SniperSchema.safeParse(res.output);
    if (!parsed.success) console.error('[agent] sniper schema mismatch', JSON.stringify(res.output).slice(0, 240));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
