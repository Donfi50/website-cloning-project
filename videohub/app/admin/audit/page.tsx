import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import { AUDIT_ACTIONS, auditWhere, parseDay } from "@/lib/auditQuery";
import AdminNav from "@/components/AdminNav";

const PAGE_SIZE = 50;

export default async function Audit({ searchParams }: { searchParams: Promise<{ action?: string; q?: string; from?: string; to?: string; page?: string }> }) {
  const me = await currentUser();
  if (!me || me.role === "USER") notFound();
  const sp = await searchParams;
  const action = (AUDIT_ACTIONS as readonly string[]).includes(sp.action ?? "") ? sp.action : undefined;
  const q = sp.q?.trim() || undefined;

  const from = parseDay(sp.from) ? sp.from : undefined;
  const to = parseDay(sp.to) ? sp.to : undefined;

  const where = auditWhere(action, q, from, to);
  const total = await db.auditLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, parseInt(sp.page ?? "1", 10) || 1), totalPages);
  const rows = await db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });

  const href = (path: string, n?: number) => {
    const p = new URLSearchParams();
    if (action) p.set("action", action);
    if (q) p.set("q", q);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (n && n > 1) p.set("page", String(n));
    const s = p.toString();
    return s ? `${path}?${s}` : path;
  };
  const cell = { padding: "6px 10px", borderBottom: "1px solid #8884", textAlign: "left", verticalAlign: "top" } as const;
  const dim = { opacity: 0.4 } as const;

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <AdminNav />
      <h1>Audit log</h1>
      <form style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <select name="action" defaultValue={action ?? ""}>
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input name="q" defaultValue={q} placeholder="Search who, target ID or detail" style={{ flex: 1, minWidth: 200 }} />
        <input type="date" name="from" defaultValue={from} aria-label="From date (UTC)" title="From (UTC, inclusive)" />
        <input type="date" name="to" defaultValue={to} aria-label="To date (UTC)" title="To (UTC, inclusive)" />
        <button>Filter</button>
      </form>
      <p style={{ opacity: 0.8 }}>
        {total} entr{total === 1 ? "y" : "ies"} · <a href={href("/admin/audit/export")}>Download CSV</a> (up to 10,000 rows, same filters; downloads are logged)
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
          <thead>
            <tr><th style={cell}>When (UTC)</th><th style={cell}>Who</th><th style={cell}>Action</th><th style={cell}>Target</th><th style={cell}>Detail</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td style={cell}>{r.createdAt.toISOString().replace("T", " ").slice(0, 19)}</td>
                <td style={cell}>{r.actorEmail}</td>
                <td style={cell}>{r.action}</td>
                <td style={cell}>{r.targetType} {r.targetId}</td>
                <td style={cell}>{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p>No matching entries.</p>}
      {totalPages > 1 && (
        <nav style={{ display: "flex", gap: 16, justifyContent: "center", margin: "16px 0" }}>
          {page > 1 ? <Link href={href("/admin/audit", page - 1)}>← Newer</Link> : <span style={dim}>← Newer</span>}
          <span>Page {page} of {totalPages}</span>
          {page < totalPages ? <Link href={href("/admin/audit", page + 1)}>Older →</Link> : <span style={dim}>Older →</span>}
        </nav>
      )}
    </main>
  );
}
