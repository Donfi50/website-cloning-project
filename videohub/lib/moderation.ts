import { db } from "./db";
import { sendRemovalNotice, sendSuspensionNotice, sendBulkRemovalNotice, sendRestoredNotice, sendAppealDecision } from "./notify";
import { logAction } from "./audit";

type Actor = { id: string; email: string; role: string };
const ROLES = ["USER", "MODERATOR", "ADMIN"];

// Removes a video as a moderator: hides it, records and emails the reason, and closes its reports.
// Files are kept in storage as evidence (only owner deletes and account deletions purge them).
export async function removeVideoAsMod(actor: Actor, videoId: string, reason: string) {
  const existing = await db.video.findUnique({ where: { id: videoId }, include: { owner: { select: { email: true } } } });
  if (existing && existing.status !== "REMOVED") {
    await db.video.update({ where: { id: videoId }, data: { status: "REMOVED", removedReason: reason, removedAt: new Date() } });
    await logAction(actor, "video_removed", "video", videoId, reason);
    try { await sendRemovalNotice(existing.owner.email, existing.title, reason); }
    catch (e) { console.error("removal notice failed", videoId, e); }
  }
  await db.report.updateMany({ where: { videoId }, data: { resolved: true } });
}

export async function dismissReport(actor: Actor, reportId: string) {
  await db.report.update({ where: { id: reportId }, data: { resolved: true } });
  await logAction(actor, "report_dismissed", "report", reportId);
}

// reason = text to suspend, null to lift the suspension. Returns an error message, or null on success.
export async function setSuspension(actor: Actor, targetId: string, reason: string | null) {
  const target = await db.user.findUnique({ where: { id: targetId } });
  if (!target) return "User not found";
  if (target.id === actor.id) return "You can't suspend yourself";
  if (target.role !== "USER" && actor.role !== "ADMIN") return "Only admins can suspend moderators and admins";

  if (reason) {
    await db.user.update({ where: { id: targetId }, data: { suspendedAt: new Date(), suspendedReason: reason } });
    await logAction(actor, "user_suspended", "user", targetId, reason);
    try { await sendSuspensionNotice(target.email, reason); }
    catch (e) { console.error("suspension notice failed", targetId, e); }
  } else {
    await db.user.update({ where: { id: targetId }, data: { suspendedAt: null, suspendedReason: null } });
    await logAction(actor, "user_unsuspended", "user", targetId);
  }
  return null;
}

// Admin-only. Nobody can change their own role, so the last admin can never demote themselves.
export async function setRole(actor: Actor, targetId: string, role: string) {
  if (actor.role !== "ADMIN") return "Only admins can change roles";
  if (!ROLES.includes(role)) return "Invalid role";
  const target = await db.user.findUnique({ where: { id: targetId } });
  if (!target) return "User not found";
  if (target.id === actor.id) return "You can't change your own role";
  if (target.role === role) return null;
  await db.user.update({ where: { id: targetId }, data: { role: role as "USER" | "MODERATOR" | "ADMIN" } });
  await logAction(actor, "role_changed", "user", targetId, `${target.role} -> ${role}`);
  return null;
}

// Removes every live video of one user in one step (for abusive uploaders): one audit entry and one email
// instead of one per video. Files stay in storage as evidence, like any moderator removal.
export async function removeAllVideosAsMod(actor: Actor, targetId: string, reason: string): Promise<{ error: string | null; count: number }> {
  const target = await db.user.findUnique({ where: { id: targetId } });
  if (!target) return { error: "User not found", count: 0 };
  if (target.id === actor.id) return { error: "You can't use this on your own videos", count: 0 };
  if (target.role !== "USER" && actor.role !== "ADMIN") return { error: "Only admins can act on moderators and admins", count: 0 };

  const ids = (await db.video.findMany({ where: { ownerId: targetId, status: { not: "REMOVED" } }, select: { id: true } })).map(v => v.id);
  if (!ids.length) return { error: null, count: 0 };
  await db.video.updateMany({ where: { id: { in: ids } }, data: { status: "REMOVED", removedReason: reason, removedAt: new Date() } });
  await db.report.updateMany({ where: { videoId: { in: ids } }, data: { resolved: true } });
  await logAction(actor, "videos_removed_bulk", "user", targetId, `${ids.length} videos: ${reason}`);
  try { await sendBulkRemovalNotice(target.email, ids.length, reason); }
  catch (e) { console.error("bulk removal notice failed", targetId, e); }
  return { error: null, count: ids.length };
}

// Undoes a moderator removal (for example after a successful appeal). Only videos a moderator removed and that were
// published once can come back: owner-deleted videos have had their files purged, and never-published ones have none.
export async function restoreVideoAsMod(actor: Actor, videoId: string, opts: { notify?: boolean } = {}): Promise<string | null> {
  const v = await db.video.findUnique({ where: { id: videoId }, include: { owner: { select: { email: true } } } });
  if (!v) return "Video not found";
  if (v.status !== "REMOVED") return "That video isn't removed";
  if (!v.removedAt || !v.hlsPath) return "This video can't be restored (it was deleted by its owner or never published)";
  await db.video.update({ where: { id: videoId }, data: { status: "READY", removedReason: null, removedAt: null } });
  await logAction(actor, "video_restored", "video", videoId, v.removedReason ? `was removed for: ${v.removedReason}` : undefined);
  if (opts.notify !== false) {
    try { await sendRestoredNotice(v.owner.email, v.title, videoId); }
    catch (e) { console.error("restore notice failed", videoId, e); }
  }
  return null;
}

// Decides an open appeal. GRANTED restores the video; UPHELD keeps it removed and needs a note for the uploader.
// A non-admin moderator can't decide an appeal against a removal they made themselves (single-video removals only).
export async function decideAppeal(actor: Actor, appealId: string, decision: "GRANTED" | "UPHELD", note: string): Promise<string | null> {
  note = note.trim().slice(0, 1000);
  if (decision === "UPHELD" && !note) return "A note explaining the decision is required";
  const appeal = await db.appeal.findUnique({
    where: { id: appealId },
    include: { user: { select: { email: true } }, video: { select: { title: true } } },
  });
  if (!appeal) return "Appeal not found";
  if (appeal.status !== "OPEN") return "This appeal has already been decided";
  if (actor.role !== "ADMIN") {
    const removal = await db.auditLog.findFirst({ where: { action: "video_removed", targetId: appeal.videoId }, orderBy: { createdAt: "desc" } });
    if (removal?.actorId === actor.id) return "You removed this video, so another moderator needs to review the appeal";
  }

  // Claim the appeal first so two moderators can't decide it at once.
  const claim = await db.appeal.updateMany({
    where: { id: appealId, status: "OPEN" },
    data: { status: decision, decisionNote: note || null, decidedBy: actor.email, decidedAt: new Date() },
  });
  if (claim.count !== 1) return "This appeal has already been decided";

  if (decision === "GRANTED") {
    const err = await restoreVideoAsMod(actor, appeal.videoId, { notify: false });
    if (err) { // couldn't restore (e.g. never published): put the appeal back in the queue
      await db.appeal.updateMany({ where: { id: appealId }, data: { status: "OPEN", decisionNote: null, decidedBy: null, decidedAt: null } });
      return err;
    }
  }
  await logAction(actor, decision === "GRANTED" ? "appeal_granted" : "appeal_upheld", "video", appeal.videoId, note || undefined);
  try { await sendAppealDecision(appeal.user.email, appeal.video.title, decision === "GRANTED", note, appeal.videoId); }
  catch (e) { console.error("appeal decision notice failed", appealId, e); }
  return null;
}
