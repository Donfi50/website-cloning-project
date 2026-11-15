import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const POLICIES = {
  register: { name: "register", limit: 5, windowSec: 3600 },
  login:    { name: "login",    limit: 10, windowSec: 900 },
  resend:   { name: "resend",   limit: 3, windowSec: 3600 },
  verify:   { name: "verify",   limit: 20, windowSec: 3600 },
  forgot:   { name: "forgot",   limit: 3, windowSec: 3600 },
  reset:    { name: "reset",    limit: 10, windowSec: 3600 },
  comment:  { name: "comment",  limit: 10, windowSec: 60 },
  report:   { name: "report",   limit: 5, windowSec: 3600 },
  upload:   { name: "upload",   limit: 10, windowSec: 3600 },
  view:     { name: "view",     limit: 30, windowSec: 60 },
  like:     { name: "like",     limit: 30, windowSec: 60 },
  viewOnce: { name: "viewOnce", limit: 1, windowSec: 86400 }, // one counted view per viewer per video per day
  edit:     { name: "edit",     limit: 20, windowSec: 3600 },
  playlist: { name: "playlist", limit: 60, windowSec: 3600 },
  account:  { name: "account",  limit: 5, windowSec: 3600 },
  appeal:   { name: "appeal",   limit: 5, windowSec: 86400 },
} as const;
export type Policy = (typeof POLICIES)[keyof typeof POLICIES];

// Production: Upstash Redis (shared across serverless instances).
// Dev / single server: in-memory fallback (per-process only).
const redis = process.env.UPSTASH_REDIS_REST_URL ? Redis.fromEnv() : null;
const upstash = new Map<string, Ratelimit>();
const mem = new Map<string, number[]>();

export async function limit(p: Policy, key: string): Promise<{ ok: boolean; retryAfter: number }> {
  if (redis) {
    let rl = upstash.get(p.name);
    if (!rl) {
      rl = new Ratelimit({ redis, prefix: `rl:${p.name}`, limiter: Ratelimit.slidingWindow(p.limit, `${p.windowSec} s`) });
      upstash.set(p.name, rl);
    }
    const r = await rl.limit(key);
    return { ok: r.success, retryAfter: Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)) };
  }
  const now = Date.now();
  const k = `${p.name}:${key}`;
  const hits = (mem.get(k) ?? []).filter(t => now - t < p.windowSec * 1000);
  if (hits.length >= p.limit) {
    mem.set(k, hits);
    return { ok: false, retryAfter: Math.ceil((hits[0] + p.windowSec * 1000 - now) / 1000) };
  }
  hits.push(now);
  mem.set(k, hits);
  if (mem.size > 10000) for (const [mk, v] of mem) if (now - v[v.length - 1] > 86_400_000) mem.delete(mk);
  return { ok: true, retryAfter: 0 };
}

// Only trust x-forwarded-for behind your own proxy/host (e.g. Vercel, nginx), which sets it.
export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

// Returns a 429 response when over the limit, otherwise null.
export async function guard(p: Policy, key: string) {
  const r = await limit(p, key);
  if (r.ok) return null;
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(r.retryAfter) } }
  );
}
