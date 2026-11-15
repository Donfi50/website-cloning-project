// Normalizes user-entered tags: lowercase, letters/numbers/hyphens, max 30 chars, max 8 unique.
export function parseTags(input: unknown): string[] {
  const raw = Array.isArray(input) ? input : String(input ?? "").split(",");
  const out = new Set<string>();
  for (const t of raw) {
    const tag = String(t).toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").replace(/^-+|-+$/g, "").slice(0, 30);
    if (tag) out.add(tag);
    if (out.size === 8) break;
  }
  return [...out];
}
