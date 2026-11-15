import type { Prisma } from "@prisma/client";

export const AUDIT_ACTIONS = [
  "video_removed", "videos_removed_bulk", "video_restored", "report_dismissed",
  "user_suspended", "user_unsuspended", "role_changed", "appeal_granted", "appeal_upheld", "audit_exported",
] as const;

// Accepts only real calendar days written as YYYY-MM-DD (so 2026-02-31 is rejected), as UTC midnight.
export function parseDay(s?: string): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
}

// Shared by the audit page and the CSV export so both always show the same rows.
// `from` and `to` are whole UTC days and both are inclusive.
export function auditWhere(action?: string, q?: string, from?: string, to?: string): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (action && (AUDIT_ACTIONS as readonly string[]).includes(action)) where.action = action;
  const f = parseDay(from);
  const t = parseDay(to);
  if (f || t) where.createdAt = { ...(f ? { gte: f } : {}), ...(t ? { lt: new Date(t.getTime() + 86_400_000) } : {}) };
  if (q) {
    where.OR = [
      { actorEmail: { contains: q, mode: "insensitive" } },
      { targetId: { contains: q, mode: "insensitive" } },
      { detail: { contains: q, mode: "insensitive" } },
    ];
  }
  return where;
}

// Quotes a CSV cell. Cells starting with = + - @ would be run as formulas by Excel/Sheets, and the detail
// column holds text typed by users and moderators, so those get a leading apostrophe.
export function csvCell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
