import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { s3Public, BUCKET } from "@/lib/s3";
import { POLICIES, guard } from "@/lib/ratelimit";
import { parseTags } from "@/lib/tags";

const MAX_BYTES = 2 * 1024 ** 3; // 2 GB
const ALLOWED = ["video/mp4", "video/quicktime", "video/webm"];
const uid = async () => ((await auth())?.user as any)?.id as string | undefined;

// Step 1: get a presigned URL; the browser uploads straight to storage.
export async function POST(req: Request) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const limited = await guard(POLICIES.upload, userId);
  if (limited) return limited;
  const { title, contentType, size, tags } = await req.json();
  if (!title || !ALLOWED.includes(contentType) || size > MAX_BYTES)
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });

  const video = await db.video.create({ data: { title, ownerId: userId, rawKey: "pending", tags: parseTags(tags) } });
  const rawKey = `raw/${video.id}`;
  await db.video.update({ where: { id: video.id }, data: { rawKey } });
  const url = await getSignedUrl(
    s3Public, new PutObjectCommand({ Bucket: BUCKET, Key: rawKey, ContentType: contentType }), { expiresIn: 900 }
  );
  return NextResponse.json({ id: video.id, url });
}

// Step 2: queue transcoding (owner only).
export async function PUT(req: Request) {
  const userId = await uid();
  const { id } = await req.json();
  const res = await db.video.updateMany({ where: { id, ownerId: userId ?? "" }, data: { status: "PROCESSING" } });
  return NextResponse.json({ queued: res.count === 1 }, { status: res.count ? 200 : 403 });
}
