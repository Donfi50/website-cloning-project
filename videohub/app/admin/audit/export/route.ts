import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/authz";
import { logAction } from "@/lib/audit";
import { auditWhere, csvCell } from "@/lib/auditQuery";

const MAX_ROWS = 10000;

// Downloads the audit log (with the same filters as the page) as CSV. Moderators and admins only.
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || user.role === "USER") return new NextResponse("Not found", { status: 404 });

  const sp = new URL(req.url).searchParams;
  const action = sp.get("action") ?? undefined;
  const q = sp.get("q") ?? undefined;
  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;
  const rows = await db.auditLog.findMany({ where: auditWhere(action, q, from, to), orderBy: { createdAt: "desc" }, take: MAX_ROWS });
  await logAction(user, "audit_exported", "audit", "-", `${rows.length} rows; action=${action ?? "all"}; search=${q ?? ""}; from=${from ?? ""}; to=${to ?? ""}`);

  const lines = [
    ["When (UTC)", "Actor", "Action", "Target type", "Target ID", "Detail"].map(csvCell).join(","),
    ...rows.map(r => [r.createdAt.toISOString(), r.actorEmail, r.action, r.targetType, r.targetId, r.detail].map(csvCell).join(",")),
  ];
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="audit-log.csv"',
      "Cache-Control": "no-store",
    },
  });
}
