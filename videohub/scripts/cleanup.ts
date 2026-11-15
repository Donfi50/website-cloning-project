// Housekeeping job. Dry run by default; add --apply to actually delete.
//   npx tsx --env-file=.env scripts/cleanup.ts            (report only)
//   npx tsx --env-file=.env scripts/cleanup.ts --apply    (delete)
// Schedule the --apply run daily, e.g. cron: 0 3 * * *
import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { s3, BUCKET } from "../lib/s3";

const APPLY = process.argv.includes("--apply");
const GRACE_MS = 6 * 3600_000;         // never touch files newer than this (in-flight uploads and transcodes)
const STALE_UPLOAD_MS = 24 * 3600_000; // uploads that never finished after this long are discarded
const db = new PrismaClient();

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const videoIdOf = (key: string) => key.match(/^(?:raw|videos)\/([^/]+)/)?.[1] ?? null;

async function listAll(prefix: string) {
  const out: { Key: string; Size: number; LastModified?: Date }[] = [];
  let token: string | undefined;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token }));
    for (const o of r.Contents ?? []) out.push({ Key: o.Key!, Size: o.Size ?? 0, LastModified: o.LastModified });
    token = r.NextContinuationToken;
  } while (token);
  return out;
}

async function deleteKeys(keys: string[]) {
  for (const part of chunk(keys, 1000))
    await s3.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: part.map(Key => ({ Key })) } }));
}

async function main() {
  console.log(APPLY ? "APPLY mode: deleting" : "Dry run (add --apply to delete)");
  const now = Date.now();

  // 1. Orphaned files: no database row, or deleted by their owner but never purged.
  //    Files of videos a moderator removed, or that have any report, are kept as evidence.
  const objects = [...(await listAll("raw/")), ...(await listAll("videos/"))];
  const ids = [...new Set(objects.map(o => videoIdOf(o.Key)).filter((x): x is string => !!x))];
  const rows = new Map<string, { status: string; removedAt: Date | null; hlsPath: string | null }>();
  const reported = new Set<string>();
  for (const part of chunk(ids, 1000)) {
    for (const v of await db.video.findMany({ where: { id: { in: part } }, select: { id: true, status: true, removedAt: true, hlsPath: true } }))
      rows.set(v.id, v);
    for (const r of await db.report.findMany({ where: { videoId: { in: part } }, select: { videoId: true }, distinct: ["videoId"] }))
      reported.add(r.videoId);
  }
  const orphans = objects.filter(o => {
    if (!o.LastModified || now - o.LastModified.getTime() < GRACE_MS) return false;
    const id = videoIdOf(o.Key);
    if (!id) return false;
    const row = rows.get(id);
    if (!row) return true;
    return row.status === "REMOVED" && !row.removedAt && !row.hlsPath && !reported.has(id);
  });
  const mb = (orphans.reduce((s, o) => s + o.Size, 0) / 1024 / 1024).toFixed(1);
  console.log(`Orphaned files: ${orphans.length} (${mb} MB)`);

  // 2. Uploads that never finished.
  const stale = await db.video.findMany({
    where: { status: "UPLOADING", createdAt: { lt: new Date(now - STALE_UPLOAD_MS) } },
    select: { id: true },
  });
  console.log(`Stale unfinished uploads: ${stale.length}`);

  // 3. Expired email tokens.
  const expired = await db.emailToken.count({ where: { expiresAt: { lt: new Date() } } });
  console.log(`Expired email tokens: ${expired}`);

  if (!APPLY) return;
  await deleteKeys(orphans.map(o => o.Key));
  if (stale.length) {
    const sids = stale.map(v => v.id);
    await deleteKeys(sids.map(id => `raw/${id}`));
    await db.$transaction([
      db.report.deleteMany({ where: { videoId: { in: sids } } }),
      db.comment.deleteMany({ where: { videoId: { in: sids } } }),
      db.video.deleteMany({ where: { id: { in: sids } } }),
    ]);
  }
  await db.emailToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  console.log("Done.");
}

main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
