// Run separately: npx tsx worker/transcode.ts  (needs ffmpeg on PATH)
import { createWriteStream } from "node:fs";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import { tmpdir } from "node:os";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { s3, BUCKET } from "../lib/s3";
import { sendReadyNotice, sendFailedNotice } from "../lib/notify";
import { transcodeToHls } from "./ffmpeg";

const db = new PrismaClient();

async function transcode(id: string, rawKey: string) {
  const dir = await mkdtemp(path.join(tmpdir(), "vid-"));
  try {
    const input = path.join(dir, "in");
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: rawKey }));
    await pipeline(obj.Body as Readable, createWriteStream(input)); // stream to disk: uploads can be up to 2 GB

    await transcodeToHls(input, dir);

    for (const f of await readdir(dir)) {
      if (f === "in") continue;
      const type = f.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : f.endsWith(".ts") ? "video/mp2t" : "image/jpeg";
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET, Key: `videos/${id}/${f}`, Body: await readFile(path.join(dir, f)), ContentType: type,
      }));
    }
    const res = await db.video.updateMany({
      where: { id, status: "PROCESSING" },
      data: { status: "READY", hlsPath: `videos/${id}/master.m3u8`, thumbPath: `videos/${id}/thumb.jpg` },
    });
    return res.count === 1; // false if the video was deleted while processing
  } finally {
    await rm(dir, { recursive: true, force: true }); // always clean up the temp folder
  }
}

// A failed email must never change a video's status, so errors are logged and swallowed.
async function notify(send: () => Promise<void>) {
  try { await send(); } catch (e) { console.error("notification failed", e); }
}

async function loop() {
  for (;;) {
    const job = await db.video.findFirst({
      where: { status: "PROCESSING" },
      orderBy: { createdAt: "asc" },
      include: { owner: { select: { email: true, uploadEmails: true } } },
    });
    if (!job) { await new Promise(r => setTimeout(r, 5000)); continue; }
    try {
      const done = await transcode(job.id, job.rawKey);
      if (done && job.owner.uploadEmails) await notify(() => sendReadyNotice(job.owner.email, job.title, job.id));
    } catch (e) {
      console.error(e);
      const res = await db.video.updateMany({ where: { id: job.id, status: "PROCESSING" }, data: { status: "FAILED" } });
      if (res.count === 1 && job.owner.uploadEmails) await notify(() => sendFailedNotice(job.owner.email, job.title));
    }
  }
}
loop();
