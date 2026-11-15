import { db } from "./db";

// Records who did what (actions are listed in lib/auditQuery.ts). A failure to log is reported but never blocks the moderation action itself.
export async function logAction(
  actor: { id: string; email: string },
  action: string,
  targetType: string,
  targetId: string,
  detail?: string
) {
  try {
    await db.auditLog.create({
      data: { actorId: actor.id, actorEmail: actor.email, action, targetType, targetId, detail: detail?.slice(0, 500) },
    });
  } catch (e) {
    console.error("audit log failed", action, targetId, e);
  }
}
